import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

/**
 * A single Merkle proof node as returned by TxLINE and consumed by the
 * on-chain `validate_stat` instruction.
 */
export interface ProofNode {
  hash: number[] // 32 bytes
  isRightSibling: boolean
}

export interface ScoresBatchSummary {
  fixtureId: number
  updateStats: {
    updateCount: number
    minTimestamp: number
    maxTimestamp: number
  }
  eventsSubTreeRoot: number[] // 32 bytes
}

/**
 * Everything a keeper needs to build the on-chain `settle` call for one stat:
 * the fresh Merkle proof plus the observed value.
 */
export interface StatValidation {
  ts: number // = summary.updateStats.minTimestamp (ms); the required targetTs
  statKey: number
  statValue: number
  statPeriod: number
  eventStatRoot: number[]
  statProof: ProofNode[]
  fixtureProof: ProofNode[] // = subTreeProof
  mainTreeProof: ProofNode[]
  fixtureSummary: ScoresBatchSummary
  epochDay: number
}

export interface TxlineFixtureSnapshot {
  FixtureId: number
  CompetitionId?: number
  Participant1: string
  Participant2: string
  Participant1IsHome?: boolean
  StartTime?: string
}

/**
 * Thin client for TxLINE's REST + SSE surface. Handles the guest-JWT bootstrap
 * and (optionally) the activated API token, then exposes snapshot fetchers and
 * the stat-validation proof endpoint used to settle markets on-chain.
 *
 * Auth model (see TxLINE docs): `POST {origin}/auth/guest/start` yields a guest
 * JWT; data endpoints under `{origin}/api/*` additionally require an `X-Api-Token`
 * obtained from the on-chain subscribe + `/api/token/activate` flow. The API
 * token is supplied via config (TXLINE_API_TOKEN) once provisioned.
 */
@Injectable()
export class TxlineService {
  private readonly logger = new Logger(TxlineService.name)
  private readonly origin: string
  private jwt: string | null = null
  private jwtFetchedAt = 0

  constructor(private readonly configService: ConfigService) {
    this.origin =
      this.configService.get<string>("TXLINE_API_ORIGIN") ||
      "https://txline-dev.txodds.com"
  }

  private get apiToken(): string | null {
    return this.configService.get<string>("TXLINE_API_TOKEN") || null
  }

  /** Fetch (and cache for ~50 min) a guest JWT from TxLINE. */
  private async getJwt(): Promise<string> {
    const ageMs = Date.now() - this.jwtFetchedAt
    if (this.jwt && ageMs < 50 * 60 * 1000) return this.jwt

    const res = await fetch(`${this.origin}/auth/guest/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      throw new Error(`TxLINE guest auth failed: ${res.status}`)
    }
    const data = (await res.json()) as { token: string }
    this.jwt = data.token
    this.jwtFetchedAt = Date.now()
    return this.jwt
  }

  private async authedHeaders(): Promise<Record<string, string>> {
    const jwt = await this.getJwt()
    const headers: Record<string, string> = {
      Authorization: `Bearer ${jwt}`,
    }
    if (this.apiToken) headers["X-Api-Token"] = this.apiToken
    return headers
  }

  private async getJson<T>(path: string): Promise<T> {
    const headers = await this.authedHeaders()
    const res = await fetch(`${this.origin}/api${path}`, { headers })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`TxLINE GET ${path} failed: ${res.status} ${body}`)
    }
    return (await res.json()) as T
  }

  /** Fixtures snapshot, optionally scoped to a competition (e.g. World Cup). */
  async getFixtures(competitionId?: number): Promise<TxlineFixtureSnapshot[]> {
    const q = competitionId != null ? `?competitionId=${competitionId}` : ""
    return this.getJson<TxlineFixtureSnapshot[]>(`/fixtures/snapshot${q}`)
  }

  /** Live/last scores snapshot for a fixture. */
  async getScores(fixtureId: number): Promise<unknown> {
    return this.getJson(`/scores/snapshot/${fixtureId}`)
  }

  /** Odds snapshot for a fixture. */
  async getOdds(fixtureId: number): Promise<unknown> {
    return this.getJson(`/odds/snapshot/${fixtureId}`)
  }

  /**
   * Fetch the Merkle proof + observed value for a single stat, mapped into the
   * shape the on-chain `settle` call needs. `statKey` is the encoded key
   * `(period * 1000) + base_key`.
   */
  async getStatValidation(
    fixtureId: number,
    seq: number,
    statKey: number,
  ): Promise<StatValidation> {
    const raw = await this.getJson<any>(
      `/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKey=${statKey}`,
    )
    return this.normalizeStatValidation(raw)
  }

  /**
   * Normalize TxLINE's stat-validation response into the exact structures the
   * on-chain `validate_stat` CPI needs. Field names verified against the live
   * devnet response (see solana/scripts/rehearse-settle.ts):
   *   - proof.statToProve = { key, value, period }
   *   - proof.summary.updateStats.minTimestamp is the required `ts` (ms) — it
   *     is both the seed for the daily_scores PDA epoch day and checked against
   *     the snapshot payload, so it must be used exactly.
   *   - three proof arrays: statProof (stat), subTreeProof (fixture), mainTreeProof
   */
  private normalizeStatValidation(raw: any): StatValidation {
    const toNodes = (arr: any[]): ProofNode[] =>
      (arr || []).map((n) => ({
        hash: this.toByteArray(n.hash),
        isRightSibling: Boolean(n.isRightSibling),
      }))

    const summary = raw.summary ?? {}
    const stats = summary.updateStats ?? {}
    const statToProve = raw.statToProve ?? {}
    // targetTs = minTimestamp (ms). Epoch day = floor(ms / 86_400_000).
    const targetTs = Number(stats.minTimestamp ?? 0)

    return {
      ts: targetTs,
      statKey: Number(statToProve.key),
      statValue: Number(statToProve.value),
      statPeriod: Number(statToProve.period),
      eventStatRoot: this.toByteArray(raw.eventStatRoot),
      statProof: toNodes(raw.statProof),
      fixtureProof: toNodes(raw.subTreeProof),
      mainTreeProof: toNodes(raw.mainTreeProof),
      fixtureSummary: {
        fixtureId: Number(summary.fixtureId),
        updateStats: {
          updateCount: Number(stats.updateCount ?? 0),
          minTimestamp: Number(stats.minTimestamp ?? 0),
          maxTimestamp: Number(stats.maxTimestamp ?? 0),
        },
        eventsSubTreeRoot: this.toByteArray(summary.eventStatsSubTreeRoot),
      },
      epochDay: Math.floor(targetTs / 86400000),
    }
  }

  /** Accepts a base64 string, hex string, or number[] and returns 32 bytes. */
  private toByteArray(input: unknown): number[] {
    if (Array.isArray(input)) return input.map((n) => Number(n) & 0xff)
    if (typeof input === "string") {
      const buf = /^[0-9a-fA-F]{64}$/.test(input)
        ? Buffer.from(input, "hex")
        : Buffer.from(input, "base64")
      return Array.from(buf)
    }
    return new Array(32).fill(0)
  }
}
