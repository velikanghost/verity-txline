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
  async settleSolanaMarketDoc(
    market: MarketDocument,
    force = false,
  ): Promise<{
    status: "resolved" | "voided"
    txSig: string
    resolvedOutcome?: string
  }> {
    const marketId = market._id.toString()
    if (market.txlineFixtureId == null || market.solanaMarketNonce == null) {
      throw new BadRequestException("Market is not an on-chain TxLINE market.")
    }

    const scores = await this.txlineService.getScores(market.txlineFixtureId)
    if (!scores) {
      throw new BadRequestException("No published scores batch for this fixture yet.")
    }

    let seq: number | null = null
    if (Array.isArray(scores)) {
      let maxSeq: number | null = null
      const provenActions = [
        "goal",
        "yellow_card",
        "red_card",
        "corner",
        "kickoff",
        "halftime_finalised",
        "game_finalised",
        "action_amend",
        "action_discarded",
        "clock_adjustment",
        "lineups",
        "connected",
        "venue",
        "weather",
        "pitch",
        "status",
      ]
      for (const rec of scores) {
        const action = rec?.Action ?? rec?.action
        if (action && !provenActions.includes(action)) {
          continue
        }
        const s = rec?.Seq ?? rec?.seq
        if (typeof s === "number" && (maxSeq === null || s > maxSeq)) {
          maxSeq = s
        }
      }
      seq = maxSeq
    } else {
      const s = (scores as any)?.Seq ?? (scores as any)?.seq ?? (scores as any)?.latestSeq ?? (scores as any)?.LatestSeq
      seq = typeof s === "number" ? s : null
    }

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

    const isFinalised = Array.isArray(scores)
      ? scores.some(
          (rec) => rec?.StatusId === 100 || rec?.Action === "game_finalised",
        )
      : (scores as any)?.StatusId === 100 || (scores as any)?.Action === "game_finalised"

    const latestRecord = Array.isArray(scores)
      ? scores[scores.length - 1]
      : (scores as any)
    const statusId = latestRecord?.StatusId ?? latestRecord?.statusId

    const isFirstHalfMarket =
      (market.txlineStatKey != null && market.txlineStatKey >= 1000 && market.txlineStatKey < 2000) ||
      (market.txlineStatKeyB != null && market.txlineStatKeyB >= 1000 && market.txlineStatKeyB < 2000)

    const isFirstHalfFinished = typeof statusId === "number" && statusId >= 3

    let canSettle = isFinalised || (isFirstHalfMarket && isFirstHalfFinished) || force


    if (!canSettle) {
      // Check if any outcome rule is already guaranteed to be met (early satisfaction)
      const rules = market.txlineOutcomeRules || []
      const valA = proof.statValue
      const valB = proofB ? proofB.statValue : 0

      let guaranteed = false
      for (const rule of rules) {
        if (isWinningOutcomeGuaranteed(rule as any, valA, valB)) {
          guaranteed = true
          break
        }
      }
      canSettle = guaranteed
    }

    if (!canSettle) {
      throw new BadRequestException(
        "Match is not finalised yet and the winning outcome is not guaranteed.",
      )
    }

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
    return this.settleSolanaMarketDoc(market, true)
  }
}

/**
 * Evaluates whether a market's outcome rule is already mathematically guaranteed to be met.
 * Only monotonic operators/comparisons (like goals, corners, cards only increasing) are supported.
 */
function isWinningOutcomeGuaranteed(
  rule: {
    op: number
    logic: number
    threshold: number
    comparison: number
    thresholdB: number
    comparisonB: number
  },
  valA: number,
  valB: number,
): boolean {
  const CMP_GT = 0
  const OP_ADD = 1
  const OP_NONE = 0
  const LOGIC_AND = 1
  const LOGIC_OR = 2

  const compare = (val: number, cmp: number, thr: number) => {
    if (cmp === 0) return val > thr // CMP_GT
    if (cmp === 1) return val < thr // CMP_LT
    if (cmp === 2) return val === thr // CMP_EQ
    return false
  }

  let left = valA
  if (rule.logic === 0) {
    if (rule.op === 1) { // OP_ADD
      left = valA + valB
    } else if (rule.op === 2) { // OP_SUBTRACT
      left = valA - valB
    }
  }

  const boolA = compare(valA, rule.comparison, rule.threshold)
  const boolB = compare(valB, rule.comparisonB, rule.thresholdB)

  const currentlyMet =
    rule.logic === 0
      ? compare(left, rule.comparison, rule.threshold)
      : rule.logic === 1
        ? boolA && boolB
        : boolA || boolB

  if (!currentlyMet) {
    return false
  }

  // Check if it is guaranteed to stay met (monotonic stats only increase)
  if (rule.logic === 0) {
    const isMonotonicOp = rule.op === OP_ADD || rule.op === OP_NONE
    const isMonotonicCmp = rule.comparison === CMP_GT
    return isMonotonicOp && isMonotonicCmp
  } else if (rule.logic === LOGIC_AND || rule.logic === LOGIC_OR) {
    return rule.comparison === CMP_GT && rule.comparisonB === CMP_GT
  }

  return false
}

