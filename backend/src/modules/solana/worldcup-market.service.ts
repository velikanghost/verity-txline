import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import { PublicKey } from "@solana/web3.js"
import { Market, MarketDocument } from "../markets/markets.model"
import { Post, PostDocument } from "../posts/posts.model"
import { TxlineFixture, TxlineFixtureDocument } from "./fixtures.model"
import { SolanaService } from "./solana.service"
import { TxlineService } from "./txline.service"

export interface CreateWorldCupMarketInput {
  creatorUserId: string
  /** Creator's Solana wallet — receives the creator royalty. Falls back to the keeper. */
  creatorWallet?: string | null
  fixtureId: number
  statKey: number
  /** Second stat key for relational markets; omit/undefined for single-stat. */
  statKeyB?: number
  /** Arithmetic combine op: 0 none, 1 Add, 2 Subtract. */
  op?: number
  /** Logical combine mode: 0 none, 1 AND, 2 OR (two predicates). */
  logic?: number
  statPeriod: number
  threshold: number
  comparison: number // 0 GT, 1 LT, 2 EQ
  /** Predicate B threshold/comparison (logical mode only). */
  thresholdB?: number
  comparisonB?: number
  question: string
  deadlineUnix: number
  yesCondition?: string
  noCondition?: string
  feeBps?: number
  creatorFeeShareBps?: number
  lpFeeShareBps?: number
}

/**
 * Creates a World Cup prop market: a market Post, a child Market document with
 * its TxLINE resolution rule, and the matching on-chain parimutuel pool. Rolls
 * back the Mongo docs if the on-chain pool creation fails, mirroring the
 * rollback discipline of the existing PvP event creation flow.
 */
@Injectable()
export class WorldCupMarketService {
  private readonly logger = new Logger(WorldCupMarketService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly solanaService: SolanaService,
    private readonly txlineService: TxlineService,
    @InjectModel(Market.name) private readonly marketModel: Model<MarketDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(TxlineFixture.name)
    private readonly fixtureModel: Model<TxlineFixtureDocument>,
  ) {}

  /**
   * Resolve a fixture's "TeamA vs TeamB" label. Prefers the cached fixture, then
   * a live TxLINE snapshot lookup, so we never silently fall back to a raw id.
   */
  private async resolveMatchup(fixtureId: number): Promise<string | null> {
    const cached = await this.fixtureModel.findOne({ fixtureId })
    if (cached) return `${cached.participant1} vs ${cached.participant2}`
    try {
      const fixtures = await this.txlineService.getFixtures()
      const f = fixtures.find((x) => x.FixtureId === fixtureId)
      if (f) return `${f.Participant1} vs ${f.Participant2}`
    } catch (e: any) {
      this.logger.warn(`Live matchup lookup failed for ${fixtureId}: ${e?.message}`)
    }
    return null
  }

  async createMarket(input: CreateWorldCupMarketInput): Promise<MarketDocument> {
    const keeper = this.solanaService.keeperAddress
    if (!keeper) {
      throw new BadRequestException("Solana keeper is not configured.")
    }
    const usdcMint = this.configService.get<string>("SOLANA_USDC_MINT")
    if (!usdcMint) {
      throw new BadRequestException("SOLANA_USDC_MINT is not configured.")
    }

    const authorId = new Types.ObjectId(input.creatorUserId)
    // Route the creator royalty to the creator's own wallet when available.
    const creatorPubkey = input.creatorWallet || keeper
    const matchup = await this.resolveMatchup(input.fixtureId)
    const matchupLabel = matchup ?? `Fixture ${input.fixtureId}`

    const post = await this.postModel.create({
      authorId,
      type: "market",
      content: `${matchupLabel} — ${input.question}`,
    })

    let market: MarketDocument | null = null
    try {
      market = await this.marketModel.create({
        postId: post._id,
        authorId,
        question: input.question,
        category: "worldcup",
        marketType: "child",
        deadline: new Date(input.deadlineUnix * 1000),
        resolutionSource: "TxLINE",
        yesCondition: input.yesCondition ?? "Condition met",
        noCondition: input.noCondition ?? "Condition not met",
        outcomes: ["YES", "NO"],
        outcomeCount: 2,
        status: "tradable",
        txlineFixtureId: input.fixtureId,
        txlineMatchup: matchup,
        txlineStatKey: input.statKey,
        txlineStatKeyB: input.statKeyB ?? null,
        txlineOp: input.op ?? 0,
        txlineLogic: input.logic ?? 0,
        txlineStatPeriod: input.statPeriod,
        txlineThreshold: input.threshold,
        txlineComparison: input.comparison,
        txlineThresholdB: input.thresholdB ?? null,
        txlineComparisonB: input.comparisonB ?? null,
      })

      const pool = await this.solanaService.createMarketPool({
        fixtureId: input.fixtureId,
        statKey: input.statKey,
        statKeyB: input.statKeyB,
        op: input.op,
        logic: input.logic,
        statPeriod: input.statPeriod,
        threshold: input.threshold,
        comparison: input.comparison,
        thresholdB: input.thresholdB,
        comparisonB: input.comparisonB,
        deadlineUnix: input.deadlineUnix,
        creator: new PublicKey(creatorPubkey),
        usdcMint: new PublicKey(usdcMint),
        feeBps: input.feeBps,
        creatorFeeShareBps: input.creatorFeeShareBps,
        lpFeeShareBps: input.lpFeeShareBps,
      })

      market.solanaMarketNonce = pool.nonce
      market.solanaMarketPda = pool.marketPda
      market.solanaVaultPda = pool.vaultPda
      market.solanaCreateTxSig = pool.txSig
      await market.save()

      this.logger.log(
        `Created World Cup market ${market._id} (pool ${pool.marketPda})`,
      )
      return market
    } catch (error: any) {
      // Roll back Mongo docs so a failed pool-init doesn't orphan them.
      if (market) await this.marketModel.findByIdAndDelete(market._id)
      await this.postModel.findByIdAndDelete(post._id)
      this.logger.error(`World Cup market creation failed: ${error.message}`)
      throw new BadRequestException(
        `World Cup market creation failed: ${error.message}`,
      )
    }
  }
}
