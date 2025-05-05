use crate::state::campaign;
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
    pub campaign_acc: Box<Account<'info, campaign>>,
    
    #[account(
        mut,
        seeds = [b"treasury", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,
    
    /// CHECK: We're only using this as a target for transfer
    #[account(mut)]
    pub publisher: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

impl<'info> PayPublisher<'info> {
    pub fn pay_publisher_fn(ctx: Context<PayPublisher>, amount: u64) -> Result<()> {
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_accounts =  Transfer {
            from: ctx.accounts.treasury.to_account_info(),
            to: ctx.accounts.publisher.to_account_info(),
        };
        let campaign_id_bytes = ctx.accounts.campaign_acc.campaign_id.to_le_bytes();
        let seeds = &[
            b"treasury",
            campaign_id_bytes.as_ref(),
            &[ctx.bumps.treasury],
        ];
        let signer_seeds = &[&seeds[..]];
        msg!("Treasury account: {:?}", ctx.accounts.treasury.key());
        msg!("Publisher account: {:?}", ctx.accounts.publisher.key());
        msg!("Amount to transfer: {:?}", amount);
        msg!("Signer seeds: {:?}", signer_seeds);
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        system_program::transfer(cpi_ctx, amount);
        ctx.accounts.campaign_acc.remaining_sol -= amount;
        msg!("Remaining SOL in campaign account: {:?}", ctx.accounts.campaign_acc.remaining_sol);
        msg!("Transfer successful");
        Ok(())
    }
}