use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::campaign;
use crate::state::Escrow;

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct InitializeCampaign<'info> {
    #[account(
        init_if_needed,
        payer = advertiser,
        space = 8 + campaign::INIT_SPACE,
        seeds = [b"campaign", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub campaign_acc: Box<Account<'info, campaign>>,

    #[account(
        init_if_needed,
        payer = advertiser,
        space = 0,  // No data, just holds SOL
        seeds = [b"treasury", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    /// CHECK: This is a PDA that will hold SOL for the campaign
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub advertiser: Signer<'info>,
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
        // Initialize campaign account data
        self.campaign_acc.set_inner(campaign {
            campaign_id,
            campaign_name,
            advertiser_pubkey,
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

        // Transfer funds to the treasury account instead of campaign account
        system_program::transfer(
            CpiContext::new(
                self.system_program.to_account_info(),
                system_program::Transfer {
                    from: self.advertiser.to_account_info(),
                    to: self.treasury.to_account_info(),
                },
            ),
            locked_sol,
        )?;
        
        msg!("Transferred {} SOL to campaign treasury", locked_sol);
        Ok(())
    }
}