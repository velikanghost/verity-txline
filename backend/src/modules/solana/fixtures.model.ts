import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument } from "mongoose"

export type TxlineFixtureDocument = HydratedDocument<TxlineFixture>

/**
 * A cached TxLINE World Cup fixture, kept fresh by the SSE/snapshot poller so
 * the admin market-creation flow and the frontend fixture browser can read it
 * without hitting TxLINE on every request.
 */
@Schema({ timestamps: true, versionKey: false })
export class TxlineFixture {
  @Prop({ type: Number, required: true, unique: true, index: true })
  fixtureId: number

  @Prop({ type: Number, default: null, index: true })
  competitionId: number | null

  @Prop({ type: String, required: true, trim: true })
  participant1: string

  @Prop({ type: String, required: true, trim: true })
  participant2: string

  @Prop({ type: Boolean, default: true })
  participant1IsHome: boolean

  @Prop({ type: Date, default: null, index: true })
  startTime: Date | null

  /** TxLINE game phase id (1 = not started … 19 = postponed). */
  @Prop({ type: Number, default: 1 })
  gamePhase: number

  @Prop({ type: Number, default: 0 })
  participant1Score: number

  @Prop({ type: Number, default: 0 })
  participant2Score: number

  /** Latest sequence number seen for this fixture on the scores feed. */
  @Prop({ type: Number, default: 0 })
  latestSeq: number

  /** True once the fixture has finished (phase implies full-time/ended). */
  @Prop({ type: Boolean, default: false, index: true })
  ended: boolean

  createdAt?: Date
  updatedAt?: Date
}

export const TxlineFixtureSchema = SchemaFactory.createForClass(TxlineFixture)
