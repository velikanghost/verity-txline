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
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { assert } from "chai";
import { VerityWorldcup } from "../target/types/verity_worldcup";

const USDC = (n: number) => new BN(Math.round(n * 1_000_000));
const MOCK_TXLINE = new PublicKey("GjEDdDHNoUK52x73SBiMyfz5zn8BtsLuPE5YFfCW2U8T");

// OutcomeRule helper (op/logic/comparison codes match the on-chain enums).
const rule = (
  op: number,
  logic: number,
  threshold: number,
  comparison: number,
  thresholdB = 0,
  comparisonB = 0,
) => ({ op, logic, threshold, comparison, thresholdB, comparisonB });

const marketPdaFor = (program: Program<VerityWorldcup>, fixtureId: BN, nonce: number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("market"), fixtureId.toArrayLike(Buffer, "le", 8), new BN(nonce).toArrayLike(Buffer, "le", 4)],
    program.programId,
  )[0];
const vaultPdaFor = (program: Program<VerityWorldcup>, market: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], program.programId)[0];
const positionPdaFor = (program: Program<VerityWorldcup>, market: PublicKey, owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("position"), market.toBuffer(), owner.toBuffer()],
    program.programId,
  )[0];

describe("verity-worldcup binary (N=2) parimutuel settlement + payouts", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.VerityWorldcup as Program<VerityWorldcup>;
  const connection = provider.connection;

  const keeper = (provider.wallet as anchor.Wallet).payer;
  const bettorA = Keypair.generate();
  const bettorB = Keypair.generate();

  const fixtureId = new BN(17952170);
  const nonce = 1;
  const statKey = 1002;
  const statPeriod = 4;
  const feeBps = 200; // 2% -> treasury

  // Outcome 0 = NO, outcome 1 = YES ("value > 10").
  const rules = [rule(0, 0, 10, 0)];

  let usdcMint: PublicKey, marketPda: PublicKey, vaultPda: PublicKey;
  const ata: Record<string, PublicKey> = {};
  const bal = async (o: PublicKey) => Number((await getAccount(connection, ata[o.toBase58()])).amount);

  before(async () => {
    for (const kp of [bettorA, bettorB]) {
      await connection.confirmTransaction(await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL), "confirmed");
    }
    usdcMint = await createMint(connection, keeper, keeper.publicKey, null, 6);
    for (const kp of [keeper, bettorA, bettorB]) {
      ata[kp.publicKey.toBase58()] = (await getOrCreateAssociatedTokenAccount(connection, keeper, usdcMint, kp.publicKey)).address;
    }
    await mintTo(connection, keeper, usdcMint, ata[bettorA.publicKey.toBase58()], keeper, 60_000_000);
    await mintTo(connection, keeper, usdcMint, ata[bettorB.publicKey.toBase58()], keeper, 40_000_000);
    marketPda = marketPdaFor(program, fixtureId, nonce);
    vaultPda = vaultPdaFor(program, marketPda);
  });

  it("creates a 2-outcome market", async () => {
    const deadline = new BN(Math.floor(Date.now() / 1000) + 5);
    await program.methods
      .initMarket(fixtureId, nonce, statKey, 0, statPeriod, 2, rules, deadline, feeBps)
      .accounts({ authority: keeper.publicKey, usdcMint })
      .rpc();
    const m = await program.account.market.fetch(marketPda);
    assert.equal(m.outcomeCount, 2);
    assert.isFalse(m.resolved);
  });

  it("accepts directional stakes", async () => {
    await program.methods.stake(1, USDC(60))
      .accounts({ user: bettorA.publicKey, market: marketPda, vault: vaultPda, userUsdc: ata[bettorA.publicKey.toBase58()] })
      .signers([bettorA]).rpc();
    await program.methods.stake(0, USDC(40))
      .accounts({ user: bettorB.publicKey, market: marketPda, vault: vaultPda, userUsdc: ata[bettorB.publicKey.toBase58()] })
      .signers([bettorB]).rpc();

    const m = await program.account.market.fetch(marketPda);
    assert.equal(m.pools[1].toString(), USDC(60).toString());
    assert.equal(m.pools[0].toString(), USDC(40).toString());
  });

  it("settles outcome 1 (YES) via CPI into (mock) TxLINE", async () => {
    await new Promise((r) => setTimeout(r, 6000));
    const dummyRoot = Array(32).fill(0);
    const fixtureSummary = { fixtureId, updateStats: { updateCount: 1, minTimestamp: new BN(0), maxTimestamp: new BN(0) }, eventsSubTreeRoot: dummyRoot };
    await program.methods
      .settle(new BN(Math.floor(Date.now() / 1000)), fixtureSummary, [], [], 12, statPeriod, dummyRoot, [], null)
      .accounts({ authority: keeper.publicKey, market: marketPda, dailyScoresMerkleRoots: Keypair.generate().publicKey, txlineProgram: MOCK_TXLINE })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();
    const m = await program.account.market.fetch(marketPda);
    // pot = 100; fee 2% = 2 (all treasury); distributable 98; winning pool 60.
    assert.isTrue(m.resolved);
    assert.equal(m.winningOutcome, 1);
    assert.equal(m.winningPool.toString(), USDC(60).toString());
    assert.equal(m.distributable.toString(), USDC(98).toString());
    assert.equal(m.treasuryFee.toString(), USDC(2).toString());
  });

  it("pays the winner and treasury deterministically", async () => {
    const claim = (owner: Keypair) => program.methods.claim()
      .accounts({ user: owner.publicKey, market: marketPda, position: positionPdaFor(program, marketPda, owner.publicKey), vault: vaultPda, userUsdc: ata[owner.publicKey.toBase58()] })
      .signers([owner]).rpc();

    // bettor A is the only winner: takes the whole 98 distributable.
    await claim(bettorA);
    assert.equal(await bal(bettorA.publicKey), 98_000_000);

    let reverted = false;
    try { await claim(bettorB); } catch { reverted = true; }
    assert.isTrue(reverted, "losing bettor should not be able to claim");

    const keeperBefore = await bal(keeper.publicKey);
    await program.methods.claimTreasury()
      .accounts({ authority: keeper.publicKey, market: marketPda, vault: vaultPda, authorityUsdc: ata[keeper.publicKey.toBase58()] })
      .rpc();
    assert.equal((await bal(keeper.publicKey)) - keeperBefore, 2_000_000);
  });
});

