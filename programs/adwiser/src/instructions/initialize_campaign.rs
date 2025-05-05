use anchor_lang::prelude::*;
use crate::state::campaign;
use crate::state::Escrow;
use anchor_lang::system_program::{self, Transfer};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct InitializeCampaign<'info> {
    #[account(
        init_if_needed,
        payer = adwiser,
        space = 8 + campaign::INIT_SPACE,
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

    #[account(mut)]
    pub adwiser: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeCampaign<'info> {
    pub fn init_campaign(
        &mut self,
        campaign_id: u64,
        campaign_name: String,
        adwiser_pubkey: Pubkey,
        cost_per_click: u64,
        ad_duration_days: u64,
        publishers: Vec<Pubkey>,
        locked_sol: u64,
    ) -> Result<()> {
        // Initialize campaign account data
        self.campaign_acc.set_inner(campaign {
            campaign_id,
            campaign_name,
            adwiser_pubkey,
            cost_per_click,
            ad_duration_days,
            publishers,
            locked_sol,
            remaining_sol: locked_sol,
            created_at: Clock::get()?.unix_timestamp,
        });
        
        msg!("Campaign account created");
        msg!("Campaign account: {:?}", self.campaign_acc.key());
        msg!("Treasury account: {:?}", self.treasury.key());
        
        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.adwiser.to_account_info(),
            to: self.treasury.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        system_program::transfer(cpi_ctx, locked_sol)?;

        msg!("Transferred {} SOL to campaign treasury", locked_sol);
        Ok(())
    }
}