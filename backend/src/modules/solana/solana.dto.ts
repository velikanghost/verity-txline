import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  Max,
} from "class-validator"

export class StakeDto {
  @ApiProperty({ description: "Mongo market id (child World Cup prop market)" })
  @IsString()
  marketId: string

  @ApiProperty({ description: "0 = NO, 1 = YES", minimum: 0, maximum: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  side: number

  @ApiProperty({ description: "Stake amount in USDC (human units)" })
  @IsNumber()
  @IsPositive()
  amountUsdc: number
}

export class AddLiquidityDto {
  @ApiProperty({ description: "Mongo market id" })
  @IsString()
  marketId: string

  @ApiProperty({ description: "Liquidity amount in USDC (human units)" })
  @IsNumber()
  @IsPositive()
  amountUsdc: number
}

export class ClaimDto {
  @ApiProperty({ description: "Mongo market id" })
  @IsString()
  marketId: string
}

export class SendUsdcDto {
  @ApiProperty({ description: "Recipient Solana wallet address" })
  @IsString()
  toAddress: string

  @ApiProperty({ description: "Amount of USDC to send (human units)" })
  @IsNumber()
  @IsPositive()
  amountUsdc: number
}

export class CreateWorldCupMarketDto {
  @ApiProperty({ description: "TxLINE fixture id" })
  @IsInt()
  fixtureId: number

  @ApiProperty({ description: "Encoded stat key A: (period * 1000) + base_key" })
  @IsInt()
  statKey: number

  @ApiPropertyOptional({
    description: "Second stat key for relational markets; omit for single-stat",
  })
  @IsOptional()
  @IsInt()
  statKeyB?: number

  @ApiPropertyOptional({
    description: "Arithmetic combine op: 0 none, 1 Add, 2 Subtract (default 0)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  op?: number

  @ApiPropertyOptional({
    description: "Logical combine mode: 0 none, 1 AND, 2 OR (BTTS/exact score)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  logic?: number

  @ApiPropertyOptional({ description: "Predicate B threshold (logical mode only)" })
  @IsOptional()
  @IsInt()
  thresholdB?: number

  @ApiPropertyOptional({
    description: "Predicate B comparison: 0 GT, 1 LT, 2 EQ (logical mode only)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  comparisonB?: number

  @ApiProperty({ description: "Stat period component" })
  @IsInt()
  statPeriod: number

  @ApiProperty({ description: "Threshold the observed stat is compared to" })
  @IsInt()
  threshold: number

  @ApiProperty({ description: "0 = GreaterThan, 1 = LessThan, 2 = EqualTo" })
  @IsInt()
  @Min(0)
  @Max(2)
  comparison: number

  @ApiProperty({ description: "Human-readable market question" })
  @IsString()
  question: string

  @ApiProperty({ description: "Staking deadline, unix seconds" })
  @IsInt()
  deadlineUnix: number
}
