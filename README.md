# AdWiser Anchor Program

This folder contains the Solana smart contracts (Anchor framework) powering **AdWiser**, a decentralized advertising escrow system. Advertisers lock SOL to run CPC-based campaigns across publisher ad slots. Funds are released to publishers based on valid click counts.

---

## 📦 Features

- Campaign creation by advertisers (duration, CPC, budget, publisher list)
- SOL escrow locked under a unique Program Derived Address (PDA)
- Publisher ad slots registered with CPC rates
- Payout mechanism to publishers based on verified clicks
- Access control to ensure only valid publishers are paid

---

## 🔧 Tech Stack

- Solana
- Anchor Framework
- Rust

---

## 📁 Structure

anchor/
├── programs/
│ └── adwiser/ # Main program logic
├── tests/ # Mocha tests using Anchor
├── migrations/ # Anchor deploy configuration
├── target/ # Generated files
├── Anchor.toml # Anchor config
└── Cargo.toml # Rust dependencies


---

## 🏁 Getting Started

### Prerequisites

- Rust + Cargo
- Solana CLI
- Anchor CLI

### 1. Install dependencies using yarn or npm install

    $ anchor build

2. Run tests (local validator)

    $ anchor test

3. Deploy to Devnet
    $ solana config set --url devnet
    $ anchor deploy

⚙️ Program Accounts

📌 Campaign PDA
Stores:
campaign_id
campaign_name
Advertiser pubkey
Publisher list
CPC rate
locked_sol
Remaining budget
ad_duration_days
📌 Payment Logic
Function: pay_publisher_fn(no_of_clicks)
Verifies:
Publisher is whitelisted
Enough SOL in escrow
Calculate Amount to Pay
Transfers: CPC SOL to publisher's wallet

🛠️ Development Notes

All state is stored via PDAs for security and transparency
Campaign state is initialized with seeds = [b"campaign", campaignid]
Payment uses cpi transfer with proper signer seeds

✨ Author

Crafted with ⚡ on Solana by Vasiulla


---

Let me know if you want to include example instructions, or program logs.

