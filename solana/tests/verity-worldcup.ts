import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { assert } from "chai";
import { VerityWorldcup } from "../target/types/verity_worldcup";

const USDC = (n: number) => new BN(Math.round(n * 1_000_000));
const SIDE_YES = 1;
const SIDE_NO = 0;

describe("verity-worldcup parimutuel settlement", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.VerityWorldcup as Program<VerityWorldcup>;
  const connection = provider.connection;

  // Keeper == wallet (market authority). Creator, LP and two bettors are distinct.
  const keeper = (provider.wallet as anchor.Wallet).payer;
  const creator = Keypair.generate();
  const lp = Keypair.generate();
  const bettorA = Keypair.generate();
  const bettorB = Keypair.generate();

  const fixtureId = new BN(17952170);
  const nonce = 1; // unique per-fixture market nonce (PDA seed)
  const statKey = 1002; // (period 1 * 1000) + base_key 2, e.g. total corners
  const statKeyB = 0; // single-stat market
  const op = 0; // 0 = none (single stat)
  const logic = 0; // 0 = none (arithmetic path)
  const statPeriod = 4; // authoritative period supplied from the proof at settle
  const threshold = 10; // YES wins if observed value > 10
  const comparison = 0; // GreaterThan
  const thresholdB = 0; // logical mode only (unused here)
  const comparisonB = 0;
  const feeBps = 200; // 2%
  const creatorShareBps = 2500; // 25% of the fee
  const lpShareBps = 2500; // 25% of the fee (remaining 50% -> treasury)

  let usdcMint: PublicKey;
  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  const ata: Record<string, PublicKey> = {};

  const positionPda = (owner: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), owner.toBuffer()],
      program.programId
    )[0];

  const bal = async (owner: PublicKey) =>
    Number((await getAccount(connection, ata[owner.toBase58()])).amount);

  before(async () => {
    for (const kp of [creator, lp, bettorA, bettorB]) {
      const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
    }

    usdcMint = await createMint(connection, keeper, keeper.publicKey, null, 6);

    for (const kp of [keeper, creator, lp, bettorA, bettorB]) {
      const account = await getOrCreateAssociatedTokenAccount(
        connection,
        keeper,
        usdcMint,
        kp.publicKey
      );
      ata[kp.publicKey.toBase58()] = account.address;
    }
    // Fund LP + bettors with USDC.
    await mintTo(connection, keeper, usdcMint, ata[lp.publicKey.toBase58()], keeper, 100_000_000);
    await mintTo(connection, keeper, usdcMint, ata[bettorA.publicKey.toBase58()], keeper, 60_000_000);
    await mintTo(connection, keeper, usdcMint, ata[bettorB.publicKey.toBase58()], keeper, 40_000_000);

    [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        fixtureId.toArrayLike(Buffer, "le", 8),
        new BN(nonce).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );
  });

  it("creates a market with a short staking window", async () => {
    const deadline = new BN(Math.floor(Date.now() / 1000) + 5);
    await program.methods
      .initMarket(
        fixtureId,
        nonce,
        statKey,
        statKeyB,
        op,
        logic,
        statPeriod,
        threshold,
        comparison,
        thresholdB,
        comparisonB,
        deadline,
        feeBps,
        creatorShareBps,
        lpShareBps
      )
      .accounts({
        authority: keeper.publicKey,
        creator: creator.publicKey,
        usdcMint,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.fixtureId.toString(), fixtureId.toString());
    assert.equal(market.threshold, threshold);
    assert.isFalse(market.resolved);
  });

  it("accepts LP liquidity and directional stakes", async () => {
    await program.methods
      .addLiquidity(USDC(100))
      .accounts({
        user: lp.publicKey,
        market: marketPda,
        vault: vaultPda,
        userUsdc: ata[lp.publicKey.toBase58()],
      })
      .signers([lp])
      .rpc();

    await program.methods
      .stake(SIDE_YES, USDC(60))
      .accounts({
        user: bettorA.publicKey,
        market: marketPda,
        vault: vaultPda,
        userUsdc: ata[bettorA.publicKey.toBase58()],
      })
      .signers([bettorA])
      .rpc();

    await program.methods
      .stake(SIDE_NO, USDC(40))
      .accounts({
        user: bettorB.publicKey,
        market: marketPda,
        vault: vaultPda,
        userUsdc: ata[bettorB.publicKey.toBase58()],
      })
      .signers([bettorB])
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.yesPool.toString(), USDC(110).toString()); // 50 LP + 60 A
    assert.equal(market.noPool.toString(), USDC(90).toString()); //  50 LP + 40 B
    assert.equal(market.totalLpDeposits.toString(), USDC(100).toString());
    assert.equal(Number(await getAccount(connection, vaultPda).then((a) => a.amount)), 200_000_000);
  });

  it("settles YES via CPI into (mock) TxLINE validate_stat", async () => {
    // Wait for the deadline to pass.
    await new Promise((r) => setTimeout(r, 6000));

    const dummyRoot = Array(32).fill(0);
    const fixtureSummary = {
      fixtureId,
      updateStats: { updateCount: 1, minTimestamp: new BN(0), maxTimestamp: new BN(0) },
      eventsSubTreeRoot: dummyRoot,
    };
    // Mock ignores proofs/root; the observed value 12 (> threshold 10) => YES.
    await program.methods
      .settle(
        new BN(Math.floor(Date.now() / 1000)),
        fixtureSummary,
        [],
        [],
        12,
        statPeriod,
        dummyRoot,
        [],
        null
      )
      .accounts({
        authority: keeper.publicKey,
        market: marketPda,
        dailyScoresMerkleRoots: Keypair.generate().publicKey,
        txlineProgram: new PublicKey("GjEDdDHNoUK52x73SBiMyfz5zn8BtsLuPE5YFfCW2U8T"),
      })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.isTrue(market.resolved);
    assert.isFalse(market.voided);
    assert.equal(market.winningSide, SIDE_YES);
    assert.equal(market.winningPool.toString(), USDC(110).toString());
    assert.equal(market.distributable.toString(), USDC(196).toString()); // 200 - 2% fee
    assert.equal(market.creatorFee.toString(), USDC(1).toString());
    assert.equal(market.lpFee.toString(), USDC(1).toString());
    assert.equal(market.treasuryFee.toString(), USDC(2).toString());
  });

  it("pays winners, LP fee share, creator and treasury deterministically", async () => {
    const claim = (owner: Keypair) =>
      program.methods
        .claim()
        .accounts({
          user: owner.publicKey,
          market: marketPda,
          position: positionPda(owner.publicKey),
          vault: vaultPda,
          userUsdc: ata[owner.publicKey.toBase58()],
        })
        .signers([owner])
        .rpc();

    // Bettor A: 196 * 60/110 = 106.909090 USDC
    await claim(bettorA);
    assert.equal(await bal(bettorA.publicKey), 106_909_090);

    // LP: base 196 * 50/110 = 89.090909 + full lp fee (1) = 90.090909 USDC
    await claim(lp);
    assert.equal(await bal(lp.publicKey), 90_090_909);

    // Bettor B lost -> nothing to claim.
    let reverted = false;
    try {
      await claim(bettorB);
    } catch (_e) {
      reverted = true;
    }
    assert.isTrue(reverted, "losing bettor should not be able to claim");

    // Creator royalty = 1 USDC.
    await program.methods
      .claimCreatorRoyalty()
      .accounts({
        creator: creator.publicKey,
        market: marketPda,
        vault: vaultPda,
        creatorUsdc: ata[creator.publicKey.toBase58()],
      })
      .signers([creator])
      .rpc();
    assert.equal(await bal(creator.publicKey), 1_000_000);

    // Treasury (keeper) = 2 USDC.
    const keeperBefore = await bal(keeper.publicKey);
    await program.methods
      .claimTreasury()
      .accounts({
        authority: keeper.publicKey,
        market: marketPda,
        vault: vaultPda,
        authorityUsdc: ata[keeper.publicKey.toBase58()],
      })
      .rpc();
    assert.equal((await bal(keeper.publicKey)) - keeperBefore, 2_000_000);

    // Vault fully drained except integer-division dust (< a few base units).
    const vaultLeft = Number(await getAccount(connection, vaultPda).then((a) => a.amount));
    assert.isBelow(vaultLeft, 5);
  });
});

