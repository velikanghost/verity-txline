import {
  Injectable,
  NotFoundException,
  ConflictException,
  // NotImplementedException,
  Inject,
  forwardRef,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types /*SortOrder*/ } from "mongoose"
import {
  Market,
  MarketDocument,
  Vote,
  VoteDocument,
  DailyVoteUsage,
  DailyVoteUsageDocument,
  MarketPosition,
  MarketPositionDocument,
  MarketTrade,
  MarketTradeDocument,
  VoteSide,
  MarketStatus,
} from "./markets.model"
import { User, UserDocument } from "../users/users.model"
import { Post, PostDocument } from "../posts/posts.model"
import { PostsService, MarketResponse } from "../posts/posts.service"
import { SocketGateway } from "../socket/socket.gateway"
import { NotificationsService } from "../notifications/notifications.service"
import { PvpService } from "../pvp/pvp.service"

export interface DailyVotesResponse {
  votesLimit: number
  votesUsed: number
  votesRemaining: number
  date: string
}

export interface VoteResponse {
  market: MarketResponse
  dailyVotes: DailyVotesResponse
}

export interface MarketHistoryResponse {
  id: string
  marketId: string
  marketQuestion: string
  side: VoteSide
  created_at: string
  market_question?: string | null
}

export interface MarketPositionResponse {
  id: string
  market_id: string
  user_id: string
  side: VoteSide
  shares: number
  avg_price: number
  invested_usdc: number
  realized_pnl: number
  created_at: string
  updated_at: string
  market_question?: string | null
  usdc_yes_amount?: number
  usdc_no_amount?: number
  status?: string
  resolved_outcome?: string | null
  category?: string | null
}

export interface MarketTradeResponse {
  id: string
  market_id: string
  user_id: string
  side: VoteSide
  action: string
  shares: number
  price: number
  amount_usdc: number
  fee_usdc: number
  gross_usdc: number
  tx_hash: string | null
  created_at: string
  market_question?: string | null
}

@Injectable()
export class MarketsService implements OnModuleInit {
  private readonly logger = new Logger(MarketsService.name)

  async onModuleInit() {
    try {
      const result = await this.marketModel.updateMany(
        { status: "open_for_votes" },
        { $set: { status: "qualified" } },
      )
      if (result.modifiedCount > 0) {
        this.logger.log(
          `Successfully migrated ${result.modifiedCount} 'open_for_votes' markets to 'qualified' status.`,
        )
      }
    } catch (err) {
      this.logger.error(
        `Failed to migrate legacy markets status: ${err.message}`,
      )
    }
  }

  constructor(
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
    @InjectModel(Vote.name) private voteModel: Model<VoteDocument>,
    @InjectModel(DailyVoteUsage.name)
    private dailyVoteUsageModel: Model<DailyVoteUsageDocument>,
    @InjectModel(MarketPosition.name)
    private marketPositionModel: Model<MarketPositionDocument>,
    @InjectModel(MarketTrade.name)
    private marketTradeModel: Model<MarketTradeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @Inject(forwardRef(() => PostsService))
    private readonly postsService: PostsService,
    private readonly socketGateway: SocketGateway,
    private readonly notificationsService: NotificationsService,
    private readonly pvpService: PvpService,
  ) {}

  private todayKey(date = new Date()): string {
    return date.toISOString().slice(0, 10)
  }

  private serializeDailyUsage(
    usage: DailyVoteUsageDocument | null,
    date = this.todayKey(),
  ): DailyVotesResponse {
    const votesLimit = usage?.votesLimit ?? 10
    const votesUsed = usage?.votesUsed ?? 0
    return {
      votesLimit,
      votesUsed,
      votesRemaining: Math.max(0, votesLimit - votesUsed),
      date,
    }
  }

