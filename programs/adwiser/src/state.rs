use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct AdCampaign {
    pub advertiser_pubkey: Pubkey,
    #[max_len(50)]
    pub campaign_name: String,
    pub campaign_id: u64,
    pub cost_per_click: u64,
    pub ad_duration_days: u64,
    #[max_len(50)]
    pub publishers: Vec<Pubkey>,
    pub locked_sol: u64,
    pub remaining_sol: u64,
    pub created_at: i64,
}

impl AdCampaign {
    pub const SIZE: usize =
        32 + // advertiser_pubkey
        4 + 100 + // campaign_name
        4 + 100 + // campaign_id
        8 + // cost_per_click
        8 + // ad_duration_days
        4 + (32 * 50) + // publishers vector
        8 + // locked_sol
        8 + // remaining_sol
        8; // created_at
}