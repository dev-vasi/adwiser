#![allow(unexpected_cfgs)]


use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub campaign_id: u64,
    #[max_len(50)]
    pub campaign_name: String,
    pub advertiser_pubkey: Pubkey,
    pub cost_per_click: u64,
    pub ad_duration_days: u64,
    #[max_len(10, 50)]
    pub publishers: Vec<Pubkey>,
    pub locked_sol: u64,
    pub remaining_sol: u64,
    pub total_clicks: u64,
    pub commission_clicks: u64,
    pub no_of_txns: u64,
    pub created_at: i64,
}
#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub campaign_id: u64,
    pub amount: u64,
}