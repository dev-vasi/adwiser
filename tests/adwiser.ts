import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { randomBytes } from "node:crypto";
import { Adwiser } from "../target/types/adwiser";
import wallet from "/Users/vasi/myGitHub/Turbin3/adwiser/Turbin3-wallet.json";

describe("AdWiser Tests", () => {
  const advertiser = Keypair.fromSecretKey(new Uint8Array(wallet));
  const connection = new Connection("http://localhost:8899", "confirmed");
  const program = anchor.workspace.Adwiser as Program<Adwiser>;

  let campaignPda: PublicKey;
  const campaignName = "TestCampaign";
  const campaignId = new BN(randomBytes(8));
  const costPerClick = new anchor.BN(1000000); // 0.001 SOL
  const adDurationDays = new anchor.BN(7); // 7 days
  const lockedSol = new anchor.BN(8_000_000_000); // 1 SOL
  const publisher1 = anchor.web3.Keypair.generate().publicKey;
  const publisher2 = anchor.web3.Keypair.generate().publicKey;
  const publishers = [publisher1, publisher2];

  console.log("campaignId for PDA:", campaignId.toString());
  console.log("advertiser public key:", advertiser.publicKey.toBase58(), campaignId);
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const balanceLamports = provider.connection.getBalance(advertiser.publicKey);
  const balanceSol = Number(balanceLamports) / anchor.web3.LAMPORTS_PER_SOL;

  (async () => {
    try {
      const txhash = await connection.requestAirdrop(
        advertiser.publicKey,
        5 * LAMPORTS_PER_SOL
      );
    } catch (e) {
      console.error(`Oops, something went wrong: ${e}`);
    }
  })();

  console.log(`Advertiser Wallet Balance: ${balanceSol} SOL`);
  console.log("Connected to RPC:", provider.connection.rpcEndpoint);

  const buffer = Buffer.alloc(8); // 8 bytes for u64
  buffer.writeBigUInt64LE(BigInt(campaignId));

  it("should create an ad campaign and lock funds", async () => {
    // Debug logs to help troubleshoot PDA calculation
    console.log("Seeds used for PDA:");
    console.log("- Seed 1 (campaign):", Buffer.from("campaign").toString('hex'));
    console.log("- Seed 2 (advertiser pubkey):", advertiser.publicKey.toBuffer().toString('hex'));
    console.log("- Seed 3 (campaign ID):", campaignId.toArrayLike(Buffer, 'le', 8))
    
    // Calculate the campaign PDA correctly
    let calculatedPda = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), advertiser.publicKey.toBuffer(), campaignId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    )[0];
    
    campaignPda = calculatedPda;
    console.log("Calculated PDA:", campaignPda.toBase58());
    //console.log("Bump:", bump);
    
    // Get initial balance
    const initialAdvertiserBalance = await connection.getBalance(advertiser.publicKey);
    
    // Make sure the instruction is called with the right params in the right order
    try {
      await program.methods
        .createAdCampaign(
          campaignName,
          campaignId,
          costPerClick,
          adDurationDays,
          publishers,
          lockedSol
        )
        .accounts({
          campaign: campaignPda,
          advertiser: advertiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([advertiser])
        .rpc();
        
      console.log("Transaction successful!");
      
      // Fetch the campaign account to verify its data
      const campaignAccount = await program.account.adCampaign.fetch(campaignPda);

      expect(campaignAccount.advertiserPubkey.toBase58()).to.equal(
        advertiser.publicKey.toBase58()
      );
      expect(campaignAccount.campaignName).to.equal(campaignName);
      expect(campaignAccount.campaignId.toString()).to.equal(campaignId.toString());
      expect(campaignAccount.costPerClick.toString()).to.equal(
        costPerClick.toString()
      );
      expect(campaignAccount.lockedSol.toString()).to.equal(lockedSol.toString());
      expect(campaignAccount.remainingSol.toString()).to.equal(
        lockedSol.toString()
      );
      expect(campaignAccount.publishers.length).to.equal(2);

      // Check that funds were transferred to the campaign account
      const campaignBalance = await connection.getBalance(campaignPda);
      console.log("Campaign Balance:", campaignBalance / LAMPORTS_PER_SOL, "SOL");
      
      console.log("✅ Campaign Created Successfully!");
      console.log("Campaign PDA:", campaignPda.toBase58());
    } catch (err) {
      console.error("Error details:", err);
      
      // Try to get program logs for more details
      if (err.logs) {
        console.log("Program Logs:");
        err.logs.forEach((log, i) => console.log(`${i}: ${log}`));
      }
      
      throw err;
    }
  });
});