"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { apiRequest } from "@/store/apiClient"
import {
  MARKET_TYPES,
  GROUPS,
  buildMarketFor,
  describeMarket,
  toDatetimeLocal,
  type MarketType,
  type ParamKey,
  type ParamState,
  type Period,
  type Team,
  type Teams,
} from "@/lib/marketTypes"

interface WorldCupMarket {
  id: string
  question: string
  status: string
  fixtureId: number
  matchup: string | null
  statKey: number
  solanaMarketPda: string | null
  solanaCreateTxSig: string | null
  solanaResolveTxSig: string | null
  solanaSettled: boolean
}

interface Fixture {
  fixtureId: number
  competitionId: number | null
  participant1: string
  participant2: string
  startTime: string | null
}

// Small labelled field wrapper with a one-line description under the label.
function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="font-semibold text-stone-700">{label}</span>
      {hint && <span className="text-[10px] leading-tight text-stone-400">{hint}</span>}
      {children}
    </label>
  )
}

const inputCls = "rounded-md border border-stone-200 px-2 py-1.5"

export default function WorldCupTab() {
  const [markets, setMarkets] = useState<WorldCupMarket[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [fixturesLoading, setFixturesLoading] = useState(false)

  const [fixtureId, setFixtureId] = useState("")
  const [typeId, setTypeId] = useState("total_goals")
  const [params, setParams] = useState<ParamState>({
    line: 2.5,
    team: "1",
    scoreA: 1,
    scoreB: 0,
    period: "full",
    outcome: "p1",
  })
  const [question, setQuestion] = useState("")
  const [deadline, setDeadline] = useState("")

  const marketType = useMemo(
    () => MARKET_TYPES.find((m) => m.id === typeId) ?? MARKET_TYPES[0],
    [typeId],
  )
  const selectedFixture = fixtures.find((f) => String(f.fixtureId) === fixtureId)
  const teams: Teams = selectedFixture
    ? { a: selectedFixture.participant1, b: selectedFixture.participant2 }
    : { a: "Team A", b: "Team B" }

  const built = useMemo(
    () => buildMarketFor(marketType, params, teams),
    [marketType, params, teams],
  )

  // Keep the (editable) question in sync with the selected type/params/teams.
  useEffect(() => {
    setQuestion(built.question)
  }, [built.question])

  const setParam = (patch: Partial<ParamState>) => setParams((p) => ({ ...p, ...patch }))

  const [pruning, setPruning] = useState(false)
  const prune = async () => {
    setPruning(true)
    try {
      const res = await apiRequest<{ scanned: number; pruned: number }>(
        "/solana/admin/prune-stale",
        { method: "POST" },
      )
      toast.success(`Pruned ${res.pruned} stale market(s) of ${res.scanned} scanned.`)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Prune failed")
    } finally {
      setPruning(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      setMarkets(await apiRequest<WorldCupMarket[]>("/solana/markets"))
    } catch (e: any) {
      toast.error(e?.message || "Failed to load markets")
    } finally {
      setLoading(false)
    }
  }

  // Admin force-settle: keeper-miss safety net. Fetches a fresh TxLINE proof
  // and settles the market on-chain now.
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const forceSettle = async (m: WorldCupMarket) => {
    if (
      !confirm(
        `Force-settle "${m.question}" now via a fresh TxLINE proof? The match must have published data.`,
      )
    )
      return
    setSettlingId(m.id)
    try {
      const res = await apiRequest<{
        status: string
        txSig: string
        resolvedOutcome?: string
      }>(`/markets/${m.id}/force-settle`, { method: "POST" })
      toast.success(
        res.status === "voided"
          ? "Market voided."
          : `Settled → ${res.resolvedOutcome} (${res.txSig.slice(0, 8)}…)`,
      )
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Force settle failed")
    } finally {
      setSettlingId(null)
    }
  }

  const loadFixtures = async () => {
    setFixturesLoading(true)
    try {
      setFixtures(await apiRequest<Fixture[]>("/solana/fixtures"))
    } catch (e: any) {
      toast.error(e?.message || "Failed to load fixtures")
    } finally {
      setFixturesLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadFixtures()
  }, [])

  const selectFixture = (id: string) => {
    setFixtureId(id)
    const f = fixtures.find((x) => String(x.fixtureId) === id)
    if (f?.startTime && !deadline) setDeadline(toDatetimeLocal(f.startTime))
  }

  const onSelectType = (id: string) => {
    setTypeId(id)
    const mt = MARKET_TYPES.find((m) => m.id === id)
    // Sensible defaults for the newly selected type.
    setParams((p) => ({
      ...p,
      line: mt?.defaultLine ?? p.line,
      outcome: mt?.outcomes?.[0]?.value ?? p.outcome,
    }))
  }

  const submit = async () => {
    if (!fixtureId) return toast.error("Select a TxLINE fixture.")
    if (!deadline) return toast.error("Pick a staking deadline.")
    setSubmitting(true)
    try {
      const res = await apiRequest<{ marketId: string; solanaCreateTxSig: string }>(
        "/solana/admin/create-market",
        {
          method: "POST",
          body: JSON.stringify({
            fixtureId: Number(fixtureId),
            statKey: built.statKey,
            statKeyB: built.statKeyB || undefined,
            statPeriod: 0,
            outcomeCount: built.outcomeCount,
            rules: built.rules,
            outcomes: built.outcomes,
            question: question || built.question,
            deadlineUnix: Math.floor(new Date(deadline).getTime() / 1000),
          }),
        },
      )
      toast.success(`Market created + pool deployed (${res.solanaCreateTxSig.slice(0, 8)}…)`)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Create failed")
    } finally {
      setSubmitting(false)
    }
  }

  const needs = (k: ParamKey) => marketType.params.includes(k)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-900">Create World Cup market</h2>
        <p className="mt-1 text-xs text-stone-500">
          Pick a match and a market — the on-chain parimutuel pool + TxLINE settlement rule are
          built for you.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5 text-xs">
          {/* Fixture */}
          <Field
            className="col-span-2"
            label="Match"
            hint="The fixture this market settles on — pulled live from TxLINE."
          >
            <div className="flex gap-1.5">
              <select
                value={fixtureId}
                onChange={(e) => selectFixture(e.target.value)}
                className={`min-w-0 flex-1 ${inputCls}`}
              >
                <option value="">
                  {fixturesLoading ? "Loading fixtures…" : "Select a match…"}
                </option>
                {fixtures.map((f) => (
                  <option key={f.fixtureId} value={f.fixtureId}>
                    {f.participant1} vs {f.participant2}
                    {f.startTime ? ` · ${new Date(f.startTime).toLocaleString()}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadFixtures}
                disabled={fixturesLoading}
                className="shrink-0 rounded-md border border-stone-200 px-2 text-stone-500 hover:bg-stone-50 disabled:opacity-50"
                title="Refresh fixtures"
              >
                ↻
              </button>
            </div>
          </Field>

          {/* Market type */}
          <Field
            className="col-span-2"
            label="Market"
            hint="What users bet on. Everything below is derived from this."
          >
            <select
              value={typeId}
              onChange={(e) => onSelectType(e.target.value)}
              className={inputCls}
            >
              {GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {MARKET_TYPES.filter((m) => m.group === g).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label(teams)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          {/* Contextual parameters */}
          {needs("outcome") && marketType.outcomes && (
            <Field className="col-span-2" label="Outcome" hint="Which result this market pays out on.">
              <select
                value={params.outcome}
                onChange={(e) => setParam({ outcome: e.target.value })}
                className={inputCls}
              >
                {marketType.outcomes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label(teams)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {needs("team") && (
            <Field label="Team" hint="Which team this market is about.">
              <select
                value={params.team}
                onChange={(e) => setParam({ team: e.target.value as Team })}
                className={inputCls}
              >
                <option value="1">{teams.a}</option>
                <option value="2">{teams.b}</option>
              </select>
            </Field>
          )}

          {needs("line") && (
            <Field label="Line" hint="The over/under (or handicap) line, e.g. 2.5.">
              <input
                type="number"
                step="0.5"
                value={params.line}
                onChange={(e) => setParam({ line: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
          )}

          {needs("period") && (
            <Field label="Period" hint="Which part of the match counts.">
              <select
                value={params.period}
                onChange={(e) => setParam({ period: e.target.value as Period })}
                className={inputCls}
              >
                <option value="full">Full match</option>
                <option value="h1">1st half</option>
                <option value="h2">2nd half</option>
              </select>
            </Field>
          )}

          {needs("score") && (
            <>
              <Field label={`${teams.a} goals`} hint="Exact goals for the home side.">
                <input
                  type="number"
                  min={0}
                  value={params.scoreA}
                  onChange={(e) => setParam({ scoreA: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label={`${teams.b} goals`} hint="Exact goals for the away side.">
                <input
                  type="number"
                  min={0}
                  value={params.scoreB}
                  onChange={(e) => setParam({ scoreB: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </>
          )}

          {/* Question */}
          <Field
            className="col-span-2"
            label="Question (shown to users)"
            hint="Auto-written from the market above — edit if you want."
          >
            <input value={question} onChange={(e) => setQuestion(e.target.value)} className={inputCls} />
          </Field>

          {/* Staking deadline */}
          <Field
            className="col-span-2"
            label="Staking deadline"
            hint="Staking closes at this time — set it at or before kickoff."
          >
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Settlement-rule preview */}
        <div className="mt-4 rounded-lg bg-stone-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Settles trustlessly via TxLINE
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-stone-700">{describeMarket(built, teams)}</p>
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="mt-4 w-full rounded-lg bg-stone-900 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {submitting ? "Deploying pool…" : "Create market + deploy pool"}
        </button>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">World Cup markets</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={prune}
              disabled={pruning}
              className="text-xs text-amber-600 hover:text-amber-800 disabled:opacity-50"
              title="Mark markets with incompatible (pre-redeploy) on-chain accounts as stale"
            >
              {pruning ? "Pruning…" : "Prune stale"}
            </button>
            <button onClick={load} className="text-xs text-stone-500 hover:text-stone-900">
              Refresh
            </button>
          </div>
        </div>
        {loading ? (
          <p className="mt-3 text-xs text-stone-400">Loading…</p>
        ) : markets.length === 0 ? (
          <p className="mt-3 text-xs text-stone-400">No markets yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {markets.map((m) => (
              <li key={m.id} className="rounded-lg border border-stone-100 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-800">{m.question}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      m.solanaSettled
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-stone-500">
                  {m.matchup ?? `Fixture ${m.fixtureId}`}
                </div>
                {m.solanaResolveTxSig && (
                  <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                    settled {m.solanaResolveTxSig.slice(0, 8)}…
                  </div>
                )}
                {!m.solanaSettled &&
                  m.status !== "resolved" &&
                  m.status !== "voided" && (
                    <button
                      onClick={() => forceSettle(m)}
                      disabled={settlingId === m.id}
                      className="mt-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      title="Settle now via a fresh TxLINE proof (keeper-miss safety net)"
                    >
                      {settlingId === m.id ? "Settling…" : "Force settle"}
                    </button>
                  )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
