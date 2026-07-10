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
import { SolanaLiquidity, SolanaLiquidityDocument } from "./liquidity-record.model"
import { SolanaService } from "./solana.service"
import { TxlineService } from "./txline.service"
import { CircleSolanaWalletService } from "./circle-solana-wallet.service"
import { WorldCupMarketService } from "./worldcup-market.service"
import {
  StakeDto,
  AddLiquidityDto,
  ClaimDto,
  CreateWorldCupMarketDto,
  SendUsdcDto,
} from "./solana.dto"

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
    @InjectModel(SolanaLiquidity.name)
    private readonly liquidityModel: Model<SolanaLiquidityDocument>,
  ) {}

  private async createWorldCupMarket(userId: string, dto: CreateWorldCupMarketDto) {
    const user = await this.userModel.findById(userId)
    const market = await this.worldCupMarketService.createMarket({
      creatorUserId: userId,
      creatorWallet: user?.solanaWalletAddress ?? null,
      fixtureId: dto.fixtureId,
      statKey: dto.statKey,
      statKeyB: dto.statKeyB,
      op: dto.op,
      logic: dto.logic,
      statPeriod: dto.statPeriod,
      threshold: dto.threshold,
      thresholdB: dto.thresholdB,
      comparisonB: dto.comparisonB,
      comparison: dto.comparison,
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

  @Post("create-market")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a World Cup prop market + on-chain pool" })
  async createMarketUser(@Request() req: any, @Body() dto: CreateWorldCupMarketDto) {
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
      dto.side,
      toBaseUnits(dto.amountUsdc),
    )
    const txSig = await this.circleSolanaWalletService.signAndBroadcast(
      req.user.id,
      [ix],
    )
    return { txSig }
  }

  @Post("add-liquidity")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Provide liquidity to a World Cup prop market" })
  async addLiquidity(@Request() req: any, @Body() dto: AddLiquidityDto) {
    const { market, wallet } = await this.resolveMarketAndUser(
      req.user.id,
      dto.marketId,
    )
    const ix = await this.solanaService.buildAddLiquidityInstruction(
      market.txlineFixtureId!,
      market.solanaMarketNonce!,
      wallet,
      toBaseUnits(dto.amountUsdc),
    )
    const txSig = await this.circleSolanaWalletService.signAndBroadcast(
      req.user.id,
      [ix],
    )
    // Record the LP action so the "has_added_liquidity" mission can verify it.
    await this.liquidityModel.create({
      userId: req.user.id,
      marketId: market._id,
      amountUsdc: dto.amountUsdc,
      txSig,
    })
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

  @Get("markets")
  @ApiOperation({ summary: "List World Cup prop markets" })
  async listMarkets() {
    const markets = await this.marketModel
      .find({ category: "worldcup", txlineFixtureId: { $ne: null } })
      .sort({ createdAt: -1 })
      .lean()
    return markets.map((m: any) => ({
      id: m._id.toString(),
      question: m.question,
      status: m.status,
      fixtureId: m.txlineFixtureId,
      matchup: m.txlineMatchup ?? null,
      statKey: m.txlineStatKey,
      threshold: m.txlineThreshold,
      comparison: m.txlineComparison,
      deadline: m.deadline,
      yesCondition: m.yesCondition,
      noCondition: m.noCondition,
      resolvedOutcome: m.resolvedOutcome,
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
    const state = await this.solanaService.readPoolState(
      market.txlineFixtureId,
      market.solanaMarketNonce,
    )
    return {
      yesPool: state.yesPool?.toString(),
      noPool: state.noPool?.toString(),
      totalLpDeposits: state.totalLpDeposits?.toString(),
      resolved: state.resolved,
      voided: state.voided,
      winningSide: state.winningSide,
    }
  }
}
