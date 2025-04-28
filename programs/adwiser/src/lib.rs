use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::campaign::*;


declare_id!("6587iiArEump7YzmmLzoigXUCmT33yJUFpyV3NzGUgNo");

#[program]
pub mod adwiser {
    use super::*;

    pub fn create_ad_campaign(
        ctx: Context<CreateAdCampaign>,
        campaign_name: String,
        campaign_id: u64,
        cost_per_click: u64,
        ad_duration_days: u64,
        publishers: Vec<Pubkey>,
        locked_sol: u64,
    ) -> Result<()> {
        create_ad_campaign_logic(ctx, campaign_name, campaign_id, cost_per_click, ad_duration_days, publishers, locked_sol)
    }
}