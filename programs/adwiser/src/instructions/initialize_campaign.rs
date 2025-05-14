#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use crate::state::Campaign;
use crate::errors::AdwiserError;
use anchor_lang::system_program::{self, Transfer};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct InitializeCampaign<'info> {
    #[account(
        init_if_needed,
        payer = adwiser,
        space = 8 + Campaign::INIT_SPACE,
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

impl<'info> InitializeCampaign<'info> {
    pub fn init_campaign(
        &mut self,
        campaign_id: u64,
        campaign_name: String,
        advertiser_pubkey: Pubkey,
        cost_per_click: u64,
        ad_duration_days: u64,
        publishers: Vec<Pubkey>,
        locked_sol: u64,
    ) -> Result<()> {
        require!(locked_sol > 0, AdwiserError::InvalidAmount);
        require!(!campaign_name.is_empty(), AdwiserError::InvalidName);
        require!(publishers.len() > 0, AdwiserError::NoPublishers);
        // Initialize campaign account data
        self.campaign_acc.set_inner(Campaign {
            campaign_id,
            campaign_name,
            advertiser_pubkey,
            cost_per_click,
            ad_duration_days,
            publishers,
            locked_sol,
            remaining_sol: locked_sol,
            total_clicks: 0,
            commission_clicks: 0,
            no_of_txns: 0,
            created_at: Clock::get()?.unix_timestamp,
        });
        
        msg!("Campaign account created");
        msg!("Campaign account: {:?}", self.campaign_acc.key());
        msg!("Escrow account: {:?}", self.escrow.key());
        
        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.adwiser.to_account_info(),
            to: self.escrow.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        system_program::transfer(cpi_ctx, locked_sol)?;

        msg!("Transferred {} SOL to campaign escrow", locked_sol);
        Ok(())
    }
}