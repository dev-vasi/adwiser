#![allow(unexpected_cfgs)]
use crate::state::Campaign;
use crate::errors::AdwiserError;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(
        mut,
        close = adwiser,
    )]
    pub campaign_acc: Box<Account<'info, Campaign>>,

    /// CHECK: We're only using this as a target for transfer
    #[account(mut)]
    pub adwiser: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CloseCampaign<'info> {
    pub fn close_campaign_fn(_ctx: Context<CloseCampaign>) -> Result<()> {
        msg!("Closed campaign account: {:?}", _ctx.accounts.campaign_acc.key());
        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CloseEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub escrow: SystemAccount<'info>,

    /// CHECK: We're only using this as a target for transfer
    #[account(mut)]
    pub advertiser: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CloseEscrow<'info> {

    pub fn close_escrow_fn(ctx: Context<CloseEscrow>, campaignid: u64) -> Result<()> {
        let escrow_balance = ctx.accounts.escrow.lamports();
        require!(escrow_balance > 0, AdwiserError::NothingToWithdraw);
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let campaign_id_bytes = campaignid.to_le_bytes();
        let seeds = &[
            b"escrow",
            campaign_id_bytes.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.advertiser.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        system_program::transfer(cpi_ctx, ctx.accounts.escrow.lamports())?;
        msg!("Closed escrow account: {:?}", ctx.accounts.escrow.key());

        Ok(())
    }
}