describe("verity-worldcup relational (two-stat) settlement", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.VerityWorldcup as Program<VerityWorldcup>;
  const connection = provider.connection;

  const keeper = (provider.wallet as anchor.Wallet).payer;
  const creator = Keypair.generate();
  const bettor = Keypair.generate();

  // "Participant 1 wins": (P1 goals - P2 goals) > 0.
  const fixtureId = new BN(17952170);
  const nonce = 2; // distinct nonce -> distinct PDA even though base key reused
  const statKeyA = 1; // P1 goals
  const statKeyB = 2; // P2 goals
  const op = 2; // Subtract
  const statPeriod = 4;
  const threshold = 0;
  const comparison = 0; // GreaterThan -> P1 - P2 > 0

  let usdcMint: PublicKey;
  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  const ata: Record<string, PublicKey> = {};

  before(async () => {
    for (const kp of [creator, bettor]) {
      const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
    }
    usdcMint = await createMint(connection, keeper, keeper.publicKey, null, 6);
    for (const kp of [keeper, creator, bettor]) {
      const account = await getOrCreateAssociatedTokenAccount(connection, keeper, usdcMint, kp.publicKey);
      ata[kp.publicKey.toBase58()] = account.address;
    }
    await mintTo(connection, keeper, usdcMint, ata[bettor.publicKey.toBase58()], keeper, 50_000_000);

    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), fixtureId.toArrayLike(Buffer, "le", 8), new BN(nonce).toArrayLike(Buffer, "le", 4)],
      program.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );
  });

  it("settles a winner market by combining two proven stats (Subtract)", async () => {
    const deadline = new BN(Math.floor(Date.now() / 1000) + 4);
    await program.methods
      .initMarket(fixtureId, nonce, statKeyA, statKeyB, op, 0, statPeriod, threshold, comparison, 0, 0, deadline, 0, 0, 0)
      .accounts({ authority: keeper.publicKey, creator: creator.publicKey, usdcMint })
      .rpc();

    await program.methods
      .stake(SIDE_YES, USDC(10))
      .accounts({ user: bettor.publicKey, market: marketPda, vault: vaultPda, userUsdc: ata[bettor.publicKey.toBase58()] })
      .signers([bettor])
      .rpc();

    await new Promise((r) => setTimeout(r, 5000));

    const dummyRoot = Array(32).fill(0);
    const fixtureSummary = {
      fixtureId,
      updateStats: { updateCount: 1, minTimestamp: new BN(0), maxTimestamp: new BN(0) },
      eventsSubTreeRoot: dummyRoot,
    };
    // stat_a (P1 goals) = 2, stat_b (P2 goals) = 1 -> 2 - 1 = 1 > 0 -> YES.
    await program.methods
      .settle(
        new BN(Math.floor(Date.now() / 1000)),
        fixtureSummary,
        [],
        [],
        2,
        statPeriod,
        dummyRoot,
        [],
        { value: 1, period: statPeriod, eventStatRoot: dummyRoot, statProof: [] }
      )
      .accounts({
        authority: keeper.publicKey,
        market: marketPda,
        dailyScoresMerkleRoots: Keypair.generate().publicKey,
        txlineProgram: new PublicKey("GjEDdDHNoUK52x73SBiMyfz5zn8BtsLuPE5YFfCW2U8T"),
      })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.isTrue(market.resolved);
    assert.equal(market.winningSide, SIDE_YES);
    assert.equal(market.statKeyB, statKeyB);
    assert.equal(market.op, op);
  });
});

