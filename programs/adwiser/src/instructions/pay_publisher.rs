#![allow(unexpected_cfgs)]
use crate::state::Campaign;
use crate::errors::AdwiserError;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct PayPublisher<'info> {
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
    pub publisher: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

impl<'info> PayPublisher<'info> {
    pub fn pay_publisher_fn(ctx: Context<PayPublisher>, no_of_clicks: u64) -> Result<()> {
        let amount = ctx.accounts.campaign_acc.cost_per_click * no_of_clicks;
        require!(amount > 0, AdwiserError::InvalidAmount);
        require!(ctx.accounts.campaign_acc.remaining_sol >= amount, AdwiserError::InsufficientFunds);
        require!(
            ctx.accounts.campaign_acc.publishers.contains(&ctx.accounts.publisher.key()),
            AdwiserError::UnauthorizedPublisher
        );
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_accounts =  Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.publisher.to_account_info(),
        };
        let campaign_id_bytes = ctx.accounts.campaign_acc.campaign_id.to_le_bytes();
        let seeds = &[
            b"escrow",
            campaign_id_bytes.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer_seeds = &[&seeds[..]];
        msg!("Escrow account: {:?}", ctx.accounts.escrow.key());
        msg!("Publisher account: {:?}", ctx.accounts.publisher.key());
        msg!("Amount to transfer: {:?}", amount);
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        system_program::transfer(cpi_ctx, amount)?;
        ctx.accounts.campaign_acc.no_of_txns += 1;
        ctx.accounts.campaign_acc.total_clicks += no_of_clicks;
        ctx.accounts.campaign_acc.commission_clicks += no_of_clicks;
        ctx.accounts.campaign_acc.remaining_sol = ctx.accounts.escrow.lamports();
        msg!("Remaining SOL in escrow account: {:?}", ctx.accounts.campaign_acc.remaining_sol);
        msg!("Pay Publisher Txn successful");
        Ok(())
    }
}