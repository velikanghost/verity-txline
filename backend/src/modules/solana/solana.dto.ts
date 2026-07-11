import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator"

export class StakeDto {
  @ApiProperty({ description: "Mongo market id (child World Cup prop market)" })
  @IsString()
  marketId: string

  @ApiProperty({ description: "Outcome index (0 = NO/default, 1 = YES, …)" })
  @IsInt()
  @Min(0)
  outcome: number

  @ApiProperty({ description: "Stake amount in USDC (human units)" })
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

/** Predicate for one non-default outcome (outcomes 1..count-1). */
export class OutcomeRuleDto {
  @ApiProperty({ description: "Arithmetic op: 0 none, 1 Add, 2 Subtract" })
  @IsInt()
  @Min(0)
  @Max(2)
  op: number

  @ApiProperty({ description: "Logical mode: 0 none, 1 AND, 2 OR" })
  @IsInt()
  @Min(0)
  @Max(2)
  logic: number

  @ApiProperty({ description: "Predicate A threshold" })
  @IsInt()
  threshold: number

  @ApiProperty({ description: "Predicate A comparison: 0 GT, 1 LT, 2 EQ" })
  @IsInt()
  @Min(0)
  @Max(2)
  comparison: number

  @ApiProperty({ description: "Predicate B threshold (logical mode)" })
  @IsInt()
  thresholdB: number

  @ApiProperty({ description: "Predicate B comparison (logical mode)" })
  @IsInt()
  @Min(0)
  @Max(2)
  comparisonB: number
}

export class CreateWorldCupMarketDto {
  @ApiProperty({ description: "TxLINE fixture id" })
  @IsInt()
  fixtureId: number

  @ApiProperty({ description: "Shared stat key A: (period * 1000) + base_key" })
  @IsInt()
  statKey: number

  @ApiPropertyOptional({
    description: "Shared stat key B for relational markets; omit for single-stat",
  })
  @IsOptional()
  @IsInt()
  statKeyB?: number

  @ApiProperty({ description: "Stat period component" })
  @IsInt()
  statPeriod: number

  @ApiProperty({ description: "Total outcomes (2 = binary, 3 = match result, …)" })
  @IsInt()
  @Min(2)
  outcomeCount: number

  @ApiProperty({
    type: [OutcomeRuleDto],
    description: "Predicate per non-default outcome (length outcomeCount - 1)",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OutcomeRuleDto)
  rules: OutcomeRuleDto[]

  @ApiProperty({
    type: [String],
    description: "Outcome labels in on-chain order (index 0 = default)",
  })
  @IsArray()
  @IsString({ each: true })
  outcomes: string[]

  @ApiProperty({ description: "Human-readable market question" })
  @IsString()
  question: string

  @ApiProperty({ description: "Staking deadline, unix seconds" })
  @IsInt()
  deadlineUnix: number
}
