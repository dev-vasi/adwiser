use anchor_lang::prelude::*;
mod instructions;
mod state;


use crate::instructions::initialize_campaign::*;
use crate::instructions::pay_publisher::*;
declare_id!("HBUba6LqBPZSh2QNGwVDFxVq1vaj9Sav9vhVoAt1Ti6w");

#[program]
pub mod adwiser {
    use super::*;

    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        campaign_id: u64,
        campaign_name: String,
        advertiser_pubkey: Pubkey,
        cost_per_click: u64,
        ad_duration_days: u64,
        publishers: Vec<Pubkey>,
        locked_sol: u64,
    ) -> Result<()> {
        ctx.accounts.init_campaign(
            campaign_id,
            campaign_name,
            advertiser_pubkey,
            cost_per_click,
            ad_duration_days,
            publishers,
            locked_sol,
        )?;
        Ok(())
    }

    pub fn pay_publisher(
        ctx: Context<PayPublisher>,
        campaign_id: u64,
        amount: u64,
    ) -> Result<()> {
        pay_publisher(ctx, campaign_id, amount)
    }
}