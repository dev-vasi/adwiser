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

  const connection = provider.connection;

  let adwiser: Keypair = keypair;
  let campaignAcc: PublicKey;
  let escrowAcc: PublicKey;
  const campaignId = new anchor.BN(55667766);
  const campaignName = "Test Campaign";
  const costPerClick = new anchor.BN(500000); // 0.005 SOL
  const adDurationDays = new anchor.BN(7);
  const percentage = new anchor.BN(5); //5% commission
  const no_of_clicks = new anchor.BN(10);
  const advertiser = Keypair.generate();
  const publisher1 = Keypair.generate();
  const publisher2 = Keypair.generate();
  const publishers = [publisher1.publicKey, publisher2.publicKey];
  const lockedSol = new anchor.BN(10 * LAMPORTS_PER_SOL);

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };

  before(async () => {
    // Derive both PDAs
    [campaignAcc] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), campaignId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    [escrowAcc] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), campaignId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
  });
  
  describe("initializeCampaign", () => {
    it("initializes a campaign", async () => {
      await program.methods
        .initializeCampaign(
          campaignId,
          campaignName,
          advertiser.publicKey,
          costPerClick,
          adDurationDays,
          publishers,
          lockedSol
        )
        .accountsStrict({
          campaignAcc,
          escrow: escrowAcc,
          adwiser: adwiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([adwiser])
        .rpc()
        .then(confirm)
        .then(log); 

      const campaign = await program.account.campaign.fetch(campaignAcc);

      console.log("Campaign Account: ", campaignAcc.toBase58());
      console.log("escrow Account: ", escrowAcc.toBase58());
      console.log("Campaign ID: ", campaign.campaignId.toString());
      console.log("Campaign Name: ", campaign.campaignName);
      console.log(
        "AdWiser Public Key: ",
        adwiser.publicKey.toBase58()
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

      // Verify escrow balance
      const escrowBalance = await provider.connection.getBalance(escrowAcc);
      console.log("escrow Balance: ", escrowBalance / LAMPORTS_PER_SOL, "SOL");

      expect(campaignId.eq(campaign.campaignId)).to.be.true;
      expect(campaign.campaignName).to.equal(campaignName);
      expect(campaign.advertiserPubkey.toBase58()).to.equal(
        advertiser.publicKey.toBase58()
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
      expect(campaign.totalClicks.toNumber()).to.equal(0);
      expect(campaign.commissionClicks.toNumber()).to.equal(0);
      expect(typeof campaign.createdAt.toNumber()).to.equal("number");
    });
  });

  describe("Pay Publisher", () => {
    it("pays the publisher", async () => {
      const publisher = publisher1;
      
      console.log("no_of_clicks: ", no_of_clicks.toNumber());
      // Get publisher's balance before payment
      const balanceBefore = await provider.connection.getBalance(publisher.publicKey);
      console.log("Publisher balance before: ", balanceBefore / LAMPORTS_PER_SOL, "SOL");
      
      // Get escrow balance before payment
      const escrowBalanceBefore = await provider.connection.getBalance(escrowAcc);
      console.log("escrow balance before: ", escrowBalanceBefore / LAMPORTS_PER_SOL, "SOL");

      const campaign1 = await program.account.campaign.fetch(campaignAcc);
      console.log ("Amount to be paid: ", no_of_clicks.mul(campaign1.costPerClick).toNumber() / LAMPORTS_PER_SOL, "SOL");


      // Pay the publisher
      await program.methods
        .payPublisher(campaignId, no_of_clicks)
        .accountsStrict({
          campaignAcc,
          escrow: escrowAcc,
          publisher: publisher.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
        .then(confirm)
        .then(log); 
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
      
      // Get escrow balance after payment
      const escrowBalanceAfter = await provider.connection.getBalance(escrowAcc);
      console.log("escrow balance after: ", escrowBalanceAfter / LAMPORTS_PER_SOL, "SOL");
      
      //Verify the remaining SOL in campaign data is updated
      const amount = no_of_clicks.mul(campaign.costPerClick);
      expect(campaign.remainingSol.toNumber()).to.be.at.least(
        lockedSol.sub(amount).toNumber() - 10000
      );
      
      // Verify publisher received the payment (accounting for potential transaction fees)
      expect(balanceAfter).to.be.at.least(balanceBefore + amount.toNumber() - 10000);
      
      // Verify escrow balance decreased by the payment amount
      expect(escrowBalanceAfter).to.be.at.most(escrowBalanceBefore - amount.toNumber());
    });
  });

  describe("Pay Commission", () => {
    it("pays the commission to adwiser wallet", async () => {
      // Get publisher's balance before payment
      const balanceBefore = await provider.connection.getBalance(adwiser.publicKey);
      console.log("AdWiser balance before: ", balanceBefore / LAMPORTS_PER_SOL, "SOL");
      
      // Get escrow balance before payment
      const escrowBalanceBefore = await provider.connection.getBalance(escrowAcc);
      console.log("escrow balance before: ", escrowBalanceBefore / LAMPORTS_PER_SOL, "SOL");


      // Pay the commssion
      await program.methods
        .payCommission(campaignId, percentage)
        .accountsStrict({
          campaignAcc,
          escrow: escrowAcc,
          adwiser: adwiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
        .then(confirm)
        .then(log); 
      console.log("Payment transaction sent");
  
      // Get campaign data after payment
      const campaign = await program.account.campaign.fetch(campaignAcc);
      console.log(
        "Remaining SOL after payment: ",
        campaign.remainingSol.toNumber() / LAMPORTS_PER_SOL
      );
      
      // Get adwiser's balance after payment
      const balanceAfter = await provider.connection.getBalance(adwiser.publicKey);
      console.log("AdWiser balance after: ", balanceAfter / LAMPORTS_PER_SOL, "SOL");
      
      // Get escrow balance after payment
      const escrowBalanceAfter = await provider.connection.getBalance(escrowAcc);
      console.log("escrow balance after: ", escrowBalanceAfter / LAMPORTS_PER_SOL, "SOL");
      
      //Verify the remaining SOL in campaign data is updated
      let amount = no_of_clicks.mul(campaign.costPerClick).toNumber();
      amount = amount * (percentage.toNumber() / 100);
      expect(balanceAfter).equals(balanceBefore + amount + 5000);
      
      // Verify publisher received the payment (accounting for potential transaction fees)
      expect(balanceAfter).to.be.at.least(balanceBefore + amount - 10000);
      
      // Verify escrow balance decreased by the payment amount
      expect(escrowBalanceAfter).to.be.at.most(escrowBalanceBefore - amount);
    });
  });

  describe("Close Campaign", () => {
    it("close campaign", async () => {
      await program.methods
        .closeCampaign().accountsStrict({
          campaignAcc,
          adwiser: adwiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
        .then(confirm)
        .then(log); 
      console.log("Campaign closed");

      await program.methods
        .closeEscrow(campaignId).accountsStrict({
          escrow: escrowAcc,
          advertiser: advertiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
        .then(confirm)
        .then(log); 
      console.log("escrow closed");
  
      const accountInfo = await provider.connection.getAccountInfo(campaignAcc);
      expect(accountInfo).to.be.null;
      const accountInfo2 = await provider.connection.getAccountInfo(escrowAcc);
      expect(accountInfo2).to.be.null;
    });
  });
});