describe("verity-worldcup logical (AND/OR) settlement — BTTS", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.VerityWorldcup as Program<VerityWorldcup>;
  const connection = provider.connection;

  const keeper = (provider.wallet as anchor.Wallet).payer;
  const creator = Keypair.generate();

  // BTTS: (P1 goals > 0) AND (P2 goals > 0).
  const fixtureId = new BN(17952170);
  const statKeyA = 1; // P1 goals
  const statKeyB = 2; // P2 goals
  const op = 0; // arithmetic op unused in logical mode
  const LOGIC_AND = 1;
  const statPeriod = 4;
  const thresholdA = 0;
  const comparisonA = 0; // GreaterThan -> P1 > 0
  const thresholdB = 0;
  const comparisonB = 0; // GreaterThan -> P2 > 0

  let usdcMint: PublicKey;

  const marketFor = (nonce: number) => {
    const [m] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), fixtureId.toArrayLike(Buffer, "le", 8), new BN(nonce).toArrayLike(Buffer, "le", 4)],
      program.programId
    );
    const [v] = PublicKey.findProgramAddressSync([Buffer.from("vault"), m.toBuffer()], program.programId);
    return { m, v };
  };

  before(async () => {
    const sig = await connection.requestAirdrop(creator.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    usdcMint = await createMint(connection, keeper, keeper.publicKey, null, 6);
  });

  // Combine two proven stats with a boolean; assert the AND outcome.
  const settleBtts = async (nonce: number, valA: number, valB: number, expectYes: boolean) => {
    const { m, v } = marketFor(nonce);
    const deadline = new BN(Math.floor(Date.now() / 1000) + 3);
    await program.methods
      .initMarket(fixtureId, nonce, statKeyA, statKeyB, op, LOGIC_AND, statPeriod, thresholdA, comparisonA, thresholdB, comparisonB, deadline, 0, 0, 0)
      .accounts({ authority: keeper.publicKey, creator: creator.publicKey, usdcMint, market: m, vault: v })
      .rpc();

    await new Promise((r) => setTimeout(r, 4000));

    const dummyRoot = Array(32).fill(0);
    const fixtureSummary = {
      fixtureId,
      updateStats: { updateCount: 1, minTimestamp: new BN(0), maxTimestamp: new BN(0) },
      eventsSubTreeRoot: dummyRoot,
    };
    await program.methods
      .settle(
        new BN(Math.floor(Date.now() / 1000)),
        fixtureSummary,
        [],
        [],
        valA,
        statPeriod,
        dummyRoot,
        [],
        { value: valB, period: statPeriod, eventStatRoot: dummyRoot, statProof: [] }
      )
      .accounts({
        authority: keeper.publicKey,
        market: m,
        dailyScoresMerkleRoots: Keypair.generate().publicKey,
        txlineProgram: new PublicKey("GjEDdDHNoUK52x73SBiMyfz5zn8BtsLuPE5YFfCW2U8T"),
      })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();

    const market = await program.account.market.fetch(m);
    assert.isTrue(market.resolved);
    assert.equal(market.logic, LOGIC_AND);
    assert.equal(market.winningSide, expectYes ? SIDE_YES : SIDE_NO);
  };

  it("BTTS = YES when both teams score (1 AND 1)", async () => {
    await settleBtts(101, 1, 1, true);
  });

  it("BTTS = NO when only one team scores (2 AND 0)", async () => {
    await settleBtts(102, 2, 0, false);
  });
});
