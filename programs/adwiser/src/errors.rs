use anchor_lang::prelude::*;

#[error_code]
pub enum AdwiserError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Not enough funds in campaign")]
    InsufficientFunds,
    #[msg("Publisher not authorized")]
    UnauthorizedPublisher,
    #[msg("Campaign name cannot be empty")]
    InvalidName,
    #[msg("No publishers provided")]
    NoPublishers,
    #[msg("Only the adwiser can close this campaign")]
    UnauthorizedCloser,
    #[msg("Nothing to withdraw from treasury")]
    NothingToWithdraw,
    #[msg("Commission clicks are zero")]
    NoClicksForCommission,
    #[msg("Either Locked SOL or AD Duration should be greater than zero")]
    InvalidUpdate,
}
