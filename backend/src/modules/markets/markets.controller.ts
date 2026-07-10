import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common"
import { MarketsService } from "./markets.service"
import {
  FetchMarketsQueryDto,
  CastFreeVoteDto,
  ExecuteTradeDto,
  ResolveMarketDto,
} from "./markets.dto"
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { AdminGuard } from "../../common/guards/admin.guard"

@ApiTags("markets")
@Controller("markets")
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get()
  @ApiOperation({ summary: "Fetch all prediction markets with filters" })
  @ApiResponse({ status: 200, description: "Markets fetched successfully." })
  async fetchMarkets(@Query() query: FetchMarketsQueryDto) {
    return this.marketsService.fetchMarkets({
      status: query.status as any,
      category: query.category,
      trending: query.trending,
      newest: query.newest,
      qualified: query.qualified,
      open_for_votes: query.open_for_votes,
      admin: query.admin,
    })
  }

  @Get("user-positions/:userId")
  @ApiOperation({
    summary: "Fetch all trading positions for a user across all markets",
  })
  @ApiParam({ name: "userId", description: "User profile ID" })
  async fetchAllUserPositions(@Param("userId") userId: string) {
    return this.marketsService.fetchAllUserPositions(userId)
  }

  @Get("user-trades/:userId")
  @ApiOperation({
    summary: "Fetch all trading history for a user across all markets",
  })
  @ApiParam({ name: "userId", description: "User profile ID" })
  async fetchAllUserTrades(@Param("userId") userId: string) {
    return this.marketsService.fetchAllUserTrades(userId)
  }

  @Get(":marketId")
  @ApiOperation({
    summary: "Get detailed information about a single prediction market",
  })
  @ApiParam({
    name: "marketId",
    description: "Market ID",
    example: "60d0fe4f5311236168a109ca",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "Optional user ID to get viewer vote status",
  })
  @ApiResponse({
    status: 200,
    description: "Market detail fetched successfully.",
  })
  async fetchMarketDetail(
    @Param("marketId") marketId: string,
    @Query("userId") userId?: string,
  ) {
    return this.marketsService.fetchMarketDetail(marketId, userId)
  }

  @Get(":marketId/trades")
  @ApiOperation({ summary: "Get list of recent trades in a prediction market" })
  @ApiParam({
    name: "marketId",
    description: "Market ID",
    example: "60d0fe4f5311236168a109ca",
  })
  @ApiResponse({
    status: 200,
    description: "Recent trades retrieved successfully.",
  })
  async fetchMarketTrades(@Param("marketId") marketId: string) {
    return this.marketsService.fetchMarketTrades(marketId)
  }

  @Post(":marketId/vote")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cast a free vote on a market",
  })
  @ApiParam({
    name: "marketId",
    description: "Market ID",
    example: "60d0fe4f5311236168a109ca",
  })
  @ApiBody({ type: CastFreeVoteDto })
  @ApiResponse({ status: 200, description: "Free vote cast successfully." })
  async castFreeVote(
    @Param("marketId") marketId: string,
    @Body() dto: CastFreeVoteDto,
    @Request() req: any,
  ) {
    const authorId = req.user.id
    return this.marketsService.castFreeVote(marketId, authorId, dto.side)
  }

}
