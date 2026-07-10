"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { apiRequest } from "@/store/apiClient"

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

// --- settlement config produced by a market type -------------------------
interface BuiltConfig {
  statKey: number
  statKeyB: number
  op: number // 0 none, 1 Add, 2 Subtract
  logic: number // 0 none, 1 AND, 2 OR
  threshold: number
  comparison: number // 0 GT, 1 LT, 2 EQ
  thresholdB: number
  comparisonB: number
  question: string
}

type Period = "full" | "h1" | "h2"
type Team = "1" | "2"
interface Teams {
  a: string
  b: string
}
interface ParamState {
  line: number
  team: Team
  scoreA: number
  scoreB: number
  period: Period
  outcome: string
}

const GT = 0,
  LT = 1,
  EQ = 2
const OP_NONE = 0,
  OP_ADD = 1,
  OP_SUB = 2
const LOGIC_AND = 1

// TxLINE full-match base keys: 1/2 goals · 3/4 yellows · 5/6 reds · 7/8 corners
// (odd = Participant 1, even = Participant 2). Period offset encodes the half.
const POFF: Record<Period, number> = { full: 0, h1: 1000, h2: 2000 }
const pLabel: Record<Period, string> = { full: "", h1: " (1st half)", h2: " (2nd half)" }
const key = (base: number, p: Period) => base + POFF[p]

type ParamKey = "line" | "team" | "score" | "period" | "outcome"

interface MarketType {
  id: string
  group: string
  label: (t: Teams) => string
  params: ParamKey[]
  defaultLine?: number
  outcomes?: { value: string; label: (t: Teams) => string }[]
  build: (p: ParamState, t: Teams) => BuiltConfig
}

const base = (o: Partial<BuiltConfig>): BuiltConfig => ({
  statKey: 0,
  statKeyB: 0,
  op: OP_NONE,
  logic: 0,
  threshold: 0,
  comparison: GT,
  thresholdB: 0,
  comparisonB: GT,
  question: "",
  ...o,
})

const teamName = (t: Teams, team: Team) => (team === "1" ? t.a : t.b)
const oppGoals = (team: Team, p: Period) => (team === "1" ? key(2, p) : key(1, p))
const teamGoals = (team: Team, p: Period) => (team === "1" ? key(1, p) : key(2, p))
const teamYellow = (team: Team, p: Period) => (team === "1" ? key(3, p) : key(4, p))
const teamCorners = (team: Team, p: Period) => (team === "1" ? key(7, p) : key(8, p))

