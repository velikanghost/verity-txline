import {
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsPositive,
} from "class-validator"
import { Type } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"

export class CreatePvpEventDto {
  @ApiProperty({
    description: "Title or main question of the PvP match",
    example: "USA vs Paraguay",
  })
  @IsString()
  @IsNotEmpty()
  question: string

  @ApiProperty({
    description:
      "TxLINE fixture id — when set, each prop deploys an on-chain Solana pool that settles via validate_stat",
    required: false,
  })
  @IsInt()
  @IsOptional()
  fixtureId?: number

  @ApiProperty({
    description: "Deadline date when the event starts and predictions lock",
    example: "2026-06-20T18:00:00Z",
  })
  @IsString()
  @IsNotEmpty()
  deadline: string

  @ApiProperty({
    description:
      "Optional lock date when kickoff starts and predictions/trading lock",
    example: "2026-06-20T18:00:00Z",
    required: false,
  })
  @IsString()
  @IsOptional()
  lockTime?: string

  @ApiProperty({
    description: "Official resolution source details",
    example: "ESPN / FIFA Official site",
  })
  @IsString()
  @IsNotEmpty()
  resolutionSource: string

  @ApiProperty({
    description: "Proposition questions/options (minimum 3)",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3)
  options: string[]
}

export class SlateOutcomeRuleDto {
  @IsInt() op: number
  @IsInt() logic: number
  @IsInt() threshold: number
  @IsInt() comparison: number
  @IsInt() thresholdB: number
  @IsInt() comparisonB: number
}

/** One prop market within a slate (spans any fixture). */
export class SlatePropDto {
  @ApiProperty({ description: "TxLINE fixture id for this prop" })
  @IsInt()
  fixtureId: number

  @ApiProperty({ description: "Shared stat key A" })
  @IsInt()
  statKey: number

  @ApiProperty({ required: false, description: "Shared stat key B" })
  @IsOptional()
  @IsInt()
  statKeyB?: number

  @ApiProperty({ description: "Stat period" })
  @IsInt()
  statPeriod: number

  @ApiProperty({ description: "Total outcomes (2 binary, 3 match result, …)" })
  @IsInt()
  outcomeCount: number

  @ApiProperty({ type: [SlateOutcomeRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlateOutcomeRuleDto)
  rules: SlateOutcomeRuleDto[]

  @ApiProperty({ type: [String], description: "Outcome labels, on-chain order" })
  @IsArray()
  @IsString({ each: true })
  outcomes: string[]

  @ApiProperty({ description: "Human-readable prop question" })
  @IsString()
  @IsNotEmpty()
  question: string
}

/** Admin creates a PvP slate: a named contest grouping props across fixtures. */
export class CreateSlateDto {
  @ApiProperty({ description: "Slate name, e.g. 'Matchday 1'" })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ description: "Deadline (predictions lock), ISO string" })
  @IsString()
  @IsNotEmpty()
  deadline: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lockTime?: string

  @ApiProperty({ description: "Resolution source" })
  @IsString()
  @IsNotEmpty()
  resolutionSource: string

  @ApiProperty({ type: [SlatePropDto], description: "Props across fixtures (min 3)" })
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => SlatePropDto)
  props: SlatePropDto[]
}

export class PvpPickInput {
  @ApiProperty({ description: "Child market option ID" })
  @IsString()
  @IsNotEmpty()
  marketId: string

  @ApiProperty({ description: "User choice (outcome label)" })
  @IsString()
  @IsNotEmpty()
  selection: string

  @ApiProperty({ description: "Amount to put on this pick, in USDC (human units)" })
  @IsNumber()
  @IsPositive()
  amountUsdc: number
}

export class SubmitTicketDto {
  @ApiProperty({ description: "Parent market event ID" })
  @IsString()
  @IsNotEmpty()
  parentMarketId: string

  @ApiProperty({
    description: "Picks on options (minimum 3)",
    type: [PvpPickInput],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PvpPickInput)
  @ArrayMinSize(3)
  picks: PvpPickInput[]

  @ApiProperty({
    description: "Optional coupon code for XP multiplier",
    required: false,
  })
  @IsOptional()
  @IsString()
  couponCode?: string
}
