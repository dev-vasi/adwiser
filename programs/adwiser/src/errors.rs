use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds to perform this operation.")]
    InsufficientFunds,

    #[msg("Math overflow occurred.")]
    MathOverflow,

    #[msg("Unauthorized access.")]
    Unauthorized,

    #[msg("Invalid campaign parameters.")]
    InvalidCampaign,
}