// Full catalogue of settleable markets, grouped for the picker.
const MARKET_TYPES: MarketType[] = [
  // --- Result ---
  {
    id: "winner",
    group: "Result",
    label: () => "Match result (winner)",
    params: ["outcome"],
    outcomes: [
      { value: "p1", label: (t) => `${t.a} to win` },
      { value: "draw", label: () => "Draw" },
      { value: "p2", label: (t) => `${t.b} to win` },
    ],
    build: (p, t) => {
      const cmp = p.outcome === "p1" ? GT : p.outcome === "p2" ? LT : EQ
      const q =
        p.outcome === "p1" ? `${t.a} to win` : p.outcome === "p2" ? `${t.b} to win` : "Draw"
      return base({ statKey: 1, statKeyB: 2, op: OP_SUB, threshold: 0, comparison: cmp, question: q })
    },
  },
  {
    id: "double_chance",
    group: "Result",
    label: () => "Double chance",
    params: ["outcome"],
    outcomes: [
      { value: "1x", label: (t) => `${t.a} or draw` },
      { value: "x2", label: (t) => `Draw or ${t.b}` },
    ],
    build: (p, t) => {
      // Integer goals: (A-B) >= 0  ==  (A-B) > -1 ; (A-B) <= 0  ==  (A-B) < 1.
      if (p.outcome === "x2")
        return base({ statKey: 1, statKeyB: 2, op: OP_SUB, threshold: 1, comparison: LT, question: `Draw or ${t.b}` })
      return base({ statKey: 1, statKeyB: 2, op: OP_SUB, threshold: -1, comparison: GT, question: `${t.a} or draw` })
    },
  },
  {
    id: "handicap",
    group: "Result",
    label: () => "Goal handicap",
    params: ["team", "line"],
    defaultLine: 1.5,
    build: (p, t) => {
      const thr = Math.floor(p.line) // -1.5 line => win by 2+ => diff > 1
      const [a, b] = p.team === "1" ? [1, 2] : [2, 1]
      return base({
        statKey: a,
        statKeyB: b,
        op: OP_SUB,
        threshold: thr,
        comparison: GT,
        question: `${teamName(t, p.team)} -${p.line}`,
      })
    },
  },
  // --- Goals ---
  {
    id: "total_goals",
    group: "Goals",
    label: () => "Total goals (over/under)",
    params: ["line", "period"],
    defaultLine: 2.5,
    build: (p, t) =>
      base({
        statKey: key(1, p.period),
        statKeyB: key(2, p.period),
        op: OP_ADD,
        threshold: Math.floor(p.line),
        comparison: GT,
        question: `Over ${p.line} total goals${pLabel[p.period]}`,
      }),
  },
  {
    id: "btts",
    group: "Goals",
    label: () => "Both teams to score (BTTS)",
    params: ["period"],
    build: (p) =>
      base({
        statKey: key(1, p.period),
        statKeyB: key(2, p.period),
        logic: LOGIC_AND,
        threshold: 0,
        comparison: GT,
        thresholdB: 0,
        comparisonB: GT,
        question: `Both teams to score${pLabel[p.period]}`,
      }),
  },
  {
    id: "team_to_score",
    group: "Goals",
    label: (t) => `Team to score (${t.a} / ${t.b})`,
    params: ["team", "period"],
    build: (p, t) =>
      base({
        statKey: teamGoals(p.team, p.period),
        threshold: 0,
        comparison: GT,
        question: `${teamName(t, p.team)} to score${pLabel[p.period]}`,
      }),
  },
  {
    id: "clean_sheet",
    group: "Goals",
    label: () => "Clean sheet",
    params: ["team", "period"],
    build: (p, t) =>
      base({
        statKey: oppGoals(p.team, p.period),
        threshold: 0,
        comparison: EQ,
        question: `${teamName(t, p.team)} clean sheet${pLabel[p.period]}`,
      }),
  },
  {
    id: "exact_total_goals",
    group: "Goals",
    label: () => "Exact total goals",
    params: ["line", "period"],
    defaultLine: 2,
    build: (p) =>
      base({
        statKey: key(1, p.period),
        statKeyB: key(2, p.period),
        op: OP_ADD,
        threshold: Math.round(p.line),
        comparison: EQ,
        question: `Exactly ${Math.round(p.line)} total goals${pLabel[p.period]}`,
      }),
  },
  {
    id: "correct_score",
    group: "Goals",
    label: () => "Correct score",
    params: ["score"],
    build: (p, t) =>
      base({
        statKey: 1,
        statKeyB: 2,
        logic: LOGIC_AND,
        threshold: Math.round(p.scoreA),
        comparison: EQ,
        thresholdB: Math.round(p.scoreB),
        comparisonB: EQ,
        question: `Correct score: ${t.a} ${Math.round(p.scoreA)}–${Math.round(p.scoreB)} ${t.b}`,
      }),
  },
  {
    id: "team_total_goals",
    group: "Goals",
    label: () => "Team total goals (over/under)",
    params: ["team", "line", "period"],
    defaultLine: 1.5,
    build: (p, t) =>
      base({
        statKey: teamGoals(p.team, p.period),
        threshold: Math.floor(p.line),
        comparison: GT,
        question: `${teamName(t, p.team)} over ${p.line} goals${pLabel[p.period]}`,
      }),
  },
  // --- Corners ---
  {
    id: "total_corners",
    group: "Corners",
    label: () => "Total corners (over/under)",
    params: ["line", "period"],
    defaultLine: 9.5,
    build: (p) =>
      base({
        statKey: key(7, p.period),
        statKeyB: key(8, p.period),
        op: OP_ADD,
        threshold: Math.floor(p.line),
        comparison: GT,
        question: `Over ${p.line} total corners${pLabel[p.period]}`,
      }),
  },
  {
    id: "team_corners",
    group: "Corners",
    label: () => "Team corners (over/under)",
    params: ["team", "line", "period"],
    defaultLine: 4.5,
    build: (p, t) =>
      base({
        statKey: teamCorners(p.team, p.period),
        threshold: Math.floor(p.line),
        comparison: GT,
        question: `${teamName(t, p.team)} over ${p.line} corners${pLabel[p.period]}`,
      }),
  },
  {
    id: "most_corners",
    group: "Corners",
    label: () => "Most corners",
    params: ["team"],
    build: (p, t) => {
      const [a, b] = p.team === "1" ? [7, 8] : [8, 7]
      return base({
        statKey: a,
        statKeyB: b,
        op: OP_SUB,
        threshold: 0,
        comparison: GT,
        question: `${teamName(t, p.team)} to have most corners`,
      })
    },
  },
  // --- Cards ---
  {
    id: "total_yellow",
    group: "Cards",
    label: () => "Total yellow cards (over/under)",
    params: ["line", "period"],
    defaultLine: 3.5,
    build: (p) =>
      base({
        statKey: key(3, p.period),
        statKeyB: key(4, p.period),
        op: OP_ADD,
        threshold: Math.floor(p.line),
        comparison: GT,
        question: `Over ${p.line} total yellow cards${pLabel[p.period]}`,
      }),
  },
  {
    id: "total_red",
    group: "Cards",
    label: () => "Total red cards / any red card",
    params: ["line", "period"],
    defaultLine: 0.5,
    build: (p) =>
      base({
        statKey: key(5, p.period),
        statKeyB: key(6, p.period),
        op: OP_ADD,
        threshold: Math.floor(p.line),
        comparison: GT,
        question:
          p.line <= 0.5
            ? `A red card is shown${pLabel[p.period]}`
            : `Over ${p.line} total red cards${pLabel[p.period]}`,
      }),
  },
  {
    id: "team_yellow",
    group: "Cards",
    label: () => "Team yellow cards (over/under)",
    params: ["team", "line", "period"],
    defaultLine: 1.5,
    build: (p, t) =>
      base({
        statKey: teamYellow(p.team, p.period),
        threshold: Math.floor(p.line),
        comparison: GT,
        question: `${teamName(t, p.team)} over ${p.line} yellow cards${pLabel[p.period]}`,
      }),
  },
  {
    id: "most_bookings",
    group: "Cards",
    label: () => "Most bookings (yellows)",
    params: ["team"],
    build: (p, t) => {
      const [a, b] = p.team === "1" ? [3, 4] : [4, 3]
      return base({
        statKey: a,
        statKeyB: b,
        op: OP_SUB,
        threshold: 0,
        comparison: GT,
        question: `${teamName(t, p.team)} to receive more bookings`,
      })
    },
  },
]

