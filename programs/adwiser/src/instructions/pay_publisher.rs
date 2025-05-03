use crate::state::campaign;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke_signed;

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct PayPublisher<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub campaign_acc: Box<Account<'info, campaign>>,
    
    #[account(
        mut,
        seeds = [b"treasury", campaign_id.to_le_bytes().as_ref()],
        bump,
    )]
    /// CHECK: This is the treasury PDA that holds the campaign funds
    pub treasury: UncheckedAccount<'info>,
    
    /// CHECK: We're only using this as a target for transfer
    #[account(mut)]
    pub publisher: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn pay_publisher(
    ctx: Context<PayPublisher>,
    campaign_id: u64,
    amount: u64,
) -> Result<()> {
    let campaign_acc = &mut ctx.accounts.campaign_acc;
    
    // Make sure we have enough funds
    // if campaign_acc.remaining_sol < amount {
    //     return Err(error!(ErrorCode::InsufficientFunds));
    // }

    // Get treasury seeds for signing
    let campaign_id_bytes = campaign_id.to_le_bytes();
    let treasury_seeds = &[
        b"treasury",
        campaign_id_bytes.as_ref(),
        &[ctx.bumps.treasury],
    ];
    
    // Transfer SOL from treasury to publisher
    invoke_signed(
        &system_instruction::transfer(
            &ctx.accounts.treasury.key(),
            &ctx.accounts.publisher.key(),
            amount,
        ),
        &[
            ctx.accounts.treasury.to_account_info(),
            ctx.accounts.publisher.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[treasury_seeds],
    )?;

    // Update remaining SOL in campaign tracking
    campaign_acc.remaining_sol = campaign_acc.remaining_sol.saturating_sub(amount);

    msg!("Transferred {} lamports to publisher", amount);
    Ok(())
}