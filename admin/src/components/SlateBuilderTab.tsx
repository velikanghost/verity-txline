"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { Trash2 } from "lucide-react"
import { apiRequest } from "@/store/apiClient"
import {
  MARKET_TYPES,
  GROUPS,
  buildMarketFor,
  describeMarket,
  toDatetimeLocal,
  type ParamKey,
  type ParamState,
  type Period,
  type Team,
  type Teams,
} from "@/lib/marketTypes"

interface Fixture {
  fixtureId: number
  competitionId: number | null
  participant1: string
  participant2: string
  startTime: string | null
}

// One prop the admin has committed to the slate — carries everything the
// backend needs plus display context (the fixture matchup + human question).
interface SlateProp {
  fixtureId: number
  matchup: string
  question: string
  statKey: number
  statKeyB: number
  outcomeCount: number
  rules: {
    op: number
    logic: number
    threshold: number
    comparison: number
    thresholdB: number
    comparisonB: number
  }[]
  outcomes: string[]
  settlement: string
}

const inputCls = "rounded-md border border-stone-200 px-2 py-1.5"

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
      {hint && (
        <span className="text-[10px] leading-tight text-stone-400">{hint}</span>
      )}
      {children}
    </label>
  )
}

export default function SlateBuilderTab() {
  // Slate-level fields.
  const [name, setName] = useState("")
  const [resolutionSource, setResolutionSource] = useState("TxLINE")
  const [deadline, setDeadline] = useState("")

  // Committed props.
  const [props, setProps] = useState<SlateProp[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Fixtures.
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [fixturesLoading, setFixturesLoading] = useState(false)

  // Prop composer.
  const [fixtureId, setFixtureId] = useState("")
  const [typeId, setTypeId] = useState("match_result")
  const [params, setParams] = useState<ParamState>({
    line: 2.5,
    team: "1",
    scoreA: 1,
    scoreB: 0,
    period: "full",
    outcome: "p1",
  })
  const [question, setQuestion] = useState("")

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

  const setParam = (patch: Partial<ParamState>) =>
    setParams((p) => ({ ...p, ...patch }))

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
    loadFixtures()
  }, [])

  const onSelectType = (id: string) => {
    setTypeId(id)
    const mt = MARKET_TYPES.find((m) => m.id === id)
    setParams((p) => ({
      ...p,
      line: mt?.defaultLine ?? p.line,
      outcome: mt?.outcomes?.[0]?.value ?? p.outcome,
    }))
  }

  const needs = (k: ParamKey) => marketType.params.includes(k)

  const addProp = () => {
    if (!fixtureId || !selectedFixture)
      return toast.error("Select a match for this prop.")
    const prop: SlateProp = {
      fixtureId: Number(fixtureId),
      matchup: `${selectedFixture.participant1} vs ${selectedFixture.participant2}`,
      question: question || built.question,
      statKey: built.statKey,
      statKeyB: built.statKeyB || 0,
      outcomeCount: built.outcomeCount,
      rules: built.rules,
      outcomes: built.outcomes,
      settlement: describeMarket(built, teams),
    }
    setProps((prev) => [...prev, prop])
    toast.success("Prop added to slate.")
  }

  const removeProp = (index: number) =>
    setProps((prev) => prev.filter((_, i) => i !== index))

  const submit = async () => {
    if (!name.trim()) return toast.error("Give the slate a name.")
    if (!deadline) return toast.error("Pick a lineup deadline.")
    if (props.length < 3)
      return toast.error("A slate needs at least 3 props.")
    setSubmitting(true)
    try {
      const res = await apiRequest<{
        slateId: string
        name: string
        marketIds: string[]
      }>("/pvp/slates", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          deadline: new Date(deadline).toISOString(),
          resolutionSource: resolutionSource.trim() || "TxLINE",
          props: props.map((p) => ({
            fixtureId: p.fixtureId,
            statKey: p.statKey,
            statKeyB: p.statKeyB || undefined,
            statPeriod: 0,
            outcomeCount: p.outcomeCount,
            rules: p.rules,
            outcomes: p.outcomes,
            question: p.question,
          })),
        }),
      })
      toast.success(
        `Slate "${res.name}" created with ${res.marketIds.length} markets.`,
      )
      setName("")
      setDeadline("")
      setProps([])
    } catch (e: any) {
      toast.error(e?.message || "Slate creation failed")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = name.trim() && deadline && props.length >= 3 && !submitting

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: slate details + prop composer */}
      <section className="flex flex-col gap-6">
        {/* Slate details */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-bold text-stone-900">PvP slate</h2>
          <p className="mt-1 text-xs text-stone-500">
            A slate is one cross-game contest. Players build a lineup of at
            least 3 picks from these props and get matched 1v1.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5 text-xs">
            <Field
              className="col-span-2"
              label="Slate name"
              hint="Shown to players, e.g. 'Matchday 1' or 'Quarter-finals Special'."
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Matchday 1"
                className={inputCls}
              />
            </Field>
            <Field
              label="Lineup deadline"
              hint="Lineups lock at this time."
            >
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field
              label="Resolution source"
              hint="Where results come from."
            >
              <input
                value={resolutionSource}
                onChange={(e) => setResolutionSource(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Prop composer */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-bold text-stone-900">Add a prop</h2>
          <p className="mt-1 text-xs text-stone-500">
            Each prop is a real TxLINE-settled market across any fixture. Add at
            least 3.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5 text-xs">
            {/* Fixture */}
            <Field
              className="col-span-2"
              label="Match"
              hint="This prop settles on this fixture — props can span different games."
            >
              <div className="flex gap-1.5">
                <select
                  value={fixtureId}
                  onChange={(e) => setFixtureId(e.target.value)}
                  className={`min-w-0 flex-1 ${inputCls}`}
                >
                  <option value="">
                    {fixturesLoading ? "Loading fixtures…" : "Select a match…"}
                  </option>
                  {fixtures.map((f) => (
                    <option key={f.fixtureId} value={f.fixtureId}>
                      {f.participant1} vs {f.participant2}
                      {f.startTime
                        ? ` · ${new Date(f.startTime).toLocaleString()}`
                        : ""}
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
              hint="What players predict. Everything below is derived from this."
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

            {needs("outcome") && marketType.outcomes && (
              <Field
                className="col-span-2"
                label="Outcome"
                hint="Which result this prop pays out on."
              >
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
              <Field label="Team" hint="Which team this prop is about.">
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
              <Field label="Line" hint="Over/under (or handicap) line, e.g. 2.5.">
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
                  onChange={(e) =>
                    setParam({ period: e.target.value as Period })
                  }
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
                <Field
                  label={`${teams.a} goals`}
                  hint="Exact goals for the home side."
                >
                  <input
                    type="number"
                    min={0}
                    value={params.scoreA}
                    onChange={(e) =>
                      setParam({ scoreA: Number(e.target.value) })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field
                  label={`${teams.b} goals`}
                  hint="Exact goals for the away side."
                >
                  <input
                    type="number"
                    min={0}
                    value={params.scoreB}
                    onChange={(e) =>
                      setParam({ scoreB: Number(e.target.value) })
                    }
                    className={inputCls}
                  />
                </Field>
              </>
            )}

            <Field
              className="col-span-2"
              label="Question (shown to players)"
              hint="Auto-written — edit if you want."
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Settlement preview */}
          <div className="mt-4 rounded-lg bg-stone-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Settles trustlessly via TxLINE
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-stone-700">
              {describeMarket(built, teams)}
            </p>
          </div>

          <button
            onClick={addProp}
            disabled={!fixtureId}
            className="mt-4 w-full rounded-lg border border-stone-900 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-900 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-stone-900"
          >
            + Add prop to slate
          </button>
        </div>
      </section>

      {/* Right: committed props + create */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">
            Slate props ({props.length})
          </h2>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              props.length >= 3
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {props.length >= 3
              ? "Ready"
              : `${3 - props.length} more needed`}
          </span>
        </div>

        {props.length === 0 ? (
          <p className="mt-3 text-xs text-stone-400">
            No props yet. Build one on the left and add it here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {props.map((p, i) => (
              <li
                key={i}
                className="rounded-lg border border-stone-100 p-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-stone-800">
                      {p.question}
                    </div>
                    <div className="mt-0.5 text-[11px] text-stone-500">
                      {p.matchup}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-stone-400">
                      {p.settlement}
                    </div>
                  </div>
                  <button
                    onClick={() => removeProp(i)}
                    className="shrink-0 rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove prop"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-5 w-full rounded-lg bg-stone-900 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {submitting
            ? "Deploying slate…"
            : `Create slate + deploy ${props.length} pool${props.length === 1 ? "" : "s"}`}
        </button>
      </section>
    </div>
  )
}