const GROUPS = ["Result", "Goals", "Corners", "Cards"]

// Turn a built config into a plain-English settlement rule for the preview.
const cmpSym = (c: number) => (c === GT ? ">" : c === LT ? "<" : "=")
const statTypeByBase: Record<number, string> = {
  1: "goals",
  2: "goals",
  3: "yellow cards",
  4: "yellow cards",
  5: "red cards",
  6: "red cards",
  7: "corners",
  8: "corners",
}
function statName(k: number, t: Teams): string {
  const period = k >= 2000 ? " (2nd half)" : k >= 1000 ? " (1st half)" : ""
  const b = k % 1000
  const who = b % 2 === 1 ? t.a : t.b
  return `${who} ${statTypeByBase[b] ?? "stat"}${period}`
}
function describeRule(c: BuiltConfig, t: Teams): string {
  const a = statName(c.statKey, t)
  if (c.logic !== 0) {
    const join = c.logic === 1 ? "AND" : "OR"
    return `YES if (${a} ${cmpSym(c.comparison)} ${c.threshold}) ${join} (${statName(
      c.statKeyB,
      t,
    )} ${cmpSym(c.comparisonB)} ${c.thresholdB})`
  }
  if (c.op !== 0) {
    return `YES if ${a} ${c.op === OP_ADD ? "+" : "−"} ${statName(c.statKeyB, t)} ${cmpSym(
      c.comparison,
    )} ${c.threshold}`
  }
  return `YES if ${a} ${cmpSym(c.comparison)} ${c.threshold}`
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

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

  const built = useMemo(() => marketType.build(params, teams), [marketType, params, teams])

  // Keep the (editable) question in sync with the selected type/params/teams.
  useEffect(() => {
    setQuestion(built.question)
  }, [built.question])

  const setParam = (patch: Partial<ParamState>) => setParams((p) => ({ ...p, ...patch }))

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
      const twoStat = built.op !== 0 || built.logic !== 0
      const logical = built.logic !== 0
      const res = await apiRequest<{ marketId: string; solanaCreateTxSig: string }>(
        "/solana/admin/create-market",
        {
          method: "POST",
          body: JSON.stringify({
            fixtureId: Number(fixtureId),
            statKey: built.statKey,
            statKeyB: twoStat ? built.statKeyB : undefined,
            op: built.op,
            logic: built.logic,
            statPeriod: 0,
            threshold: built.threshold,
            comparison: built.comparison,
            thresholdB: logical ? built.thresholdB : undefined,
            comparisonB: logical ? built.comparisonB : undefined,
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
          <p className="mt-0.5 font-mono text-[11px] text-stone-700">{describeRule(built, teams)}</p>
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
          <button onClick={load} className="text-xs text-stone-500 hover:text-stone-900">
            Refresh
          </button>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
