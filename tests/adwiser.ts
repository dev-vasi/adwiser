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
import * as fs from "fs";
import { randomBytes } from "node:crypto";
import { Adwiser } from "../target/types/adwiser";
import wallet from "/Users/vasi/myGitHub/Turbin3/adwiser/Turbin3-wallet.json";

describe("AdWiser Tests", () => {

  const advertiser = Keypair.fromSecretKey(new Uint8Array(wallet));


  const program = anchor.workspace.Adwiser as Program<Adwiser>;

  let campaignPda: PublicKey;
  const campaignName = "TestCampaign";
  const campaignId = new anchor.BN(randomBytes(8), undefined, "le");
  const costPerClick = new anchor.BN(1000000); // 0.001 SOL
  const adDurationDays = new anchor.BN(7); // 7 days
  const lockedSol = new anchor.BN(1_000_000_000); // 2 SOL
  const publisher1 = anchor.web3.Keypair.generate().publicKey;
  const publisher2 = anchor.web3.Keypair.generate().publicKey;
  const publishers = [publisher1, publisher2];

  console.log("campaignId for PDA:", campaignId);
  console.log("advertiser public key:", advertiser.publicKey.toBase58());

  it("should create an ad campaign and lock funds", async () => {
    campaignPda = await PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), advertiser.publicKey.toBuffer()],
      program.programId
    )[0];
    console.log("calculated PDA:", campaignPda.toBase58());
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

    const campaignAccount = await program.account.adCampaign.fetch(campaignPda);

    expect(campaignAccount.advertiserPubkey.toBase58()).to.equal(
      advertiser.publicKey.toBase58()
    );
    expect(campaignAccount.campaignName).to.equal(campaignName);
    expect(campaignAccount.campaignId).to.deep.equal(campaignId);
    expect(campaignAccount.costPerClick.toString()).to.equal(
      costPerClick.toString()
    );
    expect(campaignAccount.lockedSol.toString()).to.equal(lockedSol.toString());
    expect(campaignAccount.remainingSol.toString()).to.equal(
      lockedSol.toString()
    );
    expect(campaignAccount.publishers.length).to.equal(2);

    console.log("✅ Campaign Created Successfully!");
    console.log("Campaign PDA:", campaignPda.toBase58());
  });
});
