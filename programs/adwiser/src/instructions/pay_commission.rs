#![allow(unexpected_cfgs)]
use crate::state::Campaign;
use crate::errors::AdwiserError;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct PayCommission<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub campaign_acc: Box<Account<'info, Campaign>>,
    
    #[account(
        mut,
        seeds = [b"escrow", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub escrow: SystemAccount<'info>,
    
    /// CHECK: We're only using this as a target for transfer
    #[account(mut)]
    pub adwiser: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

impl<'info> PayCommission<'info> {
    pub fn pay_commission_fn(ctx: Context<PayCommission>, percentage: u64) -> Result<()> {
        require!(ctx.accounts.campaign_acc.commission_clicks > 0, AdwiserError::NoClicksForCommission);
        let mut amount = ctx.accounts.campaign_acc.cost_per_click * ctx.accounts.campaign_acc.commission_clicks * (percentage / 100);
        amount += ctx.accounts.campaign_acc.no_of_txns * 5000;
        require!(amount > 0, AdwiserError::InvalidAmount);
        require!(ctx.accounts.campaign_acc.remaining_sol >= amount, AdwiserError::InsufficientFunds);
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_accounts =  Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.adwiser.to_account_info(),
        };
        let campaign_id_bytes = ctx.accounts.campaign_acc.campaign_id.to_le_bytes();
        let seeds = &[
            b"escrow",
            campaign_id_bytes.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer_seeds = &[&seeds[..]];
        msg!("Escrow account: {:?}", ctx.accounts.escrow.key());
        msg!("Publisher account: {:?}", ctx.accounts.adwiser.key());
        msg!("Amount to transfer: {:?}", amount);
        msg!("Signer seeds: {:?}", signer_seeds);
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        system_program::transfer(cpi_ctx, amount)?;
        
        ctx.accounts.campaign_acc.remaining_sol = ctx.accounts.escrow.lamports();
        ctx.accounts.campaign_acc.no_of_txns = 0;
        ctx.accounts.campaign_acc.commission_clicks = 0;

        msg!("Remaining SOL in campaign account: {:?}", ctx.accounts.campaign_acc.remaining_sol);
        msg!("Transfer successful");
        Ok(())
    }
}