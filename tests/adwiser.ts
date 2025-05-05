import { expect } from "chai";
import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Transaction,
} from "@solana/web3.js";
import { Adwiser } from "../target/types/adwiser";
import wallet from "../Turbin3-wallet.json";
import { randomBytes } from "crypto";

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

describe("adwiser", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Adwiser as Program<Adwiser>;

  let adwiser: Keypair = keypair;
  let campaignAcc: PublicKey;
  let treasuryAcc: PublicKey; // Added treasury account
  const campaignId = new anchor.BN(55667766);
  const campaignName = "Test Campaign";
  const costPerClick = new anchor.BN(1000);
  const adDurationDays = new anchor.BN(7);
  const publisher1 = Keypair.generate();
  const publisher2 = Keypair.generate();
  const publishers = [publisher1.publicKey, publisher2.publicKey];
  const lockedSol = new anchor.BN(10 * LAMPORTS_PER_SOL);

  before(async () => {
    // Derive both PDAs
    [campaignAcc] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), campaignId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    [treasuryAcc] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), campaignId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    // Fund publisher accounts for rent exemption
    // const airdropSignature1 = await provider.connection.requestAirdrop(
    //   publisher1.publicKey,
    //   0.1 * LAMPORTS_PER_SOL
    // );
    // const airdropSignature2 = await provider.connection.requestAirdrop(
    //   publisher2.publicKey,
    //   0.1 * LAMPORTS_PER_SOL
    // );
  });
  
  describe("initializeCampaign", () => {
    it("initializes a campaign", async () => {
      await program.methods
        .initializeCampaign(
          campaignId,
          campaignName,
          adwiser.publicKey,
          costPerClick,
          adDurationDays,
          publishers,
          lockedSol
        )
        .accounts({
          campaignAcc,
          treasury: treasuryAcc, // Include treasury account
          adwiser: adwiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([adwiser])
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignAcc);

      console.log("Campaign Account: ", campaignAcc.toBase58());
      console.log("Treasury Account: ", treasuryAcc.toBase58());
      console.log("Campaign ID: ", campaign.campaignId.toString());
      console.log("Campaign Name: ", campaign.campaignName);
      console.log(
        "AdWiser Public Key: ",
        campaign.adwiserPubkey.toBase58()
      );
      console.log(
        "Cost Per Click: ",
        campaign.costPerClick.toNumber() / LAMPORTS_PER_SOL
      );
      console.log("Ad Duration Days: ", campaign.adDurationDays.toNumber());
      console.log(
        "Publishers: ",
        campaign.publishers.map((p: PublicKey) => p.toBase58())
      );
      console.log(
        "Locked SOL: ",
        campaign.lockedSol.toNumber() / LAMPORTS_PER_SOL
      );
      console.log(
        "Remaining SOL: ",
        campaign.remainingSol.toNumber() / LAMPORTS_PER_SOL
      );
      console.log("Created At: ", campaign.createdAt.toString());

      // Verify treasury balance
      const treasuryBalance = await provider.connection.getBalance(treasuryAcc);
      console.log("Treasury Balance: ", treasuryBalance / LAMPORTS_PER_SOL, "SOL");

      expect(campaignId.eq(campaign.campaignId)).to.be.true;
      expect(campaign.campaignName).to.equal(campaignName);
      expect(campaign.adwiserPubkey.toBase58()).to.equal(
        adwiser.publicKey.toBase58()
      );
      expect(campaign.costPerClick.toNumber()).to.equal(
        costPerClick.toNumber()
      );
      expect(campaign.adDurationDays.toNumber()).to.equal(
        adDurationDays.toNumber()
      );
      expect(
        campaign.publishers.map((p: PublicKey) => p.toBase58())
      ).to.deep.equal(publishers.map((p) => p.toBase58()));
      expect(campaign.lockedSol.toNumber()).to.equal(lockedSol.toNumber());
      expect(campaign.remainingSol.toNumber()).to.equal(lockedSol.toNumber());
      expect(typeof campaign.createdAt.toNumber()).to.equal("number");
    });
  });

  describe("Pay Publisher", () => {
    it("pays the publisher", async () => {
      const publisher = publisher1;
      const amount = new anchor.BN(1 * LAMPORTS_PER_SOL);
      
      // Get publisher's balance before payment
      const balanceBefore = await provider.connection.getBalance(publisher.publicKey);
      console.log("Publisher balance before: ", balanceBefore / LAMPORTS_PER_SOL, "SOL");
      
      // Get treasury balance before payment
      const treasuryBalanceBefore = await provider.connection.getBalance(treasuryAcc);
      console.log("Treasury balance before: ", treasuryBalanceBefore / LAMPORTS_PER_SOL, "SOL");

      // Pay the publisher
      await program.methods
        .payPublisher(campaignId, amount)
        .accounts({
          campaignAcc,
          treasury: treasuryAcc,
          publisher: publisher.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Payment transaction sent");
  
      // Get campaign data after payment
      const campaign = await program.account.campaign.fetch(campaignAcc);
      console.log(
        "Remaining SOL after payment: ",
        campaign.remainingSol.toNumber() / LAMPORTS_PER_SOL
      );
      
      // Get publisher's balance after payment
      const balanceAfter = await provider.connection.getBalance(publisher.publicKey);
      console.log("Publisher balance after: ", balanceAfter / LAMPORTS_PER_SOL, "SOL");
      
      // Get treasury balance after payment
      const treasuryBalanceAfter = await provider.connection.getBalance(treasuryAcc);
      console.log("Treasury balance after: ", treasuryBalanceAfter / LAMPORTS_PER_SOL, "SOL");
      
      // Verify the remaining SOL in campaign data is updated
      // expect(campaign.remainingSol.toNumber()).to.equal(
      //   lockedSol.sub(amount).toNumber()
      // );
      
      // Verify publisher received the payment (accounting for potential transaction fees)
      expect(balanceAfter).to.be.at.least(balanceBefore + amount.toNumber() - 10000);
      
      // Verify treasury balance decreased by the payment amount
      expect(treasuryBalanceAfter).to.be.at.most(treasuryBalanceBefore - amount.toNumber());
    });
  });

  describe("Close Campaign", () => {
    it("close campaign", async () => {

      const advertiser = Keypair.generate();
    
      await program.methods
        .closeCampaign().accounts({
          campaignAcc,
          adwiser: adwiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Campaign closed");

      await program.methods
        .closeTreasury(campaignId).accounts({
          treasury: treasuryAcc,
          advertiser: advertiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Treasury closed");
  
      const accountInfo = await provider.connection.getAccountInfo(campaignAcc);
      expect(accountInfo).to.be.null;
      const accountInfo2 = await provider.connection.getAccountInfo(treasuryAcc);
      expect(accountInfo2).to.be.null;
    });
  });
});