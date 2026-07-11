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

export interface OutcomeRule {
  op: number
  logic: number
  threshold: number
  comparison: number
  thresholdB: number
  comparisonB: number
}

export interface CreateWorldCupMarketInput {
  creatorUserId: string
  fixtureId: number
  statKey: number
  /** Second stat key shared by all outcome rules; omit for single-stat. */
  statKeyB?: number
  statPeriod: number
  /** Total outcomes (2 = binary, 3 = match result, …). */
  outcomeCount: number
  /** Predicate per non-default outcome (length outcomeCount - 1). */
  rules: OutcomeRule[]
  /** Outcome labels in on-chain order (index 0 = default bucket). */
  outcomes: string[]
  question: string
  deadlineUnix: number
  feeBps?: number
  /** When part of a PvP slate, the slate's parent market id (links the prop). */
  parentMarketId?: string
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
        // On-chain order: index 0 = default (NO), index 1 = primary (YES).
        yesCondition: input.outcomes[1] ?? "YES",
        noCondition: input.outcomes[0] ?? "NO",
        outcomes: input.outcomes,
        outcomeCount: input.outcomeCount,
        status: "tradable",
        parentMarketId: input.parentMarketId
          ? new Types.ObjectId(input.parentMarketId)
          : null,
        txlineFixtureId: input.fixtureId,
        txlineMatchup: matchup,
        txlineStatKey: input.statKey,
        txlineStatKeyB: input.statKeyB ?? null,
        txlineStatPeriod: input.statPeriod,
        txlineOutcomeCount: input.outcomeCount,
        txlineOutcomeRules: input.rules,
      })

      const pool = await this.solanaService.createMarketPool({
        fixtureId: input.fixtureId,
        statKey: input.statKey,
        statKeyB: input.statKeyB,
        statPeriod: input.statPeriod,
        outcomeCount: input.outcomeCount,
        rules: input.rules,
        deadlineUnix: input.deadlineUnix,
        usdcMint: new PublicKey(usdcMint),
        feeBps: input.feeBps,
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