describe("verity-worldcup 3-way match result", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.VerityWorldcup as Program<VerityWorldcup>;
  const connection = provider.connection;

  const keeper = (provider.wallet as anchor.Wallet).payer;
  const fixtureId = new BN(17952170);
  const statKeyA = 1, statKeyB = 2, statPeriod = 4;
  const OP_SUB = 2, GT = 0, LT = 1;
  const rules = [rule(OP_SUB, 0, 0, GT), rule(OP_SUB, 0, 0, LT)];

  let usdcMint: PublicKey;
  before(async () => { usdcMint = await createMint(connection, keeper, keeper.publicKey, null, 6); });

  const settle3way = async (nonce: number, valA: number, valB: number, expected: number) => {
    const marketPda = marketPdaFor(program, fixtureId, nonce);
    const vaultPda = vaultPdaFor(program, marketPda);
    const deadline = new BN(Math.floor(Date.now() / 1000) + 3);
    await program.methods
      .initMarket(fixtureId, nonce, statKeyA, statKeyB, statPeriod, 3, rules, deadline, 0)
      .accounts({ authority: keeper.publicKey, usdcMint, market: marketPda, vault: vaultPda })
      .rpc();
    await new Promise((r) => setTimeout(r, 4000));
    const dummyRoot = Array(32).fill(0);
    const fixtureSummary = { fixtureId, updateStats: { updateCount: 1, minTimestamp: new BN(0), maxTimestamp: new BN(0) }, eventsSubTreeRoot: dummyRoot };
    await program.methods
      .settle(new BN(Math.floor(Date.now() / 1000)), fixtureSummary, [], [], valA, statPeriod, dummyRoot, [],
        { value: valB, period: statPeriod, eventStatRoot: dummyRoot, statProof: [] })
      .accounts({ authority: keeper.publicKey, market: marketPda, dailyScoresMerkleRoots: Keypair.generate().publicKey, txlineProgram: MOCK_TXLINE })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();
    const m = await program.account.market.fetch(marketPda);
    assert.isTrue(m.resolved);
    assert.equal(m.winningOutcome, expected);
  };

  it("P1 win (2-1) -> outcome 1", async () => { await settle3way(11, 2, 1, 1); });
  it("draw (1-1) -> outcome 0", async () => { await settle3way(12, 1, 1, 0); });
  it("P2 win (0-2) -> outcome 2", async () => { await settle3way(13, 0, 2, 2); });
});

describe("verity-worldcup logical (AND) BTTS as a binary market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.VerityWorldcup as Program<VerityWorldcup>;
  const connection = provider.connection;

  const keeper = (provider.wallet as anchor.Wallet).payer;
  const fixtureId = new BN(17952170);
  const statKeyA = 1, statKeyB = 2, statPeriod = 4;
  const LOGIC_AND = 1, GT = 0;
  const rules = [rule(0, LOGIC_AND, 0, GT, 0, GT)];

  let usdcMint: PublicKey;
  before(async () => { usdcMint = await createMint(connection, keeper, keeper.publicKey, null, 6); });

  const settleBtts = async (nonce: number, valA: number, valB: number, expectYes: boolean) => {
    const marketPda = marketPdaFor(program, fixtureId, nonce);
    const vaultPda = vaultPdaFor(program, marketPda);
    const deadline = new BN(Math.floor(Date.now() / 1000) + 3);
    await program.methods
      .initMarket(fixtureId, nonce, statKeyA, statKeyB, statPeriod, 2, rules, deadline, 0)
      .accounts({ authority: keeper.publicKey, usdcMint, market: marketPda, vault: vaultPda })
      .rpc();
    await new Promise((r) => setTimeout(r, 4000));
    const dummyRoot = Array(32).fill(0);
    const fixtureSummary = { fixtureId, updateStats: { updateCount: 1, minTimestamp: new BN(0), maxTimestamp: new BN(0) }, eventsSubTreeRoot: dummyRoot };
    await program.methods
      .settle(new BN(Math.floor(Date.now() / 1000)), fixtureSummary, [], [], valA, statPeriod, dummyRoot, [],
        { value: valB, period: statPeriod, eventStatRoot: dummyRoot, statProof: [] })
      .accounts({ authority: keeper.publicKey, market: marketPda, dailyScoresMerkleRoots: Keypair.generate().publicKey, txlineProgram: MOCK_TXLINE })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();
    const m = await program.account.market.fetch(marketPda);
    assert.equal(m.winningOutcome, expectYes ? 1 : 0);
  };

  it("BTTS YES when both score (1 AND 1)", async () => { await settleBtts(21, 1, 1, true); });
  it("BTTS NO when only one scores (2 AND 0)", async () => { await settleBtts(22, 2, 0, false); });
});