  private isDuplicateKeyError(error: any): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
  }

  private serializePosition(
    position: MarketPositionDocument,
  ): MarketPositionResponse {
    const createdAt = position.createdAt
      ? new Date(position.createdAt).toISOString()
      : new Date().toISOString()
    const updatedAt = position.updatedAt
      ? new Date(position.updatedAt).toISOString()
      : new Date().toISOString()

    const m = position.marketId as any
    const market_question =
      m && typeof m === "object" && "question" in m ? m.question : null
    const usdc_yes_amount =
      m && typeof m === "object" && "usdcYesAmount" in m ? m.usdcYesAmount : 0
    const usdc_no_amount =
      m && typeof m === "object" && "usdcNoAmount" in m ? m.usdcNoAmount : 0
    const status = m && typeof m === "object" && "status" in m ? m.status : null
    const resolved_outcome =
      m && typeof m === "object" && "resolvedOutcome" in m
        ? m.resolvedOutcome
        : null

    const category =
      m && typeof m === "object" && "category" in m ? m.category : null

    return {
      id: position.id || (position as any)._id?.toString(),
      market_id:
        m && typeof m === "object" && "_id" in m
          ? m._id.toString()
          : position.marketId
            ? position.marketId.toString()
            : "",
      user_id: position.userId.toString(),
      side: position.side,
      shares: position.shares,
      avg_price: position.avgPrice,
      invested_usdc: position.investedUsdc,
      realized_pnl: position.realizedPnl,
      created_at: createdAt,
      updated_at: updatedAt,
      market_question,
      usdc_yes_amount,
      usdc_no_amount,
      status,
      resolved_outcome,
      category,
    }
  }

  private serializeTrade(trade: MarketTradeDocument): MarketTradeResponse {
    const createdAt = trade.createdAt
      ? new Date(trade.createdAt).toISOString()
      : new Date().toISOString()

    const m = trade.marketId as any
    const marketIdStr =
      m && typeof m === "object" && "_id" in m
        ? m._id.toString()
        : trade.marketId
          ? trade.marketId.toString()
          : ""

    return {
      id: trade.id || (trade as any)._id?.toString(),
      market_id: marketIdStr,
      user_id: trade.userId?.toString() || "",
      side: trade.side,
      action: trade.action,
      shares: trade.shares,
      price: trade.price,
      amount_usdc: trade.amountUsdc,
      fee_usdc: trade.feeUsdc,
      gross_usdc: trade.grossUsdc,
      tx_hash: trade.txHash,
      created_at: createdAt,
    }
  }

  async getDailyVotes(
    userId: string,
    date = this.todayKey(),
  ): Promise<DailyVotesResponse> {
    const usage = await this.dailyVoteUsageModel.findOne({
      userId: new Types.ObjectId(userId),
      date,
    })
    return this.serializeDailyUsage(usage, date)
  }

  private async getOrCreateDailyUsage(
    userId: string,
    date = this.todayKey(),
  ): Promise<DailyVoteUsageDocument> {
    return this.dailyVoteUsageModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), date },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          date,
          votesUsed: 0,
          votesLimit: 10,
        },
      },
      { upsert: true, new: true, runValidators: true },
    )
  }

  private async reserveDailyVote(
    userId: string,
    date = this.todayKey(),
  ): Promise<DailyVoteUsageDocument> {
    await this.getOrCreateDailyUsage(userId, date)

    const usage = await this.dailyVoteUsageModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        date,
        $expr: { $lt: ["$votesUsed", "$votesLimit"] },
      },
      { $inc: { votesUsed: 1 } },
      { new: true, runValidators: true },
    )

    if (!usage) {
      throw new ConflictException(
        "You have used all 10 votes today. Votes reset tomorrow.",
      )
    }

    return usage
  }

  private async releaseDailyVote(
    userId: string,
    date = this.todayKey(),
  ): Promise<void> {
    await this.dailyVoteUsageModel.updateOne(
      { userId: new Types.ObjectId(userId), date, votesUsed: { $gt: 0 } },
      { $inc: { votesUsed: -1 } },
    )
  }

  async castFreeVote(
    marketId: string,
    userId: string,
    side: VoteSide,
  ): Promise<VoteResponse> {
    const [market, userExists] = await Promise.all([
      this.marketModel.findById(marketId),
      this.userModel.exists({ _id: userId }),
    ])

    if (!market) {
      throw new NotFoundException("Market not found.")
    }
    if (!userExists) {
      throw new NotFoundException("User not found.")
    }
    if (
      !["open_for_votes", "qualified", "funding_pool", "tradable"].includes(
        market.status,
      )
    ) {
      throw new ConflictException("This market is not open for free voting.")
    }

    const existingVote = await this.voteModel.exists({
      marketId: new Types.ObjectId(marketId),
      userId: new Types.ObjectId(userId),
      voteType: "free",
    })
    if (existingVote) {
      throw new ConflictException("You have already voted on this market.")
    }

    const usageDate = this.todayKey()
    const usage = await this.reserveDailyVote(userId, usageDate)
    try {
      await this.voteModel.create({
        marketId: new Types.ObjectId(marketId),
        userId: new Types.ObjectId(userId),
        side,
        voteType: "free",
      })
    } catch (error) {
      await this.releaseDailyVote(userId, usageDate)
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException("You have already voted on this market.")
      }
      throw error
    }

    const [freeYesVotes, freeNoVotes, uniqueVotersCount] = await Promise.all([
      this.voteModel.countDocuments({
        marketId: new Types.ObjectId(marketId),
        voteType: "free",
        side: "YES",
      }),
      this.voteModel.countDocuments({
        marketId: new Types.ObjectId(marketId),
        voteType: "free",
        side: "NO",
      }),
      this.voteModel
        .distinct("userId", {
          marketId: new Types.ObjectId(marketId),
          voteType: "free",
        })
        .then((ids) => ids.length),
    ])
    const totalFreeVotes = freeYesVotes + freeNoVotes

    const updatedMarket = await this.marketModel.findByIdAndUpdate(
      marketId,
      {
        freeYesVotes,
        freeNoVotes,
        totalFreeVotes,
        uniqueVotersCount,
      },
      { new: true, runValidators: true },
    )

    this.logger.log(
      `Free vote casted on market ${marketId} by user ${userId}. Side: ${side}`,
    )

    // Emit Socket events
    this.socketGateway.broadcastToRoom("feed", "feed-updated", {})
    this.socketGateway.broadcastToRoom(`market:${marketId}`, "market-updated", {
      marketId,
    })
    this.socketGateway.broadcastToRoom(
      `post:${market.postId}`,
      "post-updated",
      { postId: market.postId.toString() },
    )

    return {
      market: this.postsService.serializeMarket(updatedMarket!),
      dailyVotes: this.serializeDailyUsage(usage, usageDate),
    }
  }

  async fetchMarkets(filters: {
    status?: MarketStatus
    category?: string
    qualified?: boolean
    open_for_votes?: boolean
    trending?: boolean
    newest?: boolean
    admin?: boolean
  }): Promise<MarketResponse[]> {
    const query: Record<string, unknown> = {}
    if (filters.status) query.status = filters.status
    if (filters.category) query.category = filters.category
    if (filters.qualified) query.status = "qualified"
    if (filters.open_for_votes) query.status = "open_for_votes"

    if (filters.admin) {
      query.$or = [
        {
          marketType: { $in: ["binary", "parent"] },
          category: { $ne: "pvp" },
        },
        {
          marketType: "child",
          category: "pvp",
        },
      ]
    } else {
      // We only want to show binary/parent markets, NOT child markets!
      query.marketType = { $ne: "child" }
    }

    const sort: Record<string, any> = filters.trending
      ? { totalFreeVotes: -1, uniqueVotersCount: -1, createdAt: -1 }
      : { createdAt: filters.newest === false ? 1 : -1 }

    const markets = await this.marketModel.find(query).sort(sort).limit(100)

    // Fetch child markets for any parent markets in the list
    const parentMarketIds = markets
      .filter((m) => m.marketType === "parent")
      .map((m) => m._id)

    const allChildMarkets =
      parentMarketIds.length > 0
        ? await this.marketModel.find({
            parentMarketId: { $in: parentMarketIds },
          })
        : []

    const childMarketsMap = new Map<string, MarketDocument[]>()
    for (const child of allChildMarkets) {
      const parentIdStr = child.parentMarketId!.toString()
      if (!childMarketsMap.has(parentIdStr)) {
        childMarketsMap.set(parentIdStr, [])
      }
      childMarketsMap.get(parentIdStr)!.push(child)
    }

    return markets.map((m) => {
      const children = childMarketsMap.get(m.id) || []
      return this.postsService.serializeMarket(m, children)
    })
  }

  async fetchMarketDetail(marketId: string, viewerProfileId?: string) {
    const market = await this.marketModel.findById(marketId)
    if (!market) {
      throw new NotFoundException("Market not found.")
    }

    return this.postsService.findPostById(
      market.postId.toString(),
      viewerProfileId,
    )
  }

  async fetchMarketTrades(marketId: string): Promise<MarketTradeResponse[]> {
    const trades = await this.marketTradeModel
      .find({
        marketId: new Types.ObjectId(marketId),
      })
      .sort({ createdAt: -1 })
      .limit(25)

    return trades.map((t) => this.serializeTrade(t))
  }

  async fetchAllUserPositions(
    userId: string,
  ): Promise<MarketPositionResponse[]> {
    const positions = await this.marketPositionModel
      .find({
        userId: new Types.ObjectId(userId),
        $or: [{ shares: { $gt: 0 } }, { isArchived: true }],
      })
      .populate("marketId")
      .sort({ updatedAt: -1 })

    return positions.map((p) => this.serializePosition(p))
  }

  async getTopPredictors(limit = 10): Promise<any[]> {
    const pipeline: any[] = [
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
        },
      },
      { $unwind: "$market" },
      {
        $match: {
          "market.status": "resolved",
          "market.resolvedOutcome": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$userId",
          totalPredictions: { $sum: 1 },
          wonPredictions: {
            $sum: {
              $cond: [{ $eq: ["$side", "$market.resolvedOutcome"] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          accuracy: {
            $cond: [
              { $gt: ["$totalPredictions", 0] },
              {
                $multiply: [
                  { $divide: ["$wonPredictions", "$totalPredictions"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $sort: {
          accuracy: -1,
          totalPredictions: -1,
        },
      },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ]

    const result = await this.marketPositionModel.aggregate(pipeline)

    return result.map((r) => {
      const user = r.user
      return {
        id: user._id.toString(),
        wallet_address: user.walletAddress,
        walletAddress: user.walletAddress,
        username: user.username,
        display_name: user.displayName,
        displayName: user.displayName,
        avatar_url: user.avatarUrl,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        signalPoints: user.signalPoints,
        arenaXp: user.arenaXp,
        doubleBoostRemaining: (user.activeBoosts || [])
          .filter(
            (b: any) => b.source === "referral" && b.type === "match_based",
          )
          .reduce((sum: number, b: any) => sum + (b.matchesRemaining || 0), 0),
        downtimeBoostRemaining: (user.activeBoosts || [])
          .filter(
            (b: any) => b.source === "downtime" && b.type === "match_based",
          )
          .reduce((sum: number, b: any) => sum + (b.matchesRemaining || 0), 0),
        hasWonFirstPvpDuel: user.hasWonFirstPvpDuel,
        pvpMatchesWonCount: user.pvpMatchesWonCount,
        pvpMatchesLostCount: user.pvpMatchesLostCount,
        pvpMatchesDrawnCount: user.pvpMatchesDrawnCount,
        created_at: user.createdAt?.toISOString(),
        createdAt: user.createdAt?.toISOString(),
        updatedAt: user.updatedAt?.toISOString(),
        isOnboarded: user.isOnboarded,
        referredById: user.referredById?.toString(),
        accuracy: Math.round(r.accuracy),
        totalPredictions: r.totalPredictions,
      }
    })
  }

  async fetchAllUserTrades(userId: string): Promise<MarketTradeResponse[]> {
    const trades = await this.marketTradeModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .populate("marketId")
      .sort({ createdAt: -1 })

    return trades.map((t) => {
      const serialized = this.serializeTrade(t)
      const m = t.marketId as any
      const market_question =
        m && typeof m === "object" && "question" in m ? m.question : null
      return {
        ...serialized,
        market_question,
      }
    })
  }
}
