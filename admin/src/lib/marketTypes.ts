// Shared TxLINE settleable-market catalogue.
//
// A "market type" knows how to turn a fixture + a few params into the exact
// N-outcome settlement shape the backend/on-chain program expects (stat keys,
// per-outcome rules, outcome labels). Used by both the single World Cup market
// creator and the PvP slate builder so the two stay perfectly in sync.

// --- settlement config produced by a market type -------------------------
// BuiltConfig is a single binary predicate; BuiltMarket is the N-outcome shape
// the backend expects (binary is just outcomeCount 2).
export interface BuiltConfig {
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

export interface Rule {
  op: number
  logic: number
  threshold: number
  comparison: number
  thresholdB: number
  comparisonB: number
}

export interface BuiltMarket {
  statKey: number
  statKeyB: number
  outcomeCount: number
  rules: Rule[] // length outcomeCount - 1
  outcomes: string[] // on-chain order, index 0 = default
  question: string
}

export type Period = "full" | "h1" | "h2"
export type Team = "1" | "2"
export interface Teams {
  a: string
  b: string
}
export interface ParamState {
  line: number
  team: Team
  scoreA: number
  scoreB: number
  period: Period
  outcome: string
}

export const GT = 0,
  LT = 1,
  EQ = 2
export const OP_NONE = 0,
  OP_ADD = 1,
  OP_SUB = 2
export const LOGIC_AND = 1

// TxLINE full-match base keys: 1/2 goals · 3/4 yellows · 5/6 reds · 7/8 corners
// (odd = Participant 1, even = Participant 2). Period offset encodes the half.
const POFF: Record<Period, number> = { full: 0, h1: 1000, h2: 2000 }
const pLabel: Record<Period, string> = {
  full: "",
  h1: " (1st half)",
  h2: " (2nd half)",
}
const key = (base: number, p: Period) => base + POFF[p]

export type ParamKey = "line" | "team" | "score" | "period" | "outcome"

export interface MarketType {
  id: string
  group: string
  label: (t: Teams) => string
  params: ParamKey[]
  defaultLine?: number
  outcomes?: { value: string; label: (t: Teams) => string }[]
  /** Binary predicate builder (wrapped into a 2-outcome market). */
  build?: (p: ParamState, t: Teams) => BuiltConfig
  /** Full N-outcome builder (e.g. 3-way match result). Takes precedence. */
  buildMarket?: (p: ParamState, t: Teams) => BuiltMarket
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

// Wrap a binary predicate into the N-outcome market shape (outcome 0 = No).
const toBuiltMarket = (c: BuiltConfig): BuiltMarket => ({
  statKey: c.statKey,
  statKeyB: c.op !== 0 || c.logic !== 0 ? c.statKeyB : 0,
  outcomeCount: 2,
  rules: [
    {
      op: c.op,
      logic: c.logic,
      threshold: c.threshold,
      comparison: c.comparison,
      thresholdB: c.thresholdB,
      comparisonB: c.comparisonB,
    },
  ],
  outcomes: ["No", "Yes"],
  question: c.question,
})

// Resolve a market type to its full N-outcome market for the given params.
export const buildMarketFor = (
  mt: MarketType,
  p: ParamState,
  t: Teams,
): BuiltMarket =>
  mt.buildMarket ? mt.buildMarket(p, t) : toBuiltMarket(mt.build!(p, t))

const teamName = (t: Teams, team: Team) => (team === "1" ? t.a : t.b)
const oppGoals = (team: Team, p: Period) =>
  team === "1" ? key(2, p) : key(1, p)
const teamGoals = (team: Team, p: Period) =>
  team === "1" ? key(1, p) : key(2, p)
const teamYellow = (team: Team, p: Period) =>
  team === "1" ? key(3, p) : key(4, p)
const teamCorners = (team: Team, p: Period) =>
  team === "1" ? key(7, p) : key(8, p)

// Full catalogue of settleable markets, grouped for the picker.
export const MARKET_TYPES: MarketType[] = [
  // --- Result ---
  {
    // A single 3-way pool: users pick Home / Draw / Away; the losing outcomes'
    // stakes fund the winner (proper 1X2 parimutuel economics).
    id: "match_result",
    group: "Result",
    label: () => "Match result — 3-way (1X2)",
    params: [],
    buildMarket: (_p, t) => ({
      statKey: 1, // P1 goals
      statKeyB: 2, // P2 goals
      outcomeCount: 3,
      // outcome 0 = Draw (default), 1 = teamA win (A−B>0), 2 = teamB win (A−B<0).
      rules: [
        {
          op: OP_SUB,
          logic: 0,
          threshold: 0,
          comparison: GT,
          thresholdB: 0,
          comparisonB: GT,
        },
        {
          op: OP_SUB,
          logic: 0,
          threshold: 0,
          comparison: LT,
          thresholdB: 0,
          comparisonB: GT,
        },
      ],
      outcomes: ["Draw", t.a, t.b],
      question: `Match result: ${t.a} vs ${t.b}`,
    }),
  },
  {
    id: "winner_single",
    group: "Result",
    label: () => "To win (single team, Yes/No)",
    params: ["outcome"],
    outcomes: [
      { value: "p1", label: (t) => `${t.a} to win` },
      { value: "p2", label: (t) => `${t.b} to win` },
    ],
    build: (p, t) => {
      const cmp = p.outcome === "p2" ? LT : GT
      const q = p.outcome === "p2" ? `${t.b} to win` : `${t.a} to win`
      return base({
        statKey: 1,
        statKeyB: 2,
        op: OP_SUB,
        threshold: 0,
        comparison: cmp,
        question: q,
      })
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
        return base({
          statKey: 1,
          statKeyB: 2,
          op: OP_SUB,
          threshold: 1,
          comparison: LT,
          question: `Draw or ${t.b}`,
        })
      return base({
        statKey: 1,
        statKeyB: 2,
        op: OP_SUB,
        threshold: -1,
        comparison: GT,
        question: `${t.a} or draw`,
      })
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
    build: (p) =>
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

export const GROUPS = ["Result", "Goals", "Corners", "Cards"]

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
// Plain-English condition for one outcome rule over the shared stat pair.
function ruleText(
  r: Rule,
  statKey: number,
  statKeyB: number,
  t: Teams,
): string {
  const a = statName(statKey, t)
  if (r.logic !== 0) {
    const join = r.logic === 1 ? "AND" : "OR"
    return `(${a} ${cmpSym(r.comparison)} ${r.threshold}) ${join} (${statName(statKeyB, t)} ${cmpSym(r.comparisonB)} ${r.thresholdB})`
  }
  if (r.op !== 0) {
    return `${a} ${r.op === OP_ADD ? "+" : "−"} ${statName(statKeyB, t)} ${cmpSym(r.comparison)} ${r.threshold}`
  }
  return `${a} ${cmpSym(r.comparison)} ${r.threshold}`
}

// Full settlement description across a market's outcomes (for the preview).
export function describeMarket(m: BuiltMarket, t: Teams): string {
  if (m.outcomeCount === 2) {
    return `YES if ${ruleText(m.rules[0], m.statKey, m.statKeyB, t)}`
  }
  const lines = m.rules.map(
    (r, i) =>
      `“${m.outcomes[i + 1]}” if ${ruleText(r, m.statKey, m.statKeyB, t)}`,
  )
  lines.push(`otherwise “${m.outcomes[0]}”`)
  return lines.join("  ·  ")
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
