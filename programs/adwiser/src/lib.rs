use anchor_lang::prelude::*;
mod instructions;
mod state;


use instructions::*;
use state::*;
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
        _campaign_id: u64,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.campaign_acc.campaign_id = _campaign_id;
        pay_publisher::PayPublisher::<'_>::pay_publisher_fn(ctx, amount)?;
        Ok(())
    }

    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        CloseCampaign::close_campaign_fn(ctx)
    }

    pub fn close_treasury(ctx: Context<CloseTreasury>, campaign_id: u64) -> Result<()> {
        CloseTreasury::close_treasury_fn(ctx, campaign_id)
    }
}