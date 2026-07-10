import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import {
  PvpTicket,
  PvpTicketDocument,
  PvpMatch,
  PvpMatchDocument,
} from "./pvp.model"
import { User, UserDocument } from "../users/users.model"
import {
  Market,
  MarketDocument,
  MarketPosition,
  MarketPositionDocument,
  MarketTrade,
  MarketTradeDocument,
} from "../markets/markets.model"
import { Post, PostDocument } from "../posts/posts.model"
import { SocketGateway } from "../socket/socket.gateway"
import { NotificationsService } from "../notifications/notifications.service"
import { CreatePvpEventDto, SubmitTicketDto } from "./pvp.dto"
import { SolanaService } from "../solana/solana.service"
import { calculatePvpResultXp, calculatePvpScore } from "./pvp-scoring"
import type { PvpResult } from "./pvp-scoring"
import { ConfigService } from "@nestjs/config"
import { CouponsService } from "../coupons/coupons.service"

export const BOT_PROFILES = [
  { username: "alex_g", displayName: "Alex Green" },
  { username: "charlie_k", displayName: "Charlie King" },
  { username: "sam_smith", displayName: "Sam Smith" },
  { username: "jordan_d", displayName: "Jordan Davis" },
  { username: "taylor_m", displayName: "Taylor Miller" },
  { username: "morgan_p", displayName: "Morgan Perry" },
  { username: "casey_r", displayName: "Casey Reed" },
  { username: "jamie_b", displayName: "Jamie Bell" },
  { username: "skyler_w", displayName: "Skyler White" },
  { username: "riley_h", displayName: "Riley Hall" },
  { username: "rowan_f", displayName: "Rowan Foster" },
  { username: "harper_c", displayName: "Harper Cole" },
  { username: "quinn_l", displayName: "Quinn Lane" },
  { username: "finley_t", displayName: "Finley Taylor" },
  { username: "avery_s", displayName: "Avery Stone" },
  { username: "reese_v", displayName: "Reese Vance" },
  { username: "hayden_p", displayName: "Hayden Pratt" },
  { username: "dylan_y", displayName: "Dylan Yates" },
  { username: "parker_n", displayName: "Parker Nash" },
  { username: "logan_x", displayName: "Logan Cruz" },
]

/**
 * TxLINE full-match base stat keys (reverse-engineered from the live
 * stat-validation endpoint): odd = Participant 1, even = Participant 2.
 */
const P1_GOALS = 1
const P2_GOALS = 2
const P1_YELLOW = 3
const P2_YELLOW = 4
const P1_RED = 5
const P2_RED = 6
const P1_CORNERS = 7
const P2_CORNERS = 8

// Combine ops (must match the on-chain `op` codes).
const OP_NONE = 0
const OP_ADD = 1
const OP_SUBTRACT = 2

// Logical combine modes (must match the on-chain `logic` codes).
const LOGIC_NONE = 0
const LOGIC_AND = 1

// Comparison codes.
const CMP_GT = 0
const CMP_EQ = 2

export interface StatConfig {
  statKey: number
  statKeyB: number // 0 when single-stat
  op: number // 0 none, 1 Add, 2 Subtract (arithmetic combine)
  logic: number // 0 none, 1 AND, 2 OR (logical combine of two predicates)
  statPeriod: number
  threshold: number
  comparison: number
  thresholdB: number // predicate B (logical mode only)
  comparisonB: number
}

/**
 * Map a PvP prop group to a TxLINE-provable settlement config, or `null` when
 * TxLINE cannot prove it (so the market is dropped rather than settled wrongly).
 *
 * TxLINE proves only per-participant Goals/YellowCards/RedCards/Corners as
 * numbers, combined arithmetically (Add/Subtract) — there is no logical AND and
 * no offsides/fouls/first-goal-scorer stat. So:
 *  - `totals`/`goals`/`corners`/`cards` → sum both participants (Add).
 *  - `spread` → participant goal difference (Subtract).
 *  - `clean_sheet` → opponent goals == 0 (single stat).
 *  - `red_card` → total red cards > 0 (Add).
 *  - `btts` → (P1 goals > 0) AND (P2 goals > 0) — two predicates combined by
 *    the on-chain logical-AND settle path.
 *  - `offsides`/`fouls_leader`/`first_goal` (no stat), `major`/`halftime_leader`/
 *    `extra_time_penalties` (3-way, not binary) → null.
 */
/** A config needs a second stat proof when it combines two stats (op or logic). */
export function usesSecondStat(stat: StatConfig): boolean {
  return stat.op !== 0 || stat.logic !== 0
}

export function deriveStatConfig(
  optionGroup: string,
  handicap: number | null,
): StatConfig | null {
  const t = (fallback: number) =>
    handicap != null ? Math.round(handicap) : fallback
  // Arithmetic base config; callers override the combine mode as needed.
  const cfg = (over: Partial<StatConfig>): StatConfig => ({
    statKey: 0,
    statKeyB: 0,
    op: OP_NONE,
    logic: LOGIC_NONE,
    statPeriod: 0,
    threshold: 0,
    comparison: CMP_GT,
    thresholdB: 0,
    comparisonB: CMP_GT,
    ...over,
  })
  const total = (a: number, b: number, threshold: number): StatConfig =>
    cfg({ statKey: a, statKeyB: b, op: OP_ADD, threshold })

  switch (optionGroup) {
    case "totals":
    case "goals":
      return total(P1_GOALS, P2_GOALS, t(2))
    case "corners":
      return total(P1_CORNERS, P2_CORNERS, t(9))
    case "cards":
    case "yellow_cards":
      return total(P1_YELLOW, P2_YELLOW, t(3))
    case "red_card":
      // Any red card in the match: total reds > 0.
      return total(P1_RED, P2_RED, 0)
    case "spread":
      // Participant 1 covers the handicap: (P1 goals - P2 goals) > line.
      return cfg({
        statKey: P1_GOALS,
        statKeyB: P2_GOALS,
        op: OP_SUBTRACT,
        threshold: t(0),
      })
    case "clean_sheet":
      // Participant 1 keeps a clean sheet: P2 goals == 0 (single stat).
      return cfg({ statKey: P2_GOALS, threshold: 0, comparison: CMP_EQ })
    case "btts":
      // Both teams to score: (P1 goals > 0) AND (P2 goals > 0).
      return cfg({
        statKey: P1_GOALS,
        statKeyB: P2_GOALS,
        logic: LOGIC_AND,
        threshold: 0,
        comparison: CMP_GT,
        thresholdB: 0,
        comparisonB: CMP_GT,
      })
    default:
      // major, halftime_leader, extra_time_penalties (3-way, not binary),
      // offsides / fouls_leader / first_goal (no TxLINE stat).
      return null
  }
}

export function determineOptionGroup(
  optionName: string,
  teamA: string,
  teamB: string,
): string {
  const name = optionName.toLowerCase().trim()
  const tA = teamA.toLowerCase().trim()
  const tB = teamB.toLowerCase().trim()

  if (
    name.includes("wins the match") ||
    name.includes("ends in a draw") ||
    name === `${tA} wins` ||
    name === `${tB} wins` ||
    name === "draw"
  ) {
    return "major"
  }

  if (
    name.includes("scores first goal") ||
    name.includes("first goal") ||
    name.includes("scores first") ||
    name === "no goal in the match" ||
    name === "no goal"
  ) {
    return "first_goal"
  }

  if (name.includes("leads at halftime") || name.includes("halftime")) {
    return "halftime_leader"
  }

  if (name.includes("keeps a clean sheet") || name.includes("clean sheet")) {
    return "clean_sheet"
  }

  if (
    name.includes("commits more fouls") ||
    name.includes("fouls") ||
    name.includes("foul")
  ) {
    return "fouls_leader"
  }

  if (name.includes("red card") || name.includes("red cards")) {
    return "red_card"
  }

  if (
    name.includes("yellow card") ||
    name.includes("yellow cards") ||
    name.includes("card") ||
    name.includes("cards")
  ) {
    return "yellow_cards"
  }

  if (name.includes("corner") || name.includes("corners")) {
    return "corners"
  }

  if (name.includes("goals") || name.includes("goal")) {
    return "goals"
  }

  if (
    name.includes("both teams to score") ||
    name.includes("both teams score") ||
    name.includes("btts")
  ) {
    return "btts"
  }

  if (name.includes("offsides") || name.includes("offside")) {
    return "offsides"
  }

  if (
    name.includes("on penalties") ||
    name.includes("penalty shootout") ||
    name.includes("wins shootout") ||
    name.includes("no penalties") ||
    name.includes("decided in extra time")
  ) {
    return "extra_time_penalties"
  }

  return `unique_${optionName.replace(/\s+/g, "_").toLowerCase()}`
}

@Injectable()
export class PvpService {
  private readonly logger = new Logger(PvpService.name)
  private readonly lastSyncMap = new Map<string, number>()

  clearSyncCache(userId: string, parentMarketId?: string) {
    if (parentMarketId) {
      this.lastSyncMap.delete(`${userId}:${parentMarketId}`)
    } else {
      for (const key of this.lastSyncMap.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.lastSyncMap.delete(key)
        }
      }
    }
  }

  private getRankTier(xp: number): number {
    if (xp < 500) return 1 // Bronze
    if (xp < 1500) return 2 // Silver
    if (xp < 3000) return 3 // Gold
    return 4 // Platinum
  }

  async getTop10UserIds(): Promise<Set<string>> {
    const top10Query = this.userModel.find({ isOnboarded: true })
    let top10Users: any[] = []
    if (typeof top10Query.sort === "function") {
      top10Users = await top10Query
        .sort({ arenaXp: -1 })
        .limit(10)
        .select("_id")
        .lean()
    } else {
      const res = await top10Query
      top10Users = Array.isArray(res) ? res : []
    }
    return new Set(top10Users.map((u: any) => u._id.toString()))
  }

  constructor(
    @InjectModel(PvpTicket.name)
    private pvpTicketModel: Model<PvpTicketDocument>,
    @InjectModel(PvpMatch.name) private pvpMatchModel: Model<PvpMatchDocument>,
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
    @InjectModel(MarketPosition.name)
    private marketPositionModel: Model<MarketPositionDocument>,
    @InjectModel(MarketTrade.name)
    private marketTradeModel: Model<MarketTradeDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly socketGateway: SocketGateway,
    private readonly notificationsService: NotificationsService,
    private readonly solanaService: SolanaService,
    private readonly configService: ConfigService,
    private readonly couponsService: CouponsService,
  ) {}

  async createPvpEvent(adminId: string, dto: CreatePvpEventDto) {
    const admin = await this.userModel.findById(adminId)
    if (!admin || admin.role !== "admin") {
      throw new ForbiddenException("Only admins can create PvP events.")
    }

    // Parse teamA and teamB from the question (e.g. "Mexico vs Southafrica")
    let teamA = "YES"
    let teamB = "NO"
    const question = dto.question.trim()
    const vsMatch = question.match(/(.+?)\s+vs\.?\s+(.+)/i)
    if (vsMatch) {
      teamA = vsMatch[1].trim()
      teamB = vsMatch[2].trim()
    } else {
      const dashMatch = question.match(/(.+?)\s+-\s+(.+)/)
      if (dashMatch) {
        teamA = dashMatch[1].trim()
        teamB = dashMatch[2].trim()
      }
    }

    // The market creator on-chain: the admin's Solana wallet (falls back to
    // the keeper inside SolanaService when absent).
    const creatorWallet = admin.solanaWalletAddress || null

    let post: PostDocument | null = null
    let parentMarket: MarketDocument | null = null
    const childMarketIds: Types.ObjectId[] = []

    try {
      const childMarkets: MarketDocument[] = []
      const deadlineUnix = Math.floor(new Date(dto.deadline).getTime() / 1000)
      const now = new Date()
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const fundingDeadline =
        new Date(dto.deadline) < sevenDaysFromNow
          ? new Date(dto.deadline)
          : sevenDaysFromNow
      const fundingDeadlineUnix = Math.floor(fundingDeadline.getTime() / 1000)

      // Option grouping is fully deterministic (determineOptionGroup below);
      // the removed LLM categorizer was only a fallback.
      const optionGroupsMap: Record<string, string> = {}

      // Map option groups to their clean names (and make sure match_winner/moneyline becomes major)
      const cleanGroupsMap: Record<string, string> = {}
      for (const [opt, grp] of Object.entries(optionGroupsMap)) {
        cleanGroupsMap[opt] =
          grp === "match_winner" || grp === "moneyline" ? "major" : grp
      }

      const groups: Record<string, string[]> = {}
      for (let i = 0; i < dto.options.length; i++) {
        const optionName = dto.options[i]
        let optionGroup = determineOptionGroup(optionName, teamA, teamB)
        if (optionGroup.startsWith("unique_")) {
          // If our deterministic check did not find a standard group, fall back to AI categorization
          optionGroup = cleanGroupsMap[optionName] || optionGroup
        }
        if (optionGroup === "match_winner" || optionGroup === "moneyline") {
          optionGroup = "major"
        }
        if (!groups[optionGroup]) {
          groups[optionGroup] = []
        }
        groups[optionGroup].push(optionName)
      }

      // We will loop over each option group to register and fund them on-chain first
      const deployedMarkets: Array<{
        childMarketId: Types.ObjectId
        questionSuffix: string
        optionName: string
        outcomes: string[]
        handicap: number | null
        optionGroup: string
        outcomeCount: number
      }> = []

      const lockTime = dto.lockTime
        ? new Date(dto.lockTime)
        : new Date(dto.deadline)

      for (const [optionGroup, groupOptions] of Object.entries(groups)) {
        const outcomeCount = groupOptions.length === 1 ? 2 : groupOptions.length

        // Formulate question and optionName
        let questionSuffix = ""
        let optionName = ""
        if (optionGroup === "major") {
          questionSuffix = "Major"
          optionName = "Major"
        } else if (optionGroup === "spread") {
          questionSuffix = "Spread"
          optionName = "Spread"
        } else if (optionGroup === "totals") {
          questionSuffix = "Totals"
          optionName = "Totals"
        } else if (optionGroup === "btts") {
          questionSuffix = "BTTS"
          optionName = "BTTS"
        } else if (optionGroup === "offsides") {
          questionSuffix = "Offsides"
          optionName = "Offsides"
        } else if (optionGroup === "extra_time_penalties") {
          questionSuffix = "Extra Time / Penalties Winner"
          optionName = "Extra Time / Penalties"
        } else {
          const capitalized = optionGroup
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
          questionSuffix = capitalized
          optionName = capitalized
        }

        // Determine handicap if applicable
        let handicap: number | null = null
        if (
          optionGroup === "spread" ||
          optionGroup === "totals" ||
          optionGroup === "offsides" ||
          optionGroup === "yellow_cards" ||
          optionGroup === "cards"
        ) {
          // Try to extract from the first option containing a number
          for (const opt of groupOptions) {
            const numMatch = opt.match(/([+-]?\d+(?:\.\d+)?)/)
            if (numMatch) {
              handicap = Math.abs(parseFloat(numMatch[1]))
              break
            }
          }
        }

        // When this event is anchored to a real fixture, drop any prop TxLINE
        // cannot trustlessly settle (3-way winner, BTTS, offsides, fouls,
        // first-goal, …) so we never create a market we can't resolve.
        if (
          dto.fixtureId != null &&
          deriveStatConfig(optionGroup, handicap) == null
        ) {
          this.logger.warn(
            `Skipping unsettleable PvP prop "${optionGroup}" for fixture ${dto.fixtureId}`,
          )
          continue
        }

        // Generate clean outcomes (e.g. for Major, draw or win team names)
        const outcomes =
          groupOptions.length === 1
            ? [groupOptions[0].trim(), "NO"]
            : groupOptions.map((opt) => opt.trim())

        const childMarketId = new Types.ObjectId()
        childMarketIds.push(childMarketId)

        deployedMarkets.push({
          childMarketId,
          questionSuffix,
          optionName,
          outcomes,
          handicap,
          optionGroup,
          outcomeCount,
        })
      }

      // 4. All on-chain transactions succeeded! Write everything to MongoDB.
      const postId = new Types.ObjectId()
      const parentMarketId = new Types.ObjectId()

      // Create Post
      post = await this.postModel.create({
        _id: postId,
        authorId: new Types.ObjectId(adminId),
        type: "market",
        content: dto.question.trim(),
      })

      // Create Parent Market
      parentMarket = await this.marketModel.create({
        _id: parentMarketId,
        postId: postId,
        authorId: new Types.ObjectId(adminId),
        question: dto.question.trim(),
        category: "pvp",
        deadline: new Date(dto.deadline),
        lockTime,
        resolutionSource: dto.resolutionSource.trim(),
        yesCondition: teamA,
        noCondition: teamB,
        status: "tradable",
        marketType: "parent",
      })

      // Create Child Markets in DB, each backed by an on-chain Solana pool
      // that settles via TxLINE. Requires a fixtureId on the event.
      for (const item of deployedMarkets) {
        const hasFixture = dto.fixtureId != null
        // Unsettleable groups were already filtered out above when a fixture is
        // set, so a config is guaranteed here for the on-chain path.
        const stat = hasFixture
          ? deriveStatConfig(item.optionGroup, item.handicap)
          : null

        const child = await this.marketModel.create({
          _id: item.childMarketId,
          postId: postId,
          authorId: new Types.ObjectId(adminId),
          question: `${dto.question.trim()} - ${item.questionSuffix}`,
          category: "pvp",
          deadline: new Date(dto.deadline),
          lockTime,
          resolutionSource: dto.resolutionSource.trim(),
          yesCondition: item.outcomes[0] || "YES",
          noCondition: item.outcomes[1] || "NO",
          status: hasFixture ? "tradable" : "funding_pool",
          marketType: "child",
          parentMarketId: parentMarketId,
          optionName: item.optionName,
          teamName: teamA, // Keep teamA as primary associated team
          optionGroup: item.optionGroup,
          outcomeCount: item.outcomeCount,
          outcomes: item.outcomes,
          handicap: item.handicap,
          txlineFixtureId: hasFixture ? dto.fixtureId : null,
          txlineMatchup: hasFixture ? `${teamA} vs ${teamB}` : null,
          txlineStatKey: stat ? stat.statKey : null,
          txlineStatKeyB: stat && usesSecondStat(stat) ? stat.statKeyB : null,
          txlineOp: stat ? stat.op : 0,
          txlineLogic: stat ? stat.logic : 0,
          txlineStatPeriod: stat ? stat.statPeriod : null,
          txlineThreshold: stat ? stat.threshold : null,
          txlineComparison: stat ? stat.comparison : null,
          txlineThresholdB: stat && stat.logic !== 0 ? stat.thresholdB : null,
          txlineComparisonB: stat && stat.logic !== 0 ? stat.comparisonB : null,
        })

        // Deploy the on-chain parimutuel pool for this prop.
        if (hasFixture && stat) {
          const pool = await this.solanaService.createMarketPoolFor({
            fixtureId: dto.fixtureId!,
            statKey: stat.statKey,
            statKeyB: usesSecondStat(stat) ? stat.statKeyB : undefined,
            op: stat.op,
            logic: stat.logic,
            statPeriod: stat.statPeriod,
            threshold: stat.threshold,
            comparison: stat.comparison,
            thresholdB: stat.logic !== 0 ? stat.thresholdB : undefined,
            comparisonB: stat.logic !== 0 ? stat.comparisonB : undefined,
            deadlineUnix,
            creatorWallet,
          })
          child.solanaMarketNonce = pool.nonce
          child.solanaMarketPda = pool.marketPda
          child.solanaVaultPda = pool.vaultPda
          child.solanaCreateTxSig = pool.txSig
          await child.save()
        }

        childMarkets.push(child)
      }

      this.logger.log(
        `Admin ${adminId} successfully deployed PvP Event: ${parentMarket._id} with ${childMarkets.length} child options and pre-deposited USDC.`,
      )

      // Broadcast updates
      this.socketGateway.broadcastToRoom("feed", "feed-updated", {})

      return {
        parentMarketId: parentMarket._id.toString(),
        question: parentMarket.question,
        childMarkets: childMarkets.map((c) => ({
          id: c._id.toString(),
          optionName: c.optionName,
          status: c.status,
        })),
      }
    } catch (error) {
      this.logger.error(
        `Failed to deploy PvP Event. Rolling back created database documents: ${error.message}`,
      )

      // Rollback child market docs. Any on-chain pool already deployed is left
      // as-is (harmless orphan on devnet); the Mongo docs are removed.
      for (const childId of childMarketIds) {
        try {
          const res = await this.marketModel.findByIdAndDelete(childId)
          this.logger.log(
            `Rollback: Deleted child market ${childId}. Result: ${JSON.stringify(res)}`,
          )
        } catch (dbErr) {
          this.logger.error(
            `Rollback error deleting child market ${childId}: ${dbErr.message}`,
          )
        }
      }

      // Rollback parent market
      if (parentMarket) {
        try {
          const res = await this.marketModel.findByIdAndDelete(parentMarket._id)
          this.logger.log(
            `Rollback: Deleted parent market ${parentMarket._id}. Result: ${JSON.stringify(res)}`,
          )
        } catch (dbErr) {
          this.logger.error(
            `Rollback error deleting parent market ${parentMarket._id}: ${dbErr.message}`,
          )
        }
      }

      // Rollback post
      if (post) {
        try {
          const res = await this.postModel.findByIdAndDelete(post._id)
          this.logger.log(
            `Rollback: Deleted post ${post._id}. Result: ${JSON.stringify(res)}`,
          )
        } catch (dbErr) {
          this.logger.error(
            `Rollback error deleting post ${post._id}: ${dbErr.message}`,
          )
        }
      }

      throw error
    }
  }

  async lockPvpEvent(adminId: string, parentMarketId: string) {
    const admin = await this.userModel.findById(adminId)
    if (!admin || admin.role !== "admin") {
      throw new ForbiddenException("Only admins can lock PvP events.")
    }

    const parent = await this.marketModel.findById(parentMarketId)
    if (
      !parent ||
      parent.marketType !== "parent" ||
      parent.category !== "pvp"
    ) {
      throw new NotFoundException("PvP Event not found.")
    }

    parent.status = "closed"
    await parent.save()

    const childMarkets = await this.marketModel.find({
      parentMarketId: parent._id,
      marketType: "child",
    })

    for (const child of childMarkets) {
      child.status = "closed"
      await child.save()
    }

    await this.matchRemainingTicketsWithBot(parentMarketId)

    this.logger.log(
      `Admin ${adminId} successfully locked PvP Event: ${parentMarketId}`,
    )

    this.socketGateway.broadcastToRoom("feed", "feed-updated", {})
    return { success: true }
  }

  async matchRemainingTicketsWithBot(parentMarketId: string) {
    const queuedTickets = await this.pvpTicketModel.find({
      parentMarketId: new Types.ObjectId(parentMarketId),
      status: "queued",
    })

    if (queuedTickets.length === 0) {
      return
    }

    const childMarkets = await this.marketModel.find({
      parentMarketId: new Types.ObjectId(parentMarketId),
      marketType: "child",
    })

    for (const ticket of queuedTickets) {
      const profile =
        BOT_PROFILES[Math.floor(Math.random() * BOT_PROFILES.length)]

      let botUser = await this.userModel.findOne({ username: profile.username })
      if (!botUser) {
        botUser = await this.userModel.create({
          username: profile.username,
          displayName: profile.displayName,
          role: "user",
          isOnboarded: true,
          avatarUrl: null,
        })
      }

      const botPicks: any[] = []
      for (const userPick of ticket.picks) {
        const child = childMarkets.find(
          (c) => c._id.toString() === userPick.marketId.toString(),
        )
        if (!child) continue

        let selection = ""
        if (child.outcomeCount && child.outcomeCount > 2) {
          const outcomes =
            child.outcomes && child.outcomes.length > 0
              ? child.outcomes
              : ["YES", "NO"]
          selection = outcomes[Math.floor(Math.random() * outcomes.length)]
        } else {
          selection = Math.random() < 0.5 ? "YES" : "NO"
        }

        botPicks.push({
          marketId: child._id,
          selection,
          isCorrect: null,
        })
      }

      const botTicket = await this.pvpTicketModel.create({
        userId: botUser._id,
        parentMarketId: ticket.parentMarketId,
        picks: botPicks,
        status: "matched",
        doubleBoostActive: false,
      })

      let divergence = 0
      for (const pick of ticket.picks) {
        const botPick = botPicks.find(
          (p) => p.marketId.toString() === pick.marketId.toString(),
        )
        if (botPick && botPick.selection !== pick.selection) {
          divergence += 1
        }
      }

      const match = await this.pvpMatchModel.create({
        parentMarketId: ticket.parentMarketId,
        ticket1Id: ticket._id,
        ticket2Id: botTicket._id,
        user1Id: ticket.userId,
        user2Id: botUser._id,
        divergenceScore: divergence,
        status: "matched",
      })

      ticket.status = "matched"
      ticket.matchId = match._id
      ticket.opponentTicketId = botTicket._id
      await ticket.save()

      botTicket.matchId = match._id
      botTicket.opponentTicketId = ticket._id
      await botTicket.save()

      this.clearSyncCache(ticket.userId.toString(), parentMarketId)

      this.socketGateway.broadcastToRoom(
        `user:${ticket.userId.toString()}`,
        "pvp-matched",
        { matchId: match._id.toString() },
      )

      await this.notificationsService.createNotification(
        ticket.userId.toString(),
        botUser._id.toString(),
        "pvp_matched",
        "PvP Arena Opponent Found!",
        `You've been matched against @${botUser.username} for the event with a selection divergence of ${divergence} picks.`,
        match._id.toString(),
      )

      this.logger.log(
        `Matched unmatched ticket ${ticket._id} with bot ticket ${botTicket._id} inside match: ${match._id}`,
      )

      // Cascade resolved states for already resolved child markets
      for (const child of childMarkets) {
        if (child.status === "resolved" || child.resolvedOutcome) {
          const outcome =
            child.resolvedOutcome ||
            (child.winningOutcomeIndex === 0 ? "YES" : "NO")
          await this.resolvePvpMatchesForMarket(child._id.toString(), outcome)
        }
      }
    }
  }

  async getActiveEvents() {
    const parents = await this.marketModel
      .find({
        category: "pvp",
        marketType: "parent",
        status: { $ne: "resolved" },
      })
      .sort({ deadline: 1 })

    if (parents.length === 0) return []

    const parentIds = parents.map((p) => p._id)

    // 1. Fetch all children in one query
    const allChildren = await this.marketModel.find({
      parentMarketId: { $in: parentIds },
      marketType: "child",
    })

    // Group children by parentMarketId
    const childrenMap = new Map<string, any[]>()
    for (const child of allChildren) {
      if (child.parentMarketId) {
        const pidStr = child.parentMarketId.toString()
        if (!childrenMap.has(pidStr)) {
          childrenMap.set(pidStr, [])
        }
        childrenMap.get(pidStr)!.push(child)
      }
    }

    // 2. Compute trade volume per child market via aggregation (avoids loading all trade docs)
    const allChildIds = allChildren.map((c) => c._id)
    const volumeAgg = await this.marketTradeModel.aggregate([
      { $match: { marketId: { $in: allChildIds } } },
      { $group: { _id: "$marketId", totalVolume: { $sum: "$amountUsdc" } } },
    ])
    const volumeMap = new Map<string, number>()
    for (const v of volumeAgg) {
      volumeMap.set(v._id.toString(), v.totalVolume)
    }

    // 3. Construct the response
    const result: any[] = []
    for (const parent of parents) {
      const pidStr = parent._id.toString()
      const children = childrenMap.get(pidStr) || []

      result.push({
        id: pidStr,
        question: parent.question,
        deadline: parent.deadline,
        lockTime: parent.lockTime,
        status: parent.status,
        createdAt: parent.createdAt,
        resolutionSource: parent.resolutionSource,
        yesCondition: parent.yesCondition,
        noCondition: parent.noCondition,
        options: children.map((c) => ({
          id: c._id.toString(),
          optionName: c.optionName,
          status: c.status,
          usdcYesAmount: c.usdcYesAmount,
          usdcNoAmount: c.usdcNoAmount,
          yesCondition: c.yesCondition,
          noCondition: c.noCondition,
          liquidity: c.liquidity,
          volume: volumeMap.get(c._id.toString()) || 0,
          optionGroup: c.optionGroup,
          outcomeCount: c.outcomeCount,
          outcomes: c.outcomes,
          outcomePrices: c.outcomePrices,
        })),
      })
    }

    return result
  }

  /**
   * Returns the parentMarketId + event question for every event where
   * the user still has an active (queued or matched) ticket.
   * Used by the frontend to merge into the events dropdown so
   * users can view their unresolved duels even after the event deadline.
   */
  async getMyActiveTickets(userId: string) {
    // 1. Find queued or matched tickets AND user positions with shares > 0 in parallel
    const [activeTickets, activePositions] = await Promise.all([
      this.pvpTicketModel.find({
        userId: new Types.ObjectId(userId),
        status: { $in: ["queued", "matched"] },
      }),
      this.marketPositionModel.find({
        userId: new Types.ObjectId(userId),
        shares: { $gt: 0 },
      }),
    ])

    const childMarketIds = activePositions.map((p) => p.marketId)
    const childMarkets = await this.marketModel.find({
      _id: { $in: childMarketIds },
      marketType: "child",
    })
    const parentMarketIdsFromPositions = childMarkets
      .map((m) => m.parentMarketId?.toString())
      .filter(Boolean)

    // 3. Find resolved tickets where parentMarketId is in parentMarketIdsFromPositions
    const resolvedTicketsWithShares = await this.pvpTicketModel.find({
      userId: new Types.ObjectId(userId),
      status: "resolved",
      parentMarketId: {
        $in: parentMarketIdsFromPositions.map((id) => new Types.ObjectId(id)),
      },
    })

    const tickets = [...activeTickets, ...resolvedTicketsWithShares]

    if (tickets.length === 0) return []

    // Deduplicate by parentMarketId
    const parentIds = [
      ...new Set(tickets.map((t) => t.parentMarketId.toString())),
    ]

    // Fetch all parent markets and child markets in parallel
    const parentObjectIds = parentIds.map((id) => new Types.ObjectId(id))
    const [parents, allChildren] = await Promise.all([
      this.marketModel.find({
        _id: { $in: parentObjectIds },
      }),
      this.marketModel.find({
        parentMarketId: { $in: parentObjectIds },
        marketType: "child",
      }),
    ])

    // Group children by parentMarketId
    const childrenMap = new Map<string, any[]>()
    for (const child of allChildren) {
      if (child.parentMarketId) {
        const pidStr = child.parentMarketId.toString()
        if (!childrenMap.has(pidStr)) {
          childrenMap.set(pidStr, [])
        }
        childrenMap.get(pidStr)!.push(child)
      }
    }

    // Compute trade volume per child market via aggregation (avoids loading all trade docs)
    const allChildIds = allChildren.map((c) => c._id)
    const volumeAgg = await this.marketTradeModel.aggregate([
      { $match: { marketId: { $in: allChildIds } } },
      { $group: { _id: "$marketId", totalVolume: { $sum: "$amountUsdc" } } },
    ])
    const volumeMap = new Map<string, number>()
    for (const v of volumeAgg) {
      volumeMap.set(v._id.toString(), v.totalVolume)
    }

    const result: any[] = []
    for (const parent of parents) {
      const pidStr = parent._id.toString()
      const children = childrenMap.get(pidStr) || []

      result.push({
        id: pidStr,
        question: parent.question,
        deadline: parent.deadline,
        lockTime: parent.lockTime,
        status: parent.status,
        createdAt: parent.createdAt,
        resolutionSource: parent.resolutionSource,
        yesCondition: parent.yesCondition,
        noCondition: parent.noCondition,
        options: children.map((c) => ({
          id: c._id.toString(),
          optionName: c.optionName,
          status: c.status,
          usdcYesAmount: c.usdcYesAmount,
          usdcNoAmount: c.usdcNoAmount,
          yesCondition: c.yesCondition,
          noCondition: c.noCondition,
          liquidity: c.liquidity,
          volume: volumeMap.get(c._id.toString()) || 0,
          optionGroup: c.optionGroup,
          outcomeCount: c.outcomeCount,
          outcomes: c.outcomes,
          outcomePrices: c.outcomePrices,
        })),
      })
    }

    return result
  }

  async submitTicket(userId: string, dto: SubmitTicketDto) {
    const user = await this.userModel.findById(userId)
    if (!user) throw new NotFoundException("User not found.")

    const parent = await this.marketModel.findById(dto.parentMarketId)
    if (
      !parent ||
      parent.marketType !== "parent" ||
      parent.category !== "pvp"
    ) {
      throw new NotFoundException("PvP Event not found.")
    }

    const lockTimeLimit = parent.lockTime || parent.deadline
    if (new Date() >= lockTimeLimit) {
      throw new BadRequestException(
        "Event lock time has passed. Predictions are locked.",
      )
    }

    // Verify picks size
    if (dto.picks.length < 3) {
      throw new BadRequestException("Ticket must contain at least 3 picks.")
    }
    const childCount = await this.marketModel.countDocuments({
      parentMarketId: parent._id,
      marketType: "child",
    })
    if (dto.picks.length > childCount) {
      throw new BadRequestException(
        `Ticket cannot contain more than ${childCount} picks, but got ${dto.picks.length}.`,
      )
    }

    // Validate that the user doesn't select multiple options from the same group
    const childMarkets = await this.marketModel.find({
      parentMarketId: parent._id,
      marketType: "child",
    })
    const groupSelections: Record<string, string[]> = {}
    for (const pick of dto.picks) {
      const child = childMarkets.find((m) => m._id.toString() === pick.marketId)
      if (!child) {
        throw new BadRequestException(
          `Market option ${pick.marketId} not found in this event.`,
        )
      }
      if (child.optionGroup) {
        if (!groupSelections[child.optionGroup]) {
          groupSelections[child.optionGroup] = []
        }
        groupSelections[child.optionGroup].push(pick.marketId)
      }
    }

    for (const [group, marketIds] of Object.entries(groupSelections)) {
      if (marketIds.length > 1) {
        throw new BadRequestException(
          `You cannot make multiple selections from the same option group: ${group}.`,
        )
      }
    }

    // Check if user already has an active ticket for this matchup
    const existing = await this.pvpTicketModel.findOne({
      userId: new Types.ObjectId(userId),
      parentMarketId: parent._id,
      status: { $in: ["queued", "matched"] },
    })

    if (existing) {
      throw new BadRequestException(
        "You have already submitted a ticket for this matchup.",
      )
    }

    // 1. Calculate active user boost details first
    let activeUserBoostMultiplier = 1.0
    let selectedUserBoostType: string | null = null
    let selectedBoostObject: any = null

    // Check if new user welcome boosts apply
    const cutoffStr = this.configService.get<string>("NEW_USER_CUTOFF_DATE")
    const cutoffDate = cutoffStr ? new Date(cutoffStr) : null
    const isNewUser =
      cutoffDate && user.createdAt && new Date(user.createdAt) >= cutoffDate
    let welcomeBoostMultiplier = 1.0

    if (isNewUser) {
      // Count only tickets where a coupon was NOT used
      const ticketCount = await this.pvpTicketModel.countDocuments({
        userId: user._id,
        status: { $ne: "cancelled" },
        couponCode: { $in: [null, undefined] },
      })
      if (ticketCount === 0) {
        welcomeBoostMultiplier = 2.0
      } else if (ticketCount === 1) {
        welcomeBoostMultiplier = 1.5
      }
    }

    const activeBoosts = user.activeBoosts || []
    const isBronzeEligible =
      user.arenaXp >= 30 && user.arenaXp <= 499 && !user.hasUsedBronzeBoost

    const candidates: Array<{ type: string; multiplier: number; obj?: any }> =
      []

    if (welcomeBoostMultiplier > 1.0) {
      candidates.push({ type: "welcome", multiplier: welcomeBoostMultiplier })
    }

    if (isBronzeEligible) {
      candidates.push({ type: "bronze", multiplier: 1.5 })
    }

    for (const b of activeBoosts) {
      if (b.type === "match_based" && b.matchesRemaining > 0) {
        candidates.push({ type: b.source, multiplier: b.multiplier, obj: b })
      }
    }

    if (candidates.length > 0) {
      const typePriority: Record<string, number> = {
        welcome: 10,
        downtime: 8,
        mission: 6,
        bronze: 4,
        referral: 2,
      }

      candidates.sort((a, b) => {
        if (b.multiplier !== a.multiplier) {
          return b.multiplier - a.multiplier
        }
        const prioA = typePriority[a.type] || 0
        const prioB = typePriority[b.type] || 0
        return prioB - prioA
      })

      const best = candidates[0]
      activeUserBoostMultiplier = best.multiplier
      selectedUserBoostType = best.type
      selectedBoostObject = best.obj
    }

    // 2. Validate coupon if provided
    let appliedCoupon: string | null = null
    let couponMultiplier: number | null = null

    if (dto.couponCode) {
      try {
        const coupon = await this.couponsService.validateCoupon(dto.couponCode)

        // Check per-user limit
        const userUsageCount = await this.pvpTicketModel.countDocuments({
          userId: new Types.ObjectId(userId),
          couponCode: coupon.code,
          status: { $ne: "cancelled" },
        })

        if (userUsageCount >= coupon.maxUsesPerUser) {
          throw new BadRequestException(
            `You have already used this coupon code the maximum allowed number of times (${coupon.maxUsesPerUser}).`,
          )
        }

        couponMultiplier = coupon.multiplier
        appliedCoupon = coupon.code
      } catch (err: any) {
        this.logger.warn(
          `User ${userId} provided invalid coupon code ${dto.couponCode}: ${err.message}`,
        )
      }
    }

    // 3. Coupon Bypasses Active User Boost
    let xpBoostMultiplier = 1.0
    let doubleBoostActive = false
    let shouldConsumeUserBoost = false

    if (appliedCoupon && couponMultiplier) {
      // Coupon is applied: use coupon, bypass and preserve active user boosts
      xpBoostMultiplier = couponMultiplier
      doubleBoostActive = true
      this.logger.log(
        `User ${userId} applied coupon ${appliedCoupon} (${couponMultiplier}x). Bypassing and preserving other boosts.`,
      )
    } else {
      // No coupon applied: use active user boost (if any) and consume it
      if (activeUserBoostMultiplier > 1.0) {
        xpBoostMultiplier = activeUserBoostMultiplier
        doubleBoostActive = true
        shouldConsumeUserBoost = true
      }
    }

    // 4. Consume user boost if resolved as active
    let boostConsumed = false
    if (shouldConsumeUserBoost && selectedUserBoostType) {
      if (selectedUserBoostType === "welcome") {
        this.logger.log(
          `User ${userId} consumed Welcome Boost (${xpBoostMultiplier}x).`,
        )
        boostConsumed = true
      } else if (selectedUserBoostType === "bronze") {
        await this.userModel.findOneAndUpdate(
          { _id: user._id, hasUsedBronzeBoost: false },
          { $set: { hasUsedBronzeBoost: true } },
          { new: true },
        )
        this.logger.log(`User ${userId} consumed one-time Bronze 1.5x boost.`)
        boostConsumed = true
      } else if (selectedBoostObject) {
        const source = selectedBoostObject.source
        const sourceId = selectedBoostObject.sourceId

        const elemMatchQuery: any = {
          source,
          type: "match_based",
          matchesRemaining: { $gt: 0 },
        }
        if (sourceId) {
          elemMatchQuery.sourceId = sourceId
        }

        const updateResult = await this.userModel.findOneAndUpdate(
          {
            _id: user._id,
            activeBoosts: {
              $elemMatch: elemMatchQuery,
            },
          } as any,
          {
            $inc: { "activeBoosts.$.matchesRemaining": -1 },
          },
          { new: true },
        )
        if (updateResult) {
          const pullQuery: any = {
            source,
            type: "match_based",
            matchesRemaining: { $lte: 0 },
          }
          if (sourceId) {
            pullQuery.sourceId = sourceId
          }
          await this.userModel.updateOne({ _id: user._id }, {
            $pull: {
              activeBoosts: pullQuery,
            },
          } as any)
          this.logger.log(
            `User ${userId} consumed a ${source} boost match (multiplier: ${xpBoostMultiplier}x).`,
          )
          boostConsumed = true
        }
      }
    }

    // Create the ticket
    let ticket
    try {
      ticket = await this.pvpTicketModel.create({
        userId: new Types.ObjectId(userId),
        parentMarketId: parent._id,
        picks: dto.picks.map((p) => ({
          marketId: new Types.ObjectId(p.marketId),
          selection: p.selection,
          isCorrect: null,
        })),
        status: "queued",
        doubleBoostActive,
        xpBoostMultiplier,
        couponCode: appliedCoupon,
        boostType: shouldConsumeUserBoost ? selectedUserBoostType : null,
        boostSourceId:
          shouldConsumeUserBoost && selectedBoostObject
            ? selectedBoostObject.sourceId
            : null,
      })
    } catch (createErr) {
      // Rollback boost consumption if saving the ticket fails
      if (boostConsumed && selectedUserBoostType) {
        if (selectedUserBoostType === "bronze") {
          await this.userModel.findOneAndUpdate(
            { _id: user._id },
            { $set: { hasUsedBronzeBoost: false } },
          )
          this.logger.log(
            `Rolled back Bronze Boost for user ${userId} due to ticket creation failure.`,
          )
        } else if (selectedBoostObject) {
          const source = selectedBoostObject.source
          const sourceId = selectedBoostObject.sourceId
          const elemMatchQuery: any = {
            source,
            type: "match_based",
          }
          if (sourceId) {
            elemMatchQuery.sourceId = sourceId
          }

          const updatedUser = await this.userModel.findById(user._id)
          const existingBoost = (updatedUser?.activeBoosts || []).find(
            (b) =>
              b.type === "match_based" &&
              b.source === source &&
              (!sourceId || b.sourceId === sourceId),
          )

          if (existingBoost) {
            await this.userModel.updateOne(
              {
                _id: user._id,
                activeBoosts: {
                  $elemMatch: elemMatchQuery,
                },
              },
              {
                $inc: { "activeBoosts.$.matchesRemaining": 1 },
              },
            )
          } else {
            const newBoost = {
              type: "match_based",
              multiplier: selectedBoostObject.multiplier,
              matchesRemaining: 1,
              source,
              sourceId: sourceId || null,
              category: null,
              expiresAt: null,
            }
            await this.userModel.findByIdAndUpdate(user._id, {
              $push: { activeBoosts: newBoost },
            })
          }
          this.logger.log(
            `Rolled back match-based boost ${source} for user ${userId} due to ticket creation failure.`,
          )
        }
      }
      throw createErr
    }

    if (appliedCoupon) {
      await this.couponsService.incrementUsage(appliedCoupon)
      this.logger.log(
        `User ${userId} successfully applied coupon ${appliedCoupon}. New multiplier: ${xpBoostMultiplier}x.`,
      )
    }

    // Perform matchmaking
    const match = await this.matchmake(ticket)

    // Clear sync cache so the user's updated positions are fetched on status query
    this.clearSyncCache(userId, dto.parentMarketId)

    return {
      ticketId: ticket._id.toString(),
      status: ticket.status,
      matched: !!match,
      matchId: match ? match._id.toString() : null,
      doubleBoostActive,
    }
  }

  async matchmake(ticket: PvpTicketDocument): Promise<PvpMatchDocument | null> {
    const candidates = await this.pvpTicketModel
      .find({
        parentMarketId: ticket.parentMarketId,
        userId: { $ne: ticket.userId },
        status: "queued",
      })
      .populate("userId")

    if (candidates.length === 0) {
      return null
    }

    const submitter = await this.userModel.findById(ticket.userId)
    const submitterXp = submitter?.arenaXp ?? 0
    const submitterTier = this.getRankTier(submitterXp)

    const top10UserIds = await this.getTop10UserIds()
    const isSubmitterTop10 = top10UserIds.has(ticket.userId.toString())

    const eligibleCandidates: Array<{
      ticket: PvpTicketDocument
      divergence: number
      tier: number
      tierDistance: number
    }> = []

    for (const candidate of candidates) {
      const candidateUser = candidate.userId as any
      const candidateUserIdStr =
        candidateUser?._id?.toString() || candidate.userId.toString()
      const isCandidateTop10 = top10UserIds.has(candidateUserIdStr)

      if (isSubmitterTop10 !== isCandidateTop10) {
        continue // Top 10 can only match with Top 10, non-Top 10 can only match with non-Top 10
      }

      let divergence = 0
      for (const pick of ticket.picks) {
        const candidatePick = candidate.picks.find(
          (p) => p.marketId.toString() === pick.marketId.toString(),
        )
        if (candidatePick && candidatePick.selection !== pick.selection) {
          divergence += 1
        }
      }

      if (divergence < 1) {
        continue // Skip exact same picks to avoid pre-determined draws!
      }

      const candidateXp = candidateUser?.arenaXp ?? 0
      const candidateTier = this.getRankTier(candidateXp)
      const tierDistance = Math.abs(submitterTier - candidateTier)

      eligibleCandidates.push({
        ticket: candidate,
        divergence,
        tier: candidateTier,
        tierDistance,
      })
    }

    if (eligibleCandidates.length === 0) {
      return null
    }

    // Sort based on prioritized matchmaking rules:
    // 1. Same tier or closest tier distance (ascending)
    // 2. Tie-breaker 1: Prioritize the higher tier rank (e.g. Gold over Silver)
    // 3. Tie-breaker 2: Prioritize higher pick divergence
    // 4. Tie-breaker 3: Oldest queued ticket first
    eligibleCandidates.sort((a, b) => {
      if (a.tierDistance !== b.tierDistance) {
        return a.tierDistance - b.tierDistance
      }
      if (a.tier !== b.tier) {
        return b.tier - a.tier
      }
      if (a.divergence !== b.divergence) {
        return b.divergence - a.divergence
      }
      const timeA = a.ticket.createdAt
        ? new Date(a.ticket.createdAt).getTime()
        : 0
      const timeB = b.ticket.createdAt
        ? new Date(b.ticket.createdAt).getTime()
        : 0
      return timeA - timeB
    })

    const bestOpponent = eligibleCandidates[0].ticket
    const maxDivergence = eligibleCandidates[0].divergence

    const bestOpponentUserId =
      bestOpponent.userId &&
      typeof bestOpponent.userId === "object" &&
      "_id" in bestOpponent.userId
        ? (bestOpponent.userId as any)._id
        : bestOpponent.userId

    // Match found! Create PvpMatch
    const match = await this.pvpMatchModel.create({
      parentMarketId: ticket.parentMarketId,
      ticket1Id: ticket._id,
      ticket2Id: bestOpponent._id,
      user1Id: ticket.userId,
      user2Id: bestOpponentUserId,
      divergenceScore: maxDivergence,
      status: "matched",
    })

    // Update tickets status to matched
    ticket.status = "matched"
    ticket.matchId = match._id
    ticket.opponentTicketId = bestOpponent._id
    await ticket.save()

    bestOpponent.status = "matched"
    bestOpponent.matchId = match._id
    bestOpponent.opponentTicketId = ticket._id
    await bestOpponent.save()

    // Query usernames to send personalized alerts
    const [user1, user2] = await Promise.all([
      this.userModel.findById(ticket.userId),
      this.userModel.findById(bestOpponentUserId),
    ])
    const u1Name = user1?.username || "someone"
    const u2Name = user2?.username || "someone"

    // Emit Socket events
    this.socketGateway.broadcastToRoom(
      `user:${ticket.userId.toString()}`,
      "pvp-matched",
      { matchId: match._id.toString() },
    )
    this.socketGateway.broadcastToRoom(
      `user:${bestOpponentUserId.toString()}`,
      "pvp-matched",
      { matchId: match._id.toString() },
    )

    // In-app Notifications
    await this.notificationsService.createNotification(
      ticket.userId.toString(),
      bestOpponentUserId.toString(),
      "pvp_matched",
      "PvP Arena Opponent Found!",
      `You've been matched against @${u2Name} for the event with a selection divergence of ${maxDivergence} picks.`,
      match._id.toString(),
    )
    await this.notificationsService.createNotification(
      bestOpponentUserId.toString(),
      ticket.userId.toString(),
      "pvp_matched",
      "PvP Arena Opponent Found!",
      `You've been matched against @${u1Name} for the event with a selection divergence of ${maxDivergence} picks.`,
      match._id.toString(),
    )

    this.logger.log(
      `Matched tickets: ${ticket._id} and ${bestOpponent._id} inside match: ${match._id}`,
    )
    return match
  }

  async resolvePvpMatchesForMarket(marketId: string, winningOutcome: string) {
    // Find all matched or resolved tickets containing this child market
    const tickets = await this.pvpTicketModel.find({
      status: { $in: ["matched", "resolved"] },
      "picks.marketId": new Types.ObjectId(marketId),
    })

    if (tickets.length === 0) return

    const market = await this.marketModel.findById(marketId)

    this.logger.log(
      `Resolving child market ${marketId} outcome: ${winningOutcome} on ${tickets.length} PvP tickets.`,
    )

    for (const ticket of tickets) {
      let updated = false
      for (const pick of ticket.picks) {
        if (pick.marketId.toString() === marketId) {
          const normalizedSelection = pick.selection.toUpperCase().trim()
          const normalizedWinner = winningOutcome.toUpperCase().trim()
          let isCorrect = false

          if (market && market.outcomeCount === 2) {
            const yesText = (market.outcomes[0] || "YES").toUpperCase().trim()
            const noText = (market.outcomes[1] || "NO").toUpperCase().trim()

            if (normalizedSelection === "YES") {
              isCorrect =
                normalizedWinner === "YES" || normalizedWinner === yesText
            } else if (normalizedSelection === "NO") {
              isCorrect =
                normalizedWinner === "NO" || normalizedWinner === noText
            }
          } else {
            const isStringMatch = normalizedSelection === normalizedWinner
            let isIndexMatch = false
            if (market && market.outcomes && market.outcomes.length > 0) {
              const selIdx = market.outcomes.findIndex(
                (o) =>
                  o.toLowerCase().trim() ===
                  pick.selection.toLowerCase().trim(),
              )
              const winIdx = market.outcomes.findIndex(
                (o) =>
                  o.toLowerCase().trim() ===
                  winningOutcome.toLowerCase().trim(),
              )
              if (selIdx >= 0 && winIdx >= 0 && selIdx === winIdx) {
                isIndexMatch = true
              }
            }
            isCorrect = isStringMatch || isIndexMatch
          }

          pick.isCorrect = isCorrect
          updated = true

          // Archive losing position immediately so they don't clutter the active ticket list
          if (!pick.isCorrect) {
            await this.marketPositionModel.updateOne(
              {
                marketId: pick.marketId,
                userId: ticket.userId,
                side: pick.selection,
              },
              {
                $set: {
                  shares: 0,
                  isArchived: true,
                },
              },
            )
          }
        }
      }

      if (updated) {
        ticket.markModified("picks")
        await ticket.save()

        // Check if all picks are resolved
        const allResolved = ticket.picks.every((p) => p.isCorrect !== null)
        if (allResolved) {
          const match = await this.pvpMatchModel.findById(ticket.matchId)
          if (match && match.status === "matched") {
            const ticket1 = await this.pvpTicketModel.findById(match.ticket1Id)
            const ticket2 = await this.pvpTicketModel.findById(match.ticket2Id)

            // Check if both tickets are now fully resolved
            if (
              ticket1 &&
              ticket2 &&
              ticket1.picks.every((p) => p.isCorrect !== null) &&
              ticket2.picks.every((p) => p.isCorrect !== null)
            ) {
              await this.resolveMatch(match, ticket1, ticket2)
            }
          }
        }
      }
    }
  }

  private async resolveMatch(
    match: PvpMatchDocument,
    ticket1: PvpTicketDocument,
    ticket2: PvpTicketDocument,
  ) {
    this.logger.log(
      `Resolving PvP match ${match._id} for users ${match.user1Id} and ${match.user2Id}`,
    )

    // 1. Each correct prediction is worth one match point.
    const score1 = calculatePvpScore(ticket1.picks)
    const score2 = calculatePvpScore(ticket2.picks)

    // 2. The player with more correct predictions wins. Equal score is a draw.
    let winnerId: Types.ObjectId | null = null
    if (score1 > score2) {
      winnerId = match.user1Id
    } else if (score2 > score1) {
      winnerId = match.user2Id
    }

    // 3. Load Users
    const [user1, user2] = await Promise.all([
      this.userModel.findById(match.user1Id),
      this.userModel.findById(match.user2Id),
    ])
    if (!user1 || !user2) return

    const result1: PvpResult = winnerId
      ? winnerId.toString() === user1._id.toString()
        ? "win"
        : "loss"
      : "draw"
    const result2: PvpResult = winnerId
      ? winnerId.toString() === user2._id.toString()
        ? "win"
        : "loss"
      : "draw"

    // 4. Query total child markets for perfect score bonus check.
    const childMarketCount = await this.marketModel.countDocuments({
      parentMarketId: match.parentMarketId,
      marketType: "child",
    })

    // 5. Award Result XP, a +20 perfect bonus (if they predicted all child markets correctly), and an optional boost.
    const xp1 = calculatePvpResultXp(
      result1,
      score1,
      childMarketCount,
      ticket1.doubleBoostActive,
      ticket1.xpBoostMultiplier,
    )
    const xp2 = calculatePvpResultXp(
      result2,
      score2,
      childMarketCount,
      ticket2.doubleBoostActive,
      ticket2.xpBoostMultiplier,
    )

    const isBot1 = BOT_PROFILES.some((p) => p.username === user1.username)
    const isBot2 = BOT_PROFILES.some((p) => p.username === user2.username)

    // 5. Update user stats
    if (!isBot1) {
      user1.arenaXp += xp1
      user1.pvpTicketsSubmittedCount += 1
      if (winnerId) {
        if (winnerId.toString() === user1._id.toString()) {
          user1.pvpMatchesWonCount += 1
          if (!user1.hasWonFirstPvpDuel) {
            user1.hasWonFirstPvpDuel = true
            if (user1.referredById) {
              await this.awardReferrerFirstWinBoosts(user1)
            }
          }
        } else {
          user1.pvpMatchesLostCount += 1
        }
      } else {
        user1.pvpMatchesDrawnCount += 1
      }
      await user1.save()
    }

    if (!isBot2) {
      user2.arenaXp += xp2
      user2.pvpTicketsSubmittedCount += 1
      if (winnerId) {
        if (winnerId.toString() === user2._id.toString()) {
          user2.pvpMatchesWonCount += 1
          if (!user2.hasWonFirstPvpDuel) {
            user2.hasWonFirstPvpDuel = true
            if (user2.referredById) {
              await this.awardReferrerFirstWinBoosts(user2)
            }
          }
        } else {
          user2.pvpMatchesLostCount += 1
        }
      } else {
        user2.pvpMatchesDrawnCount += 1
      }
      await user2.save()
    }

    // 6. Update Match and Ticket records
    match.status = "resolved"
    match.winnerId = winnerId
    match.resolvedAt = new Date()
    await match.save()

    ticket1.status = "resolved"
    ticket1.score = score1
    ticket1.xpEarned = xp1
    await ticket1.save()

    ticket2.status = "resolved"
    ticket2.score = score2
    ticket2.xpEarned = xp2
    await ticket2.save()

    // Broadcast Socket events
    if (!isBot1) {
      this.socketGateway.broadcastToRoom(
        `user:${user1._id.toString()}`,
        "pvp-resolved",
        { matchId: match._id.toString() },
      )
      this.socketGateway.broadcastToRoom(
        `user:${user1._id.toString()}`,
        "user-updated",
        {},
      )
    }
    if (!isBot2) {
      this.socketGateway.broadcastToRoom(
        `user:${user2._id.toString()}`,
        "pvp-resolved",
        { matchId: match._id.toString() },
      )
      this.socketGateway.broadcastToRoom(
        `user:${user2._id.toString()}`,
        "user-updated",
        {},
      )
    }

    // In-app Notifications
    const u1 = user1.username
    const u2 = user2.username
    const res1 = winnerId
      ? winnerId.toString() === user1._id.toString()
        ? "WON 🏆"
        : "LOST ❌"
      : "TIED 🤝"
    const res2 = winnerId
      ? winnerId.toString() === user2._id.toString()
        ? "WON 🏆"
        : "LOST ❌"
      : "TIED 🤝"

    if (!isBot1) {
      await this.notificationsService.createNotification(
        user1._id.toString(),
        user2._id.toString(),
        "pvp_resolved",
        `PvP Duel Resolved: You ${res1}`,
        `Your battle against @${u2} resolved. Score: ${score1}/${ticket1.picks.length} vs ${score2}/${ticket2.picks.length}. Arena XP earned: +${xp1}.`,
        match._id.toString(),
      )
    }
    if (!isBot2) {
      await this.notificationsService.createNotification(
        user2._id.toString(),
        user1._id.toString(),
        "pvp_resolved",
        `PvP Duel Resolved: You ${res2}`,
        `Your battle against @${u1} resolved. Score: ${score2}/${ticket2.picks.length} vs ${score1}/${ticket1.picks.length}. Arena XP earned: +${xp2}.`,
        match._id.toString(),
      )
    }
  }

  /**
   * Syncs on-chain balances for a user's child markets in the background.
   * This is intentionally called as fire-and-forget from getPvpStatus().
   */
  private async syncOnChainBalances(
    userId: string,
    walletAddress: string,
    children: any[],
  ) {
    // Pre-fetch on-chain balances for all child markets in a single batch query
    const batchQueries = children.map((child) => {
      const outcomes =
        child.outcomes && child.outcomes.length > 0
          ? child.outcomes
          : ["YES", "NO"]
      return {
        marketId: child._id.toString(),
        outcomes,
      }
    })

    // Positions are tracked on the Solana program (Position PDAs); the old Arc
    // outcome-token balance sync is no longer used.
    const balancesMap: Record<string, Record<string, number>> = {}

    // Fetch existing positions in db to avoid redundant database writes
    const existingPositions = await this.marketPositionModel.find({
      userId: new Types.ObjectId(userId),
      marketId: { $in: children.map((c) => c._id) },
    })

    for (const child of children) {
      try {
        const outcomes =
          child.outcomes && child.outcomes.length > 0
            ? child.outcomes
            : ["YES", "NO"]

        const onChain = balancesMap[child._id.toString()] || {}

        const isResolved = child.status === "resolved" || child.resolvedOutcome
        const winningOutcome = child.resolvedOutcome
        const isMulti = child.outcomeCount && child.outcomeCount > 2

        let normalizedWinningOutcome = winningOutcome
        if (!isMulti && winningOutcome && outcomes.length >= 2) {
          if (
            winningOutcome.toUpperCase() === outcomes[0].toUpperCase() ||
            winningOutcome.toUpperCase() === "YES"
          ) {
            normalizedWinningOutcome = "YES"
          } else if (
            winningOutcome.toUpperCase() === outcomes[1].toUpperCase() ||
            winningOutcome.toUpperCase() === "NO"
          ) {
            normalizedWinningOutcome = "NO"
          }
        }

        for (let idx = 0; idx < outcomes.length; idx++) {
          const outcome = outcomes[idx]
          const normalizedSide = isMulti ? outcome : idx === 0 ? "YES" : "NO"

          const balance = onChain[outcome] ?? 0
          const isLosing =
            isResolved && normalizedWinningOutcome !== normalizedSide

          // Find if we already have this position in DB matching normalizedSide
          const dbPos = existingPositions.find(
            (p) =>
              p.marketId.toString() === child._id.toString() &&
              p.side === normalizedSide,
          )

          if (!isLosing && balance > 0) {
            // If there's no matching position, or the shares count differs, update/upsert
            if (!dbPos || dbPos.shares !== balance) {
              await this.marketPositionModel.updateOne(
                {
                  marketId: child._id,
                  userId: new Types.ObjectId(userId),
                  side: normalizedSide,
                },
                {
                  $set: { shares: balance },
                  $setOnInsert: {
                    avgPrice: 0.5,
                    investedUsdc: balance * 0.5,
                    realizedPnl: 0,
                  },
                },
                { upsert: true },
              )
            }
          } else {
            // If there's a matching position, archive it
            if (dbPos) {
              await this.marketPositionModel.updateOne(
                {
                  marketId: child._id,
                  userId: new Types.ObjectId(userId),
                  side: normalizedSide,
                },
                {
                  $set: {
                    shares: 0,
                    isArchived: true,
                  },
                },
              )
            }
          }
        }
      } catch (err) {
        this.logger.error(
          `Error syncing position in syncOnChainBalances for child ${child._id}: ${err.message}`,
        )
      }
    }
  }

  private async awardReferrerFirstWinBoosts(referredPlayer: UserDocument) {
    const referrer = await this.userModel.findById(referredPlayer.referredById)
    if (!referrer) return

    // Find up to 2 active (queued/matched) tickets for the referrer that do not have any boosts active.
    const activeUnboostedTickets = await this.pvpTicketModel
      .find({
        userId: referrer._id,
        status: { $in: ["queued", "matched"] },
        doubleBoostActive: false,
      })
      .sort({ createdAt: 1 })
      .limit(2)

    let appliedBoostsCount = 0
    for (const ticket of activeUnboostedTickets) {
      ticket.doubleBoostActive = true
      ticket.xpBoostMultiplier = 1.2
      await ticket.save()
      appliedBoostsCount++
      this.logger.log(
        `Retroactively applied 1.2x boost to referrer ${referrer._id}'s active ticket ${ticket._id}`,
      )
    }

    const boostsToAdd = 2 - appliedBoostsCount
    if (boostsToAdd > 0) {
      if (!referrer.activeBoosts) {
        referrer.activeBoosts = []
      }
      const existingRefBoost = referrer.activeBoosts.find(
        (b) => b.source === "referral" && b.type === "match_based",
      )
      if (existingRefBoost) {
        existingRefBoost.matchesRemaining += boostsToAdd
      } else {
        referrer.activeBoosts.push({
          type: "match_based",
          multiplier: 1.2,
          matchesRemaining: boostsToAdd,
          category: null,
          source: "referral",
          sourceId: null,
          expiresAt: null,
        } as any)
      }
      referrer.markModified("activeBoosts")
      await referrer.save()
      this.logger.log(
        `Added ${boostsToAdd} boosts to referrer ${referrer._id}'s activeBoosts (applied ${appliedBoostsCount} retroactively)`,
      )
    } else {
      this.logger.log(
        `Applied all 2 boosts retroactively to referrer ${referrer._id}'s active tickets`,
      )
    }

    // Clear referrer's sync cache so updated ticket boosts are immediately visible
    this.clearSyncCache(referrer._id.toString())

    await this.notificationsService.createNotification(
      referrer._id.toString(),
      referredPlayer._id.toString(),
      "pvp_boost",
      "Referral XP Boosts Awarded!",
      `Your referred friend @${referredPlayer.username} won their first duel. You received 2 Arena XP boosts (1.2x XP each).`,
      referredPlayer._id.toString(),
    )

    this.logger.log(
      `Two XP boosts awarded to referrer ${referrer._id} after referred player ${referredPlayer._id} earned their first win`,
    )
  }

  async getPvpStatus(userId: string, parentMarketId?: string) {
    const query: any = {
      userId: new Types.ObjectId(userId),
      status: { $in: ["queued", "matched", "resolved"] },
    }
    if (parentMarketId) {
      query.parentMarketId = new Types.ObjectId(parentMarketId)
    }

    // Find the latest active ticket (either queued, matched, or resolved)
    let ticket = await this.pvpTicketModel
      .findOne(query)
      .sort({ createdAt: -1 })

    if (!ticket) return null

    // Just-In-Time Bot Matchmaking if lockTime limit has passed
    if (ticket.status === "queued") {
      const parent = await this.marketModel.findById(ticket.parentMarketId)
      if (parent) {
        const lockTimeLimit = parent.lockTime || parent.deadline
        if (new Date() >= lockTimeLimit) {
          await this.matchRemainingTicketsWithBot(parent._id.toString())
          // Re-fetch ticket to get updated matched status
          ticket = await this.pvpTicketModel.findById(ticket._id)
          if (!ticket) return null
        }
      }
    }

    const parentId = ticket.parentMarketId
    // Parallelize independent lookups: match, parent + children, user, opponentTicket
    const [match, allMarkets, user, opponentTicket] = await Promise.all([
      ticket.matchId
        ? this.pvpMatchModel.findById(ticket.matchId)
        : Promise.resolve(null),
      this.marketModel.find({
        $or: [{ _id: parentId }, { parentMarketId: parentId }],
      }),
      this.userModel.findById(userId),
      ticket.opponentTicketId
        ? this.pvpTicketModel.findById(ticket.opponentTicketId)
        : Promise.resolve(null),
    ])

    const parent = allMarkets.find(
      (m) => m._id.toString() === parentId.toString(),
    )
    const children = allMarkets.filter(
      (m) => m.parentMarketId?.toString() === parentId.toString(),
    )

    // Fire-and-forget on-chain balance sync (non-blocking)
    if (user && user.walletAddress) {
      const syncKey = `${userId}:${parentMarketId || ""}`
      const lastSync = this.lastSyncMap.get(syncKey) || 0
      if (Date.now() - lastSync > 10000) {
        this.lastSyncMap.set(syncKey, Date.now())
        this.syncOnChainBalances(userId, user.walletAddress, children).catch(
          (err) =>
            this.logger.error(
              `Background on-chain sync failed: ${err.message}`,
            ),
        )
      }
    }

    // Fetch user positions, trade volume, and opponent in parallel (aggregation for volume)
    const childMarketIds = children.map((c) => c._id)
    const [userPositions, volumeAgg, opponent] = await Promise.all([
      this.marketPositionModel.find({
        userId: new Types.ObjectId(userId),
        marketId: { $in: childMarketIds },
        shares: { $gt: 0 },
      }),
      this.marketTradeModel.aggregate([
        { $match: { marketId: { $in: childMarketIds } } },
        { $group: { _id: "$marketId", totalVolume: { $sum: "$amountUsdc" } } },
      ]),
      opponentTicket
        ? this.userModel.findById(opponentTicket.userId)
        : Promise.resolve(null),
    ])

    const volumeMap: Record<string, number> = {}
    for (const v of volumeAgg) {
      volumeMap[v._id.toString()] = v.totalVolume
    }

    return {
      status: ticket.status,
      ticket: {
        id: ticket._id.toString(),
        status: ticket.status,
        score: ticket.score,
        xpEarned: ticket.xpEarned,
        doubleBoostActive: ticket.doubleBoostActive,
        xpBoostMultiplier: ticket.xpBoostMultiplier ?? 1.0,
        picks: ticket.picks.map((p) => {
          const matchChild = children.find(
            (c) => c._id.toString() === p.marketId.toString(),
          )
          const position = userPositions.find(
            (pos) =>
              pos.marketId.toString() === p.marketId.toString() &&
              pos.side === p.selection,
          )
          return {
            marketId: p.marketId.toString(),
            optionName: matchChild?.optionName || "Unknown Proposition",
            selection: p.selection,
            isCorrect: p.isCorrect,
            yesCondition: matchChild?.yesCondition || "YES",
            noCondition: matchChild?.noCondition || "NO",
            shares: position?.shares ?? 0,
            investedUsdc: position?.investedUsdc ?? 0,
            status: matchChild?.status || "unknown",
            resolvedOutcome: matchChild?.resolvedOutcome || null,
          }
        }),
      },
      match: match
        ? {
            id: match._id.toString(),
            divergenceScore: match.divergenceScore,
            status: match.status,
          }
        : null,
      opponent: opponent
        ? {
            id: opponent._id.toString(),
            username: opponent.username,
            avatarUrl: opponent.avatarUrl,
            picks: opponentTicket
              ? opponentTicket.picks.map((p) => {
                  const matchChild = children.find(
                    (c) => c._id.toString() === p.marketId.toString(),
                  )
                  return {
                    marketId: p.marketId.toString(),
                    optionName: matchChild?.optionName || "Unknown Proposition",
                    selection: p.selection,
                    isCorrect: p.isCorrect,
                    yesCondition: matchChild?.yesCondition || "YES",
                    noCondition: matchChild?.noCondition || "NO",
                    status: matchChild?.status || "unknown",
                    resolvedOutcome: matchChild?.resolvedOutcome || null,
                  }
                })
              : [],
          }
        : null,
      event: parent
        ? {
            id: parent._id.toString(),
            question: parent.question,
            deadline: parent.deadline,
            lockTime: parent.lockTime,
            status: parent.status,
            options: children.map((c) => ({
              id: c._id.toString(),
              optionName: c.optionName || c.question,
              status: c.status,
              usdcYesAmount: c.usdcYesAmount,
              usdcNoAmount: c.usdcNoAmount,
              yesCondition: c.yesCondition || "YES",
              noCondition: c.noCondition || "NO",
              liquidity: c.liquidity || 0,
              volume: volumeMap[c._id.toString()] || 0,
              optionGroup: c.optionGroup,
              outcomeCount: c.outcomeCount,
              outcomes: c.outcomes,
              outcomePrices: c.outcomePrices,
            })),
          }
        : null,
    }
  }

  async getLeaderboards(userId?: string) {
    // Fetch top 50 rankings and current target user in parallel
    const [xpList, referrerRankings, targetUser] = await Promise.all([
      this.userModel
        .find({
          isOnboarded: true,
        })
        .sort({ arenaXp: -1 })
        .limit(50),
      this.userModel.aggregate([
        { $match: { referredById: { $ne: null } } },
        { $group: { _id: "$referredById", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "referrerUser",
          },
        },
        { $unwind: "$referrerUser" },
      ]),
      userId ? this.userModel.findById(userId) : Promise.resolve(null),
    ])

    let currentUserXp: number | null = null
    let currentUserXpRank: number | null = null
    let currentUserReferral: number | null = null
    let currentUserReferralRank: number | null = null

    if (targetUser && targetUser.isOnboarded) {
      currentUserXp = targetUser.arenaXp ?? 0

      // Compute user XP Rank and Referrals count in parallel
      const [xpRankCount, referralCount] = await Promise.all([
        this.userModel.countDocuments({
          isOnboarded: true,
          $or: [
            { arenaXp: { $gt: currentUserXp } },
            { arenaXp: currentUserXp, _id: { $lt: targetUser._id } },
          ],
        }),
        this.userModel.countDocuments({
          referredById: targetUser._id,
        }),
      ])

      currentUserXpRank = xpRankCount + 1
      currentUserReferral = referralCount

      // Compute user Referral Rank using the retrieved referralCount
      const rankAggregation = await this.userModel.aggregate([
        { $match: { referredById: { $ne: null } } },
        { $group: { _id: "$referredById", count: { $sum: 1 } } },
        {
          $match: {
            $or: [
              { count: { $gt: currentUserReferral } },
              { count: currentUserReferral, _id: { $lt: targetUser._id } },
            ],
          },
        },
        { $count: "count" },
      ])
      const higherCount = rankAggregation[0]?.count || 0
      currentUserReferralRank = higherCount + 1
    }

    return {
      xp: xpList.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        arenaXp: u.arenaXp ?? 0,
        pvpMatchesLostCount: u.pvpMatchesLostCount ?? 0,
      })),
      referrers: referrerRankings.map((r) => ({
        id: r.referrerUser._id.toString(),
        username: r.referrerUser.username,
        displayName: r.referrerUser.displayName,
        avatarUrl: r.referrerUser.avatarUrl,
        referralCount: r.count,
        arenaXp: r.referrerUser.arenaXp ?? 0,
      })),
      currentUserXp,
      currentUserXpRank,
      currentUserReferral,
      currentUserReferralRank,
    }
  }

  async getReferrals(userId: string) {
    const [user, referees] = await Promise.all([
      this.userModel.findById(userId),
      this.userModel
        .find({
          referredById: new Types.ObjectId(userId),
        })
        .sort({ arenaXp: -1 }),
    ])

    if (!user) throw new NotFoundException("User not found.")

    // Check welcome boosts eligibility
    const cutoffStr = this.configService.get<string>("NEW_USER_CUTOFF_DATE")
    const cutoffDate = cutoffStr ? new Date(cutoffStr) : null
    const isNewUser =
      cutoffDate && user.createdAt && new Date(user.createdAt) >= cutoffDate

    let nextGameMultiplier = 1.0
    let ticketsCount = 0
    let isEligible = false

    if (isNewUser) {
      ticketsCount = await this.pvpTicketModel.countDocuments({
        userId: user._id,
        status: { $ne: "cancelled" },
        couponCode: { $in: [null, undefined] },
      })
      if (ticketsCount === 0) {
        isEligible = true
        nextGameMultiplier = 2.0
      } else if (ticketsCount === 1) {
        isEligible = true
        nextGameMultiplier = 1.5
      }
    }

    if (nextGameMultiplier === 1.0) {
      const activeBoosts = user.activeBoosts || []
      const isBronzeEligible =
        user.arenaXp >= 30 && user.arenaXp <= 499 && !user.hasUsedBronzeBoost

      const candidates: Array<{ type: string; multiplier: number }> = []

      if (isBronzeEligible) {
        candidates.push({ type: "bronze", multiplier: 1.5 })
      }

      for (const b of activeBoosts) {
        if (b.type === "match_based" && b.matchesRemaining > 0) {
          candidates.push({ type: b.source, multiplier: b.multiplier })
        }
      }

      if (candidates.length > 0) {
        const typePriority: Record<string, number> = {
          downtime: 8,
          mission: 6,
          bronze: 4,
          referral: 2,
        }

        candidates.sort((a, b) => {
          if (b.multiplier !== a.multiplier) {
            return b.multiplier - a.multiplier
          }
          const prioA = typePriority[a.type] || 0
          const prioB = typePriority[b.type] || 0
          return prioB - prioA
        })

        nextGameMultiplier = candidates[0].multiplier
      }
    }

    return {
      referralLink: user.username,
      activeBoosts: user.activeBoosts || [],
      hasWonFirstPvpDuel: user.hasWonFirstPvpDuel ?? false,
      welcomeBoosts: {
        isEligible,
        nextGameMultiplier,
        ticketsCount,
      },
      referees: referees.map((r) => ({
        id: r._id.toString(),
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        arenaXp: r.arenaXp ?? 0,
        hasWonFirstPvpDuel: r.hasWonFirstPvpDuel ?? false,
      })),
    }
  }

  async getMatchHistory(userId: string) {
    const uId = new Types.ObjectId(userId)
    // Find resolved matches where user was user1 or user2
    const matches = await this.pvpMatchModel
      .find({
        $or: [{ user1Id: uId }, { user2Id: uId }],
        status: "resolved",
      })
      .sort({ resolvedAt: -1 })
      .limit(30)

    if (matches.length === 0) return []

    const parentMarketIds = [
      ...new Set(matches.map((m) => m.parentMarketId.toString())),
    ].map((id) => new Types.ObjectId(id))
    const ticketIds: Types.ObjectId[] = []
    const opponentIds: Types.ObjectId[] = []

    for (const match of matches) {
      const isUser1 = match.user1Id.toString() === userId
      const myTicketId = isUser1 ? match.ticket1Id : match.ticket2Id
      const oppTicketId = isUser1 ? match.ticket2Id : match.ticket1Id
      const oppId = isUser1 ? match.user2Id : match.user1Id

      ticketIds.push(new Types.ObjectId(myTicketId))
      ticketIds.push(new Types.ObjectId(oppTicketId))
      opponentIds.push(new Types.ObjectId(oppId))
    }

    // Deduplicate ticketIds and opponentIds
    const uniqueTicketIds = [
      ...new Set(ticketIds.map((id) => id.toString())),
    ].map((id) => new Types.ObjectId(id))
    const uniqueOpponentIds = [
      ...new Set(opponentIds.map((id) => id.toString())),
    ].map((id) => new Types.ObjectId(id))

    // Run batch queries in parallel
    const [parents, allChildren, allTickets, opponents] = await Promise.all([
      this.marketModel.find({ _id: { $in: parentMarketIds } }),
      this.marketModel.find({
        parentMarketId: { $in: parentMarketIds },
        marketType: "child",
      }),
      this.pvpTicketModel.find({ _id: { $in: uniqueTicketIds } }),
      this.userModel.find({ _id: { $in: uniqueOpponentIds } }),
    ])

    const allChildIds = allChildren.map((c) => c._id)
    const userIdsForTrades = [uId, ...uniqueOpponentIds]
    const allTrades = await this.marketTradeModel.find({
      userId: { $in: userIdsForTrades },
      marketId: { $in: allChildIds },
      action: "BUY",
    })

    // Construct Maps for quick O(1) lookup
    const parentsMap = new Map<string, any>()
    for (const p of parents) {
      parentsMap.set(p._id.toString(), p)
    }

    const childrenMap = new Map<string, any[]>()
    for (const child of allChildren) {
      if (child.parentMarketId) {
        const pidStr = child.parentMarketId.toString()
        if (!childrenMap.has(pidStr)) {
          childrenMap.set(pidStr, [])
        }
        childrenMap.get(pidStr)!.push(child)
      }
    }

    const ticketsMap = new Map<string, any>()
    for (const t of allTickets) {
      ticketsMap.set(t._id.toString(), t)
    }

    const opponentsMap = new Map<string, any>()
    for (const o of opponents) {
      opponentsMap.set(o._id.toString(), o)
    }

    // Map trades by userId and marketId
    const tradesMap = new Map<string, any>()
    for (const t of allTrades) {
      const key = `${t.userId.toString()}:${t.marketId.toString()}`
      if (!tradesMap.has(key)) {
        tradesMap.set(key, t)
      }
    }

    const result: any[] = []
    for (const match of matches) {
      const parent = parentsMap.get(match.parentMarketId.toString())

      const isUser1 = match.user1Id.toString() === userId
      const myTicketId = isUser1 ? match.ticket1Id : match.ticket2Id
      const oppTicketId = isUser1 ? match.ticket2Id : match.ticket1Id
      const oppId = isUser1 ? match.user2Id : match.user1Id

      const myTicket = ticketsMap.get(myTicketId.toString())
      const oppTicket = ticketsMap.get(oppTicketId.toString())
      const oppUser = opponentsMap.get(oppId.toString())

      let outcome: "WIN" | "LOSS" | "DRAW" = "DRAW"
      if (match.winnerId) {
        outcome = match.winnerId.toString() === userId ? "WIN" : "LOSS"
      }

      const children = childrenMap.get(match.parentMarketId.toString()) || []

      const myPicks = myTicket
        ? myTicket.picks.map((p: any) => {
            const child = children.find(
              (c: any) => c._id.toString() === p.marketId.toString(),
            )
            const trade = tradesMap.get(
              `${uId.toString()}:${p.marketId.toString()}`,
            )
            const investedUsdc = trade ? trade.amountUsdc : 5
            let shares = trade ? trade.shares : 0

            // Self-healing: if shares is equal to investedUsdc, estimate actual shares based on child pools
            if (shares === investedUsdc && child) {
              const yesPool = Number(child.usdcYesAmount ?? 0)
              const noPool = Number(child.usdcNoAmount ?? 0)
              const totalPool = yesPool + noPool
              let yesProb = 50
              if (totalPool > 0) {
                yesProb = (yesPool / totalPool) * 100
              }
              const noProb = 100 - yesProb
              const price = p.selection === "YES" ? yesProb / 100 : noProb / 100
              shares = investedUsdc / (price || 0.5)
            }

            const winningsUsdc = p.isCorrect === true ? shares : 0
            return {
              marketId: p.marketId.toString(),
              optionName: child?.optionName || "Unknown",
              selection: p.selection,
              isCorrect: p.isCorrect,
              yesCondition: child?.yesCondition || "YES",
              noCondition: child?.noCondition || "NO",
              resolvedOutcome: child?.resolvedOutcome || null,
              investedUsdc,
              winningsUsdc,
            }
          })
        : []

      const oppPicks = oppTicket
        ? oppTicket.picks.map((p: any) => {
            const child = children.find(
              (c: any) => c._id.toString() === p.marketId.toString(),
            )
            const trade = tradesMap.get(
              `${oppId.toString()}:${p.marketId.toString()}`,
            )
            const investedUsdc = trade ? trade.amountUsdc : 5
            let shares = trade ? trade.shares : 0

            // Self-healing: if shares is equal to investedUsdc, estimate actual shares based on child pools
            if (shares === investedUsdc && child) {
              const yesPool = Number(child.usdcYesAmount ?? 0)
              const noPool = Number(child.usdcNoAmount ?? 0)
              const totalPool = yesPool + noPool
              let yesProb = 50
              if (totalPool > 0) {
                yesProb = (yesPool / totalPool) * 100
              }
              const noProb = 100 - yesProb
              const price = p.selection === "YES" ? yesProb / 100 : noProb / 100
              shares = investedUsdc / (price || 0.5)
            }

            const winningsUsdc = p.isCorrect === true ? shares : 0
            return {
              marketId: p.marketId.toString(),
              optionName: child?.optionName || "Unknown",
              selection: p.selection,
              isCorrect: p.isCorrect,
              yesCondition: child?.yesCondition || "YES",
              noCondition: child?.noCondition || "NO",
              resolvedOutcome: child?.resolvedOutcome || null,
              investedUsdc,
              winningsUsdc,
            }
          })
        : []

      result.push({
        matchId: match._id.toString(),
        resolvedAt: match.resolvedAt,
        parentMarketId: match.parentMarketId.toString(),
        eventQuestion: parent?.question || "Match Event",
        outcome,
        myScore: myTicket?.score ?? 0,
        oppScore: oppTicket?.score ?? 0,
        xpEarned: myTicket?.xpEarned ?? 0,
        doubleBoostActive: myTicket?.doubleBoostActive ?? false,
        myPicks,
        oppPicks,
        opponent: oppUser
          ? {
              id: oppUser._id.toString(),
              username: oppUser.username,
              displayName: oppUser.displayName,
              avatarUrl: oppUser.avatarUrl,
            }
          : null,
      })
    }

    return result
  }

  async getClaimableWinnings(userId: string) {
    const user = await this.userModel.findById(userId)
    if (!user) throw new NotFoundException("User not found.")

    // Limit to last 30 days for performance
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Find all resolved tickets for this user within the time window
    const resolvedTickets = await this.pvpTicketModel.find({
      userId: new Types.ObjectId(userId),
      status: "resolved",
      updatedAt: { $gte: thirtyDaysAgo },
    })

    if (resolvedTickets.length === 0) {
      return {
        claimableMarketIds: [],
        totalWinningsUsdc: 0,
        claimablePicks: [],
      }
    }

    // Collect all winning picks (isCorrect === true)
    const winningPicks: {
      marketId: Types.ObjectId
      parentMarketId: Types.ObjectId
      selection: string
    }[] = []

    for (const ticket of resolvedTickets) {
      for (const pick of ticket.picks) {
        if (pick.isCorrect === true) {
          winningPicks.push({
            marketId: pick.marketId,
            parentMarketId: ticket.parentMarketId,
            selection: pick.selection,
          })
        }
      }
    }

    if (winningPicks.length === 0) {
      return {
        claimableMarketIds: [],
        totalWinningsUsdc: 0,
        claimablePicks: [],
      }
    }

    // Deduplicate market IDs (user could have same child market across tickets, though unlikely)
    const uniqueMarketIds = [
      ...new Set(winningPicks.map((p) => p.marketId.toString())),
    ]

    // Fetch all relevant child markets and parent markets in parallel
    const uniqueParentIds = [
      ...new Set(winningPicks.map((p) => p.parentMarketId.toString())),
    ]
    const [childMarkets, parentMarkets] = await Promise.all([
      this.marketModel.find({
        _id: { $in: uniqueMarketIds.map((id) => new Types.ObjectId(id)) },
      }),
      this.marketModel.find({
        _id: { $in: uniqueParentIds.map((id) => new Types.ObjectId(id)) },
      }),
    ])

    const childMap = new Map<string, any>()
    for (const child of childMarkets) {
      childMap.set(child._id.toString(), child)
    }

    const parentMap = new Map<string, any>()
    for (const parent of parentMarkets) {
      parentMap.set(parent._id.toString(), parent)
    }

    // Verify on-chain balances to find truly claimable picks
    if (!user.walletAddress) {
      return {
        claimableMarketIds: [],
        totalWinningsUsdc: 0,
        claimablePicks: [],
      }
    }

    // Build batch queries for on-chain balance check
    // We only need the winning outcome's balance for each market
    const batchQueries: { marketId: string; outcomes: string[] }[] = []
    for (const marketIdStr of uniqueMarketIds) {
      const child = childMap.get(marketIdStr)
      if (!child) continue

      const outcomes =
        child.outcomes && child.outcomes.length > 0
          ? child.outcomes
          : ["YES", "NO"]
      batchQueries.push({ marketId: marketIdStr, outcomes })
    }

    // Winnings are claimed directly against the Solana program (claim ix); this
    // informational endpoint no longer reads Arc token balances.
    const balancesMap: Record<string, Record<string, number>> = {}

    // Filter to only picks where the user still holds tokens on-chain
    const claimablePicks: any[] = []
    const claimableMarketIds: string[] = []
    let totalWinningsUsdc = 0

    for (const pick of winningPicks) {
      const marketIdStr = pick.marketId.toString()
      const child = childMap.get(marketIdStr)
      if (!child) continue

      const onChain = balancesMap[marketIdStr]
      if (!onChain) continue

      // Determine the normalized side for balance lookup
      const isMulti = child.outcomeCount && child.outcomeCount > 2
      let balance = 0

      if (isMulti) {
        balance = onChain[pick.selection] ?? 0
      } else {
        // For binary markets, map selection to outcome name for balance lookup
        const outcomes =
          child.outcomes && child.outcomes.length > 0
            ? child.outcomes
            : ["YES", "NO"]
        if (pick.selection === "YES") {
          balance = onChain[outcomes[0]] ?? 0
        } else if (pick.selection === "NO") {
          balance = onChain[outcomes[1]] ?? 0
        } else {
          balance = onChain[pick.selection] ?? 0
        }
      }

      if (balance > 0) {
        // Avoid duplicate market IDs in the final list
        if (!claimableMarketIds.includes(marketIdStr)) {
          claimableMarketIds.push(marketIdStr)
        }

        const parent = parentMap.get(pick.parentMarketId.toString())
        claimablePicks.push({
          marketId: marketIdStr,
          parentMarketId: pick.parentMarketId.toString(),
          eventQuestion: parent?.question || "PvP Event",
          optionName: child.optionName || child.question || "Unknown",
          selection: pick.selection,
          shares: balance,
        })
        totalWinningsUsdc += balance
      }
    }

    return {
      claimableMarketIds,
      totalWinningsUsdc,
      claimablePicks,
    }
  }

  async getAdminStatus(adminId: string) {
    const admin = await this.userModel.findById(adminId)
    if (!admin || admin.role !== "admin") {
      throw new ForbiddenException("Only admins can fetch admin status.")
    }

    const keeper = this.solanaService.keeperAddress
    const balances = keeper
      ? await this.solanaService.getWalletBalances(keeper)
      : { usdc: 0, sol: 0 }
    return {
      adminAddress: keeper,
      // SOL is the native gas token on Solana.
      solBalance: balances.sol,
      usdcBalance: balances.usdc,
    }
  }

  async getContractBalances(adminId: string) {
    const admin = await this.userModel.findById(adminId)
    if (!admin || admin.role !== "admin") {
      throw new ForbiddenException("Only admins can fetch contract balances.")
    }

    // The keeper is the protocol's on-chain signer; monitor its SOL (gas) and
    // USDC. Per-market funds live in individual vault PDAs.
    const keeper = this.solanaService.keeperAddress
    const balances = keeper
      ? await this.solanaService.getWalletBalances(keeper)
      : { usdc: 0, sol: 0 }
    return {
      adminAddress: keeper,
      solBalance: balances.sol,
      usdcBalance: balances.usdc,
    }
  }

  async batchClaimCreatorLiquidity(adminId: string) {
    const admin = await this.userModel.findById(adminId)
    if (!admin || admin.role !== "admin") {
      throw new ForbiddenException("Only admins can claim creator liquidity.")
    }

    // On Solana each creator claims their own royalty directly via the
    // program's `claim_creator_royalty` instruction, so there is no batch admin
    // claim step. Returned for API compatibility with the admin dashboard.
    const resolvedMarkets = await this.marketModel.countDocuments({
      category: "pvp",
      marketType: "child",
      status: "resolved",
    })
    return {
      summary: {
        totalMarkets: resolvedMarkets,
        claimed: 0,
        skipped: resolvedMarkets,
        failed: 0,
      },
      results: [],
    }
  }

  private async calculateSystemMetrics(timeframe?: string) {
    const botUsernames = BOT_PROFILES.map((b) => b.username)

    // Parse timeframe
    const tf = timeframe || "7d";
    const cutoff = new Date();
    if (tf === "1h") {
      cutoff.setHours(cutoff.getHours() - 1);
    } else if (tf === "1d") {
      cutoff.setDate(cutoff.getDate() - 1);
    } else if (tf === "30d") {
      cutoff.setDate(cutoff.getDate() - 30);
    } else {
      cutoff.setDate(cutoff.getDate() - 7);
    }

    // 1. Users count
    const totalUsers = await this.userModel.countDocuments()

    // Get bot user IDs first
    const bots = await this.userModel
      .find({ username: { $in: botUsernames } }, { _id: 1 })
      .lean()
    const botUserIds = new Set(bots.map((b) => b._id.toString()))
    const botsCount = botUserIds.size
    const realUsersCount = Math.max(0, totalUsers - botsCount)

    // 2. PvP User Stats
    const ticketStatsList = await this.pvpTicketModel.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$userId",
          hasPlayed: {
            $max: {
              $cond: [{ $in: ["$status", ["matched", "resolved"]] }, 1, 0],
            },
          },
        },
      },
    ])

    let realUsersSubmittedCount = 0
    let botUsersSubmittedCount = 0
    let realUsersPlayedCount = 0
    let botUsersPlayedCount = 0

    for (const stats of ticketStatsList) {
      if (!stats._id) continue
      const uIdStr = stats._id.toString()
      const isBot = botUserIds.has(uIdStr)

      if (isBot) {
        botUsersSubmittedCount++
        if (stats.hasPlayed === 1) {
          botUsersPlayedCount++
        }
      } else {
        realUsersSubmittedCount++
        if (stats.hasPlayed === 1) {
          realUsersPlayedCount++
        }
      }
    }

    const uniqueUsersWithTicketsAllSize = ticketStatsList.length
    const uniqueUsersWithMatchedTicketsSize = ticketStatsList.filter(
      (s) => s.hasPlayed === 1,
    ).length

    // 3. Count PvP Matches
    const totalPvpMatches = await this.pvpMatchModel.countDocuments()

    // 4. Sum USDC volume and fees from MarketTrades
    const tradeStatsList = await this.marketTradeModel.aggregate([
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
        },
      },
      {
        $unwind: {
          path: "$market",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          overallVolume: { $sum: "$amountUsdc" },
          overallFees: { $sum: "$feeUsdc" },
          pvpVolume: {
            $sum: {
              $cond: [{ $eq: ["$market.category", "pvp"] }, "$amountUsdc", 0],
            },
          },
          pvpFees: {
            $sum: {
              $cond: [{ $eq: ["$market.category", "pvp"] }, "$feeUsdc", 0],
            },
          },
          standardVolume: {
            $sum: {
              $cond: [{ $ne: ["$market.category", "pvp"] }, "$amountUsdc", 0],
            },
          },
          standardFees: {
            $sum: {
              $cond: [{ $ne: ["$market.category", "pvp"] }, "$feeUsdc", 0],
            },
          },
        },
      },
    ])

    const tradeStats = tradeStatsList[0] || {
      overallVolume: 0,
      overallFees: 0,
      pvpVolume: 0,
      pvpFees: 0,
      standardVolume: 0,
      standardFees: 0,
    }

    // 5. Creation fees collected
    const creationFeeStatsList = await this.marketModel.aggregate([
      { $match: { creationFeeTxHash: { $ne: null } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$marketCreationFeeUsdc" },
        },
      },
    ])
    const creationFeesCollected = creationFeeStatsList[0]?.total || 0

    // 6. Recent Trades (within timeframe, max 1000) for line charts
    const recentTrades = await this.marketTradeModel.aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      { $sort: { createdAt: -1 } },
      { $limit: 1000 },
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
        },
      },
      {
        $unwind: {
          path: "$market",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "markets",
          localField: "market.parentMarketId",
          foreignField: "_id",
          as: "parentMarket",
        },
      },
      {
        $unwind: {
          path: "$parentMarket",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          marketId: {
            $cond: {
              if: { $ne: [{ $ifNull: ["$market.parentMarketId", null] }, null] },
              then: "$market.parentMarketId",
              else: "$marketId",
            },
          },
          marketQuestion: {
            $cond: {
              if: { $ne: [{ $ifNull: ["$market.parentMarketId", null] }, null] },
              then: { $ifNull: ["$parentMarket.question", "Unknown Parent Market"] },
              else: { $ifNull: ["$market.question", "Unknown Market"] },
            },
          },
          amountUsdc: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: 1 } },
    ])

    // 7. Activity Timeline data
    const signups = await this.userModel.find({ createdAt: { $gte: cutoff } }, { createdAt: 1 }).lean()
    const trades = await this.marketTradeModel.find({ createdAt: { $gte: cutoff } }, { createdAt: 1 }).lean()
    const tickets = await this.pvpTicketModel.find({ createdAt: { $gte: cutoff } }, { createdAt: 1 }).lean()

    const timeline: { label: string; signups: number; trades: number; tickets: number; start: number; end: number }[] = []
    const nowMs = Date.now()

    if (tf === "1h") {
      // 12 intervals of 5 minutes
      for (let i = 11; i >= 0; i--) {
        const start = nowMs - (i + 1) * 5 * 60 * 1000
        const end = i === 0 ? Infinity : nowMs - i * 5 * 60 * 1000
        const dateObj = new Date(start)
        const label = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes() - (dateObj.getMinutes() % 5)).padStart(2, "0")}`
        timeline.push({ label, signups: 0, trades: 0, tickets: 0, start, end })
      }
    } else if (tf === "1d") {
      // 24 intervals of 1 hour
      for (let i = 23; i >= 0; i--) {
        const start = nowMs - (i + 1) * 60 * 60 * 1000
        const end = i === 0 ? Infinity : nowMs - i * 60 * 60 * 1000
        const dateObj = new Date(start)
        const label = `${String(dateObj.getHours()).padStart(2, "0")}:00`
        timeline.push({ label, signups: 0, trades: 0, tickets: 0, start, end })
      }
    } else if (tf === "30d") {
      // 30 intervals of 1 day
      for (let i = 29; i >= 0; i--) {
        const start = nowMs - (i + 1) * 24 * 60 * 60 * 1000
        const end = i === 0 ? Infinity : nowMs - i * 24 * 60 * 60 * 1000
        const dateObj = new Date(start)
        const label = `${dateObj.getDate()} ${dateObj.toLocaleString("default", { month: "short" })}`
        timeline.push({ label, signups: 0, trades: 0, tickets: 0, start, end })
      }
    } else {
      // 7 intervals of 1 day (7d default)
      for (let i = 6; i >= 0; i--) {
        const start = nowMs - (i + 1) * 24 * 60 * 60 * 1000
        const end = i === 0 ? Infinity : nowMs - i * 24 * 60 * 60 * 1000
        const dateObj = new Date(start)
        const label = dateObj.toLocaleDateString("default", { weekday: "short" })
        timeline.push({ label, signups: 0, trades: 0, tickets: 0, start, end })
      }
    }

    const fillTimeline = (items: any[], key: "signups" | "trades" | "tickets") => {
      for (const item of items) {
        if (!item.createdAt) continue
        const t = new Date(item.createdAt).getTime()
        const bucket = timeline.find((b) => t >= b.start && t < b.end)
        if (bucket) {
          bucket[key]++
        }
      }
    }

    fillTimeline(signups, "signups")
    fillTimeline(trades, "trades")
    fillTimeline(tickets, "tickets")

    const activityTimeline = timeline.map(({ label, signups, trades, tickets }) => ({
      label,
      signups,
      trades,
      tickets,
    }))

    return {
      users: {
        total: totalUsers,
        real: realUsersCount,
        bots: botsCount,
      },
      pvpUsers: {
        submitted: {
          total: uniqueUsersWithTicketsAllSize,
          real: realUsersSubmittedCount,
          bots: botUsersSubmittedCount,
        },
        played: {
          total: uniqueUsersWithMatchedTicketsSize,
          real: realUsersPlayedCount,
          bots: botUsersPlayedCount,
        },
      },
      pvpMatchesCount: totalPvpMatches,
      volumeAndFees: {
        overallVolume: tradeStats.overallVolume,
        overallFees: tradeStats.overallFees,
        standardVolume: tradeStats.standardVolume,
        standardFees: tradeStats.standardFees,
        pvpVolume: tradeStats.pvpVolume,
        pvpFees: tradeStats.pvpFees,
        creationFeesCollected,
        combinedFees: tradeStats.overallFees + creationFeesCollected,
      },
      recentTrades,
      activityTimeline,
    }
  }

  async getAdminMetrics(adminId: string, timeframe?: string) {
    const admin = await this.userModel.findById(adminId)
    if (!admin || admin.role !== "admin") {
      throw new ForbiddenException("Only admins can fetch admin metrics.")
    }
    return this.calculateSystemMetrics(timeframe)
  }

  async getPublicMetrics(timeframe?: string) {
    return this.calculateSystemMetrics(timeframe)
  }
}
