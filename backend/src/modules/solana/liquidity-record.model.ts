import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose"

export type SolanaLiquidityDocument = HydratedDocument<SolanaLiquidity>

/**
 * A record that a user added on-chain liquidity to a World Cup market. Written
 * when `/solana/add-liquidity` succeeds, and read by the "has_added_liquidity"
 * mission to verify completion (replacing the old Arc LiquidityEvent ledger).
 */
@Schema({ timestamps: true, versionKey: false })
export class SolanaLiquidity {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId: Types.ObjectId

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Market",
    required: true,
    index: true,
  })
  marketId: Types.ObjectId

  @Prop({ type: Number, required: true })
  amountUsdc: number

  @Prop({ type: String, required: true })
  txSig: string

  createdAt?: Date
  updatedAt?: Date
}

export const SolanaLiquiditySchema = SchemaFactory.createForClass(SolanaLiquidity)
