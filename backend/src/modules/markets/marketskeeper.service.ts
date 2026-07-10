import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
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
        const seq = await this.getLatestScoresSeq(market.txlineFixtureId!)
        if (seq == null) {
          // Fixture has no published scores batch yet; retry next loop.
          continue
        }

        const proof = await this.txlineService.getStatValidation(
          market.txlineFixtureId!,
          seq,
          market.txlineStatKey!,
        )
        // Relational (arithmetic op) and logical (AND/OR) markets both combine
        // a second proven stat; fetch its fresh proof at the same seq.
        const usesSecondStat =
          (market.txlineOp || market.txlineLogic) &&
          market.txlineStatKeyB != null
        const proofB = usesSecondStat
          ? await this.txlineService.getStatValidation(
              market.txlineFixtureId!,
              seq,
              market.txlineStatKeyB!,
            )
          : null
        const result = await this.solanaService.settleMarket(
          market.txlineFixtureId!,
          market.solanaMarketNonce!,
          proof,
          proofB,
        )

        market.solanaSettled = true
        market.solanaResolveTxSig = result.txSig

        if (result.voided) {
          market.status = "voided"
        } else {
          const winningOutcome = result.winningSide === 1 ? "YES" : "NO"
          market.winningOutcomeIndex = result.winningSide === 1 ? 0 : 1
          market.status = "resolved"
          market.resolvedOutcome = winningOutcome
          await market.save()
          await this.pvpService.resolvePvpMatchesForMarket(
            marketId,
            winningOutcome,
          )
        }
        await market.save()

        this.socketGateway.broadcastToRoom("feed", "feed-updated", {})
        this.socketGateway.broadcastToRoom(
          `market:${marketId}`,
          "market-updated",
          { marketId },
        )
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
