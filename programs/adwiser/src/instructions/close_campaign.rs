use crate::state::campaign;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(
        mut,
        close = adwiser,
    )]
    pub campaign_acc: Box<Account<'info, campaign>>,

    /// CHECK: We're only using this as a target for transfer
    #[account(mut)]
    pub adwiser: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CloseCampaign<'info> {
    pub fn close_campaign_fn(ctx: Context<CloseCampaign>) -> Result<()> {
        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CloseTreasury<'info> {
    #[account(
        mut,
        seeds = [b"treasury", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    /// CHECK: We're only using this as a target for transfer
    #[account(mut)]
    pub advertiser: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CloseTreasury<'info> {

    pub fn close_treasury_fn(ctx: Context<CloseTreasury>, campaignid: u64) -> Result<()> {
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let campaign_id_bytes = campaignid.to_le_bytes();
        let seeds = &[
            b"treasury",
            campaign_id_bytes.as_ref(),
            &[ctx.bumps.treasury],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury.to_account_info(),
            to: ctx.accounts.advertiser.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        system_program::transfer(cpi_ctx, ctx.accounts.treasury.lamports())?;

        Ok(())
    }
}
