import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Adwiser } from "../target/types/adwiser";
import wallet from "../Turbin3-wallet.json";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const { expect } = chai;

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

describe("adwiser", () => {

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Adwiser as Program<Adwiser>;
  const connection = provider.connection;

  let adwiser: Keypair = keypair;
  let campaignAcc: PublicKey;
  let escrowAcc: PublicKey;
  const campaignId = new anchor.BN(Date.now());
  const campaignName = "Test Campaign";
  const costPerClick = new anchor.BN(0.05 * LAMPORTS_PER_SOL); // 1 SOL
  const adDurationDays = new anchor.BN(7); // 7 days
  const percentage = new anchor.BN(5); //5% commission
  const no_of_clicks = new anchor.BN(10);
  const advertiser = Keypair.generate();
  const publisher1 = Keypair.generate();
  const publisher2 = Keypair.generate();
  const publishers = [publisher1.publicKey, publisher2.publicKey];
  const lockedSol = new anchor.BN(2 * LAMPORTS_PER_SOL);

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

  describe("InitializeCampaign", () => {
    it("Initialize a new campaign", async () => {
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
      console.log("AdWiser Public Key: ", adwiser.publicKey.toBase58());
      console.log(
        "Cost Per Click: ",
        campaign.costPerClick.toNumber() / LAMPORTS_PER_SOL, " SOL"
      );
      console.log("Ad Duration Days: ", campaign.adDurationDays.toNumber());
      console.log(
        "Publishers: ",
        campaign.publishers.map((p: PublicKey) => p.toBase58())
      );
      console.log(
        "Locked SOL: ",
        campaign.lockedSol.toNumber() / LAMPORTS_PER_SOL, " SOL"
      );
      console.log(
        "Remaining SOL: ",
        campaign.remainingSol.toNumber() / LAMPORTS_PER_SOL, " SOL"
      );
      console.log(
        "Created At:",
        new Date(campaign.createdAt.toNumber() * 1000).toLocaleString()
      );

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

  describe("InitializeCampaign - Errors", () => {
    it("Fails to initialize campaign with zero locked SOL", async () => {
      const campaignId = new anchor.BN(Date.now() + 1);
      const [campaignAcc] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("campaign"), campaignId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      const [escrowAcc] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), campaignId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      await expect(
        program.methods
          .initializeCampaign(
            campaignId,
            "ZeroSOL",
            advertiser.publicKey,
            costPerClick,
            adDurationDays,
            publishers,
            new anchor.BN(0)
          )
          .accountsStrict({
            campaignAcc,
            escrow: escrowAcc,
            adwiser: adwiser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([adwiser])
          .rpc()
      ).to.be.rejectedWith("Amount must be greater than zero");
    });

    it("Fails to initialize campaign with empty name", async () => {
      const campaignId = new anchor.BN(Date.now() + 2);
      const [campaignAcc] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("campaign"), campaignId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      const [escrowAcc] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), campaignId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      await expect(
        program.methods
          .initializeCampaign(
            campaignId,
            "",
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
      ).to.be.rejectedWith("Campaign name cannot be empty");
    });

    it("Fails to initialize campaign with no publishers", async () => {
      const campaignId = new anchor.BN(Date.now() + 3);
      const [campaignAcc] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("campaign"), campaignId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      const [escrowAcc] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), campaignId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      await expect(
        program.methods
          .initializeCampaign(
            campaignId,
            "NoPublishers",
            advertiser.publicKey,
            costPerClick,
            adDurationDays,
            [],
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
      ).to.be.rejectedWith("No publishers provided");
    });
  });

  describe("Pay Publisher", () => {
    it("Release Publisher's Payment", async () => {
      const publisher = publisher1;

      console.log("no_of_clicks: ", no_of_clicks.toNumber());
      // Get publisher's balance before payment
      const balanceBefore = await provider.connection.getBalance(
        publisher.publicKey
      );
      console.log(
        "Publisher balance before: ",
        balanceBefore / LAMPORTS_PER_SOL,
        "SOL"
      );

      // Get escrow balance before payment
      const escrowBalanceBefore = await provider.connection.getBalance(
        escrowAcc
      );
      console.log(
        "escrow balance before: ",
        escrowBalanceBefore / LAMPORTS_PER_SOL,
        "SOL"
      );

      const campaignBefore = await program.account.campaign.fetch(campaignAcc);
      console.log(
        "Amount to be paid: ",
        no_of_clicks.mul(campaignBefore.costPerClick).toNumber() /
          LAMPORTS_PER_SOL,
        "SOL"
      );

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
      const balanceAfter = await provider.connection.getBalance(
        publisher.publicKey
      );
      console.log(
        "Publisher balance after: ",
        balanceAfter / LAMPORTS_PER_SOL,
        "SOL"
      );

      // Get escrow balance after payment
      const escrowBalanceAfter = await provider.connection.getBalance(
        escrowAcc
      );
      console.log(
        "escrow balance after: ",
        escrowBalanceAfter / LAMPORTS_PER_SOL,
        "SOL"
      );

      //Verify the remaining SOL in campaign data is updated
      const amount = no_of_clicks.mul(campaign.costPerClick);
      expect(campaign.remainingSol.toNumber()).to.be.at.least(
        lockedSol.sub(amount).toNumber() - 10000
      );

      // Verify publisher received the payment (accounting for potential transaction fees)
      expect(balanceAfter).to.be.at.least(
        balanceBefore + amount.toNumber() - 10000
      );

      // Verify escrow balance decreased by the payment amount
      expect(escrowBalanceAfter).to.be.at.most(
        escrowBalanceBefore - amount.toNumber()
      );
    });
  });

  describe("Pay Publisher - Errors", () => {
    it("Fails to pay publisher with 0 clicks", async () => {
      await expect(
        program.methods
          .payPublisher(campaignId, new anchor.BN(0))
          .accountsStrict({
            campaignAcc,
            escrow: escrowAcc,
            publisher: publishers[0],
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ).to.be.rejectedWith("Amount must be greater than zero");
    });

    it("Fails when unauthorized publisher tries to claim", async () => {
      const fakePublisher = anchor.web3.Keypair.generate();
      await expect(
        program.methods
          .payPublisher(campaignId, new anchor.BN(1))
          .accountsStrict({
            campaignAcc,
            escrow: escrowAcc,
            publisher: fakePublisher.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ).to.be.rejectedWith("Publisher not authorized");
    });
  });

  describe("Pay Commission", () => {
    it("Pays the commission to AdWiser Wallet", async () => {
      // Get AdWiser's balance before payment
      const balanceBefore = await provider.connection.getBalance(
        adwiser.publicKey
      );
      console.log(
        "AdWiser balance before: ",
        balanceBefore / LAMPORTS_PER_SOL,
        "SOL"
      );

      // Get escrow balance before payment
      const escrowBalanceBefore = await provider.connection.getBalance(
        escrowAcc
      );
      console.log(
        "escrow balance before: ",
        escrowBalanceBefore / LAMPORTS_PER_SOL,
        "SOL"
      );

      const campaignBefore = await program.account.campaign.fetch(campaignAcc);

      let amount = campaignBefore.costPerClick
        .mul(campaignBefore.commissionClicks)
        .mul(percentage)
        .div(new anchor.BN(100));

      amount = amount.add(
        campaignBefore.noOfTxns.add(new anchor.BN(1)).mul(new anchor.BN(5000))
      );

      console.log(
        "Amount to be paid: ",
        amount.toNumber() / LAMPORTS_PER_SOL,
        "SOL"
      );

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

      // Get adwiser's balance after payment
      const balanceAfter = await provider.connection.getBalance(
        adwiser.publicKey
      );
      console.log(
        "AdWiser balance after: ",
        balanceAfter / LAMPORTS_PER_SOL,
        "SOL"
      );

      // Get escrow balance after payment
      const escrowBalanceAfter = await provider.connection.getBalance(
        escrowAcc
      );
      console.log(
        "escrow balance after: ",
        escrowBalanceAfter / LAMPORTS_PER_SOL,
        "SOL"
      );
      expect(balanceAfter).greaterThan(balanceBefore);

      // Verify escrow balance decreased by the payment amount
      expect(escrowBalanceAfter).to.be.at.most(
        escrowBalanceBefore - amount.toNumber()
      );
    });
  });

  describe("Pay Commission - Errors", () => {
    it("Fails to pay commission when commission clicks are zero", async () => {
      await expect(
        program.methods
          .payCommission(campaignId, new anchor.BN(10))
          .accountsStrict({
            campaignAcc,
            escrow: escrowAcc,
            adwiser: adwiser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ).to.be.rejectedWith("Commission clicks are zero");
    });
  });

  describe("Update Campaign", () => {
    it("Update campaign details", async () => {
      const AddedSOL = new anchor.BN(10 * LAMPORTS_PER_SOL);
      const AddedDuation = new anchor.BN(3);
      const campaignBefore = await program.account.campaign.fetch(campaignAcc);
      console.log(
        "Locked SOL before: ",
        campaignBefore.lockedSol.toNumber() / LAMPORTS_PER_SOL,
        "SOL"
      );
      console.log(
        "Remaining SOL before: ",
        campaignBefore.remainingSol.toNumber() / LAMPORTS_PER_SOL,
        "SOL"
      );
      console.log(
        "Ad Duration Days before: ",
        campaignBefore.adDurationDays.toNumber(),
        "days"
      );
      const LockedSol = campaignBefore.lockedSol;
      const AdDurationDays = campaignBefore.adDurationDays;
      const remainingSol = campaignBefore.remainingSol;
      await program.methods
        .updateCampaign(campaignId, AddedDuation, AddedSOL)
        .accountsStrict({
          campaignAcc,
          escrow: escrowAcc,
          adwiser: adwiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
        .then(confirm)
        .then(log);
      console.log("Campaign updated");
      const campaign = await program.account.campaign.fetch(campaignAcc);
      console.log(
        "Updated Locked SOL: ",
        campaign.lockedSol.toNumber() / LAMPORTS_PER_SOL,
        "SOL"
      );
      console.log(
        "Updated Remaining SOL: ",
        campaign.remainingSol.toNumber() / LAMPORTS_PER_SOL,
        "SOL"
      );
      console.log(
        "Updated Ad Duration Days: ",
        campaign.adDurationDays.toNumber(),
        "days"
      );

      // Verify the updated values
      expect(campaign.lockedSol.toNumber()).to.equal(
        LockedSol.add(AddedSOL).toNumber()
      );
      expect(campaign.adDurationDays.toNumber()).to.equal(
        AdDurationDays.add(AddedDuation).toNumber()
      );
      expect(campaign.remainingSol.toNumber()).to.equal(
        remainingSol.add(AddedSOL).toNumber()
      );
    });
  });

  describe("Update Campaign - Errors", () => {
    it("Fails to update campaign with 0 SOL and 0 duration", async () => {
      await expect(
        program.methods
          .updateCampaign(campaignId, new anchor.BN(0), new anchor.BN(0))
          .accountsStrict({
            campaignAcc,
            escrow: escrowAcc,
            adwiser: adwiser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ).to.be.rejectedWith(
        "Either Locked SOL or AD Duration should be greater than zero"
      );
    });
  });

  describe("Close - Errors", () => {
    it("Fails to close escrow with 0 balance", async () => {
      const emptyCampaignId = new anchor.BN(Date.now() + 4);
      const [emptyEscrow] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), emptyCampaignId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      // Simulate empty escrow here if needed

      await expect(
        program.methods
          .closeEscrow(emptyCampaignId)
          .accountsStrict({
            escrow: emptyEscrow,
            advertiser: advertiser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ).to.be.rejectedWith("Nothing to withdraw from treasury");
    });
  });

  describe("Close Campaign", () => {
    it("close campaign", async () => {
      await program.methods
        .closeCampaign()
        .accountsStrict({
          campaignAcc,
          adwiser: adwiser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
        .then(confirm)
        .then(log);
      console.log("Campaign closed");

      await program.methods
        .closeEscrow(campaignId)
        .accountsStrict({
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