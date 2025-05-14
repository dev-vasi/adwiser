#![allow(unexpected_cfgs)]
use crate::errors::AdwiserError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct UpdateCampaign<'info> {
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

    #[account(mut)]
    pub adwiser: Signer<'info>,

    pub system_program: Program<'info, System>,
}
impl<'info> UpdateCampaign<'info> {
    pub fn update_campaign(
        ctx: Context<UpdateCampaign>,
        ad_duration_days: u64,
        locked_sol: u64,
    ) -> Result<()> {
        require!(
            locked_sol > 0 || ad_duration_days > 0,
            AdwiserError::InvalidUpdate
        );

        msg!(
            "Ad Duration Days Before: {:?}",
            ctx.accounts.campaign_acc.ad_duration_days
        );
        msg!(
            "Locked SOL Before: {:?}",
            ctx.accounts.campaign_acc.locked_sol
        );
        msg!(
            "Remaining SOL Before: {:?}",
            ctx.accounts.campaign_acc.remaining_sol
        );

        // Update campaign account data
        ctx.accounts.campaign_acc.ad_duration_days += ad_duration_days;
        ctx.accounts.campaign_acc.locked_sol += locked_sol;
        ctx.accounts.campaign_acc.remaining_sol += locked_sol;

        if ctx.accounts.campaign_acc.locked_sol > 0 {
            let cpi_program = ctx.accounts.system_program.to_account_info();
            let cpi_accounts = Transfer {
                from: ctx.accounts.adwiser.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            };
            let campaign_id_bytes = ctx.accounts.campaign_acc.campaign_id.to_le_bytes();
            let seeds = &[b"escrow", campaign_id_bytes.as_ref(), &[ctx.bumps.escrow]];
            let signer_seeds = &[&seeds[..]];
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            system_program::transfer(cpi_ctx, locked_sol)?;
            msg!("Transferred {} SOL to campaign escrow", locked_sol);
        }

        msg!(
            "Ad Duration Days Before: {:?}",
            ctx.accounts.campaign_acc.ad_duration_days
        );
        msg!(
            "Locked SOL Before: {:?}",
            ctx.accounts.campaign_acc.locked_sol
        );
        msg!(
            "Remaining SOL Before: {:?}",
            ctx.accounts.campaign_acc.remaining_sol
        );

        msg!("Campaign account updated");
        Ok(())
    }
}
