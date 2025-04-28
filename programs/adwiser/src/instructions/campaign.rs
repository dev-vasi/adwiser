use anchor_lang::prelude::*;
use crate::state::AdCampaign;
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateAdCampaign<'info> {
    #[account(
        init,
        payer = advertiser,
        space = 8 + AdCampaign::INIT_SPACE,
        seeds = [b"campaign", advertiser.key().as_ref()],
        bump,
    )]
    pub campaign: Account<'info, AdCampaign>,
    
    #[account(mut)]
    pub advertiser: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_ad_campaign_logic(
    ctx: Context<CreateAdCampaign>,
    campaign_name: String,
    campaign_id: u64,
    cost_per_click: u64,
    ad_duration_days: u64,
    publishers: Vec<Pubkey>,
    locked_sol: u64,
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    campaign.advertiser_pubkey = *ctx.accounts.advertiser.key;
    campaign.campaign_name = campaign_name;
    campaign.campaign_id = campaign_id;
    campaign.cost_per_click = cost_per_click;
    campaign.ad_duration_days = ad_duration_days;
    campaign.publishers = publishers;
    campaign.locked_sol = locked_sol;
    campaign.remaining_sol = locked_sol;
    campaign.created_at = Clock::get()?.unix_timestamp;

    let rent_lamports = Rent::get()?.minimum_balance(8 + AdCampaign::INIT_SPACE);
    let total_needed = locked_sol.checked_add(rent_lamports).ok_or(ErrorCode::MathOverflow)?;

    require!(
        ctx.accounts.advertiser.lamports() >= total_needed,
        ErrorCode::InsufficientFunds
    );

    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.advertiser.key(),
        &ctx.accounts.campaign.key(),
        total_needed,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.advertiser.to_account_info(),
            ctx.accounts.campaign.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    Ok(())
}