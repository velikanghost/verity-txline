import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { Market, MarketDocument } from "./markets.model"
import { SocketGateway } from "../socket/socket.gateway"
import { PvpService } from "../pvp/pvp.service"
import { SolanaService } from "../solana/solana.service"
import { TxlineService } from "../solana/txline.service"

/**
 * Market resolution keeper. Every 30s it settles expired World Cup markets on
 * Solana: fetch a fresh TxLINE Merkle proof, settle on-chain via CPI into
 * `validate_stat`, mirror the outcome into Mongo, and fire the (chain-agnostic)
 * PvP resolution hook.
 */
@Injectable()
export class MarketsKeeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketsKeeperService.name)
  private intervalId: NodeJS.Timeout | null = null
  private isProcessing = false

  constructor(
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
    private readonly socketGateway: SocketGateway,
    private readonly pvpService: PvpService,
    private readonly solanaService: SolanaService,
    private readonly txlineService: TxlineService,
  ) {}

  onModuleInit() {
    this.logger.log("Initializing Market Resolution Keeper...")
    this.intervalId = setInterval(() => this.processExpiredMarkets(), 30000)
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  async processExpiredMarkets() {
    if (this.isProcessing) return
    this.isProcessing = true
    try {
      await this.processSolanaMarkets()
    } catch (error: any) {
      this.logger.error(`Error in keeper loop: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Resolve World Cup markets settled on Solana. For each expired, unsettled
   * Solana market we fetch a fresh TxLINE Merkle proof, settle on-chain via CPI
   * into `validate_stat`, then mirror the outcome into Mongo and fire the PvP
   * resolution hook.
   */
  async processSolanaMarkets() {
    const now = new Date()
    const markets = await this.marketModel.find({
      txlineFixtureId: { $ne: null },
      solanaMarketPda: { $ne: null },
      solanaSettled: false,
      deadline: { $lte: now },
      status: { $nin: ["resolved", "voided"] },
    })

    for (const market of markets) {
      const marketId = market._id.toString()
      try {
        // Markets created by an older program layout (pre-N-outcome redeploy)
        // can't be decoded or settled — mark them stale so they drop out of the
        // active loop instead of erroring every tick.
        if (market.solanaMarketNonce != null) {
          const onchain = await this.solanaService.tryReadPoolState(
            market.txlineFixtureId!,
            market.solanaMarketNonce,
          )
          if (!onchain) {
            market.status = "stale"
            market.solanaSettled = true
            await market.save()
            this.logger.warn(`Marked market ${marketId} stale (incompatible on-chain account)`)
            continue
          }
        }

        const result = await this.settleSolanaMarketDoc(market)
        this.logger.log(
          `[Keeper] Settled Solana market ${marketId} via TxLINE (tx ${result.txSig})`,
        )
      } catch (error: any) {
        this.logger.warn(
          `[Keeper] Solana settle deferred for market ${marketId}: ${error.message}`,
        )
      }
    }
  }

  /**
   * Fetch a fresh TxLINE proof, settle the market on-chain via CPI, and mirror
   * the outcome into Mongo (+ PvP resolution hook). Shared by the keeper loop
   * and the admin force-settle endpoint. Throws if it can't settle yet.
   */
  async settleSolanaMarketDoc(market: MarketDocument): Promise<{
    status: "resolved" | "voided"
    txSig: string
    resolvedOutcome?: string
  }> {
    const marketId = market._id.toString()
    if (market.txlineFixtureId == null || market.solanaMarketNonce == null) {
      throw new BadRequestException("Market is not an on-chain TxLINE market.")
    }

    const seq = await this.getLatestScoresSeq(market.txlineFixtureId)
    if (seq == null) {
      throw new BadRequestException(
        "No published scores batch for this fixture yet — try again once the match has data.",
      )
    }

    const proof = await this.txlineService.getStatValidation(
      market.txlineFixtureId,
      seq,
      market.txlineStatKey!,
    )
    // Any market with a shared second stat (totals, winner, BTTS, 3-way, …)
    // combines a second proven stat; fetch its fresh proof at the same seq.
    const proofB =
      market.txlineStatKeyB != null && market.txlineStatKeyB !== 0
        ? await this.txlineService.getStatValidation(
            market.txlineFixtureId,
            seq,
            market.txlineStatKeyB,
          )
        : null
    const result = await this.solanaService.settleMarket(
      market.txlineFixtureId,
      market.solanaMarketNonce,
      proof,
      proofB,
    )

    market.solanaSettled = true
    market.solanaResolveTxSig = result.txSig

    let resolvedOutcome: string | undefined
    if (result.voided) {
      market.status = "voided"
    } else {
      // Outcomes are stored in on-chain order (index 0 = default), so the
      // winning index maps straight through. Binary falls back to YES/NO.
      const idx = result.winningOutcome
      resolvedOutcome = market.outcomes?.[idx] ?? (idx === 1 ? "YES" : "NO")
      market.winningOutcomeIndex = idx
      market.status = "resolved"
      market.resolvedOutcome = resolvedOutcome
      await market.save()
      await this.pvpService.resolvePvpMatchesForMarket(marketId, resolvedOutcome)
    }
    await market.save()

    this.socketGateway.broadcastToRoom("feed", "feed-updated", {})
    this.socketGateway.broadcastToRoom(`market:${marketId}`, "market-updated", {
      marketId,
    })

    return {
      status: result.voided ? "voided" : "resolved",
      txSig: result.txSig,
      resolvedOutcome,
    }
  }

  /**
   * Admin force-settle: settle a single Solana market now (keeper-miss safety
   * net). Validates the market is still open before settling.
   */
  async forceSettleMarket(marketId: string) {
    const market = await this.marketModel.findById(marketId)
    if (!market) {
      throw new NotFoundException("Market not found.")
    }
    if (market.status === "resolved" || market.status === "voided") {
      throw new BadRequestException("Market is already settled.")
    }
    return this.settleSolanaMarketDoc(market)
  }

  /**
   * Best-effort extraction of the latest scores sequence number for a fixture
   * from the TxLINE scores snapshot. Several likely field shapes are handled.
   */
  private async getLatestScoresSeq(fixtureId: number): Promise<number | null> {
    try {
      const scores: any = await this.txlineService.getScores(fixtureId)
      const seq =
        scores?.seq ??
        scores?.Seq ??
        scores?.latestSeq ??
        scores?.LatestSeq ??
        (Array.isArray(scores) ? scores[scores.length - 1]?.seq : undefined)
      return typeof seq === "number" ? seq : null
    } catch {
      return null
    }
  }
}
