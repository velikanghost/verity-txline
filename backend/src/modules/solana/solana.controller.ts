import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common"
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { PublicKey } from "@solana/web3.js"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { AdminGuard } from "../../common/guards/admin.guard"
import { User, UserDocument } from "../users/users.model"
import { Market, MarketDocument } from "../markets/markets.model"
import { SolanaService } from "./solana.service"
import { TxlineService } from "./txline.service"
import { CircleSolanaWalletService } from "./circle-solana-wallet.service"
import { WorldCupMarketService } from "./worldcup-market.service"
import { StakeDto, ClaimDto, CreateWorldCupMarketDto, SendUsdcDto } from "./solana.dto"

const toBaseUnits = (usdc: number): bigint => BigInt(Math.round(usdc * 1e6))

@ApiTags("solana")
@Controller("solana")
export class SolanaController {
  constructor(
    private readonly solanaService: SolanaService,
    private readonly txlineService: TxlineService,
    private readonly circleSolanaWalletService: CircleSolanaWalletService,
    private readonly worldCupMarketService: WorldCupMarketService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Market.name) private readonly marketModel: Model<MarketDocument>,
  ) {}

  private async createWorldCupMarket(userId: string, dto: CreateWorldCupMarketDto) {
    const market = await this.worldCupMarketService.createMarket({
      creatorUserId: userId,
      fixtureId: dto.fixtureId,
      statKey: dto.statKey,
      statKeyB: dto.statKeyB,
      statPeriod: dto.statPeriod,
      outcomeCount: dto.outcomeCount,
      rules: dto.rules,
      outcomes: dto.outcomes,
      question: dto.question,
      deadlineUnix: dto.deadlineUnix,
    })
    return {
      marketId: market._id.toString(),
      solanaMarketPda: market.solanaMarketPda,
      solanaCreateTxSig: market.solanaCreateTxSig,
    }
  }

  @Post("admin/create-market")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: create a World Cup prop market + on-chain pool" })
  async createMarketAdmin(@Request() req: any, @Body() dto: CreateWorldCupMarketDto) {
    return this.createWorldCupMarket(req.user.id, dto)
  }

  private async resolveMarketAndUser(userId: string, marketId: string) {
    const market = await this.marketModel.findById(marketId)
    if (!market) throw new NotFoundException("Market not found.")
    if (market.txlineFixtureId == null || market.solanaMarketNonce == null) {
      throw new BadRequestException("Market is not a Solana World Cup market.")
    }
    const user = await this.userModel.findById(userId)
    if (!user?.solanaWalletAddress) {
      throw new BadRequestException("User has no Solana wallet provisioned.")
    }
    return { market, wallet: new PublicKey(user.solanaWalletAddress) }
  }

  @Post("stake")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Stake USDC on a World Cup prop market (YES/NO)" })
  async stake(@Request() req: any, @Body() dto: StakeDto) {
    const { market, wallet } = await this.resolveMarketAndUser(
      req.user.id,
      dto.marketId,
    )
    const ix = await this.solanaService.buildStakeInstruction(
      market.txlineFixtureId!,
      market.solanaMarketNonce!,
      wallet,
      dto.outcome,
      toBaseUnits(dto.amountUsdc),
    )
    const txSig = await this.circleSolanaWalletService.signAndBroadcast(
      req.user.id,
      [ix],
    )
    return { txSig }
  }

  @Post("send")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send USDC from the caller's wallet to another address" })
  async send(@Request() req: any, @Body() dto: SendUsdcDto) {
    const user = await this.userModel.findById(req.user.id)
    if (!user?.solanaWalletAddress) {
      throw new BadRequestException("No Solana wallet provisioned.")
    }
    const ixs = this.solanaService.buildUsdcTransferInstructions(
      new PublicKey(user.solanaWalletAddress),
      new PublicKey(dto.toAddress),
      toBaseUnits(dto.amountUsdc),
    )
    const txSig = await this.circleSolanaWalletService.signAndBroadcast(
      req.user.id,
      ixs,
    )
    return { txSig }
  }

  @Post("claim")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Claim winnings / LP fee from a resolved market" })
  async claim(@Request() req: any, @Body() dto: ClaimDto) {
    const { market, wallet } = await this.resolveMarketAndUser(
      req.user.id,
      dto.marketId,
    )
    const ix = await this.solanaService.buildClaimInstruction(
      market.txlineFixtureId!,
      market.solanaMarketNonce!,
      wallet,
    )
    const txSig = await this.circleSolanaWalletService.signAndBroadcast(
      req.user.id,
      [ix],
    )
    return { txSig }
  }

  @Get("balance")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the caller's Solana USDC + SOL balance" })
  async balance(@Request() req: any) {
    const user = await this.userModel.findById(req.user.id)
    if (!user?.solanaWalletAddress) return { usdc: 0, sol: 0 }
    return this.solanaService.getWalletBalances(user.solanaWalletAddress)
  }

  @Get("fixtures")
  @ApiOperation({ summary: "List TxLINE fixtures (for the create-market picker)" })
  async fixtures(@Query("competitionId") competitionId?: string) {
    const fixtures = await this.txlineService.getFixtures(
      competitionId ? Number(competitionId) : undefined,
    )
    return fixtures.map((f) => ({
      fixtureId: f.FixtureId,
      competitionId: f.CompetitionId ?? null,
      participant1: f.Participant1,
      participant2: f.Participant2,
      startTime: f.StartTime ?? null,
    }))
  }

  @Post("admin/prune-stale")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Admin: mark fixture markets with incompatible on-chain accounts as stale",
  })
  async pruneStale() {
    const markets = await this.marketModel.find({
      txlineFixtureId: { $ne: null },
      solanaMarketNonce: { $ne: null },
      solanaSettled: { $ne: true },
      status: { $nin: ["stale", "resolved", "voided"] },
    })
    let pruned = 0
    for (const m of markets) {
      const onchain = await this.solanaService.tryReadPoolState(
        m.txlineFixtureId!,
        m.solanaMarketNonce!,
      )
      if (!onchain) {
        m.status = "stale"
        m.solanaSettled = true
        await m.save()
        pruned++
      }
    }
    return { scanned: markets.length, pruned }
  }

  @Get("markets")
  @ApiOperation({ summary: "List World Cup prop markets" })
  async listMarkets() {
    const markets = await this.marketModel
      .find({
        category: "worldcup",
        txlineFixtureId: { $ne: null },
        status: { $ne: "stale" },
      })
      .sort({ createdAt: -1 })
      .lean()
    return markets.map((m: any) => ({
      id: m._id.toString(),
      question: m.question,
      status: m.status,
      fixtureId: m.txlineFixtureId,
      matchup: m.txlineMatchup ?? null,
      statKey: m.txlineStatKey,
      outcomeCount: m.txlineOutcomeCount ?? m.outcomes?.length ?? 2,
      outcomes: m.outcomes ?? [m.noCondition, m.yesCondition],
      deadline: m.deadline,
      yesCondition: m.yesCondition,
      noCondition: m.noCondition,
      resolvedOutcome: m.resolvedOutcome,
      winningOutcomeIndex: m.winningOutcomeIndex ?? null,
      solanaMarketPda: m.solanaMarketPda,
      solanaCreateTxSig: m.solanaCreateTxSig,
      solanaResolveTxSig: m.solanaResolveTxSig,
      solanaSettled: m.solanaSettled,
    }))
  }

  @Get("market/:marketId/pool")
  @ApiOperation({ summary: "Read on-chain pool state for a market" })
  async pool(@Param("marketId") marketId: string) {
    const market = await this.marketModel.findById(marketId)
    if (
      !market ||
      market.txlineFixtureId == null ||
      market.solanaMarketNonce == null
    ) {
      throw new NotFoundException("Solana market not found.")
    }
    let state: any
    try {
      state = await this.solanaService.readPoolState(
        market.txlineFixtureId,
        market.solanaMarketNonce,
      )
    } catch {
      // Account created by an older program layout (pre-N-outcome redeploy) or
      // not yet on-chain: degrade gracefully instead of 500-ing.
      return { stale: true, pools: [], totalLpDeposits: "0", resolved: false, voided: false }
    }
    const count = state.outcomeCount as number
    return {
      pools: (state.pools as any[]).slice(0, count).map((p) => p.toString()),
      totalLpDeposits: state.totalLpDeposits?.toString(),
      resolved: state.resolved,
      voided: state.voided,
      winningOutcome: state.winningOutcome,
    }
  }
}
