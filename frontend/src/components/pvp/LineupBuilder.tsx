"use client";

import { useMemo, useState } from "react";
import { Check, Swords, Target, Trophy } from "lucide-react";
import toast from "@/lib/toast";
import { useAuth } from "@/components/providers/AuthModals";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useSubmitPvpTicketMutation } from "@/store/verity/verityQueries";
import ArenaCategory from "@/components/markets/PvpArenaCategory";

interface PropOption {
  id: string;
  question?: string;
  status?: string;
  outcomeCount?: number;
  outcomes?: string[];
  outcomePrices?: number[];
  yesCondition?: string;
  noCondition?: string;
  usdcYesAmount?: number;
  usdcNoAmount?: number;
  volume?: number;
  txlineMatchup?: string | null;
  txlineFixtureId?: number | null;
}

interface Slate {
  id: string;
  question: string;
  deadline?: string;
  lockTime?: string;
  options: PropOption[];
}

// Outcome labels in on-chain order (index 0 = default). The submitted
// `selection` must be one of these exact strings.
const propOutcomes = (opt: PropOption): string[] => {
  if (opt.outcomes && opt.outcomes.length > 0) return opt.outcomes;
  return [opt.noCondition || "No", opt.yesCondition || "Yes"];
};

// Implied price (0..1) per outcome index, from pool sizes when available.
const outcomePrice = (opt: PropOption, labels: string[], i: number): number => {
  if (labels.length > 2) {
    return opt.outcomePrices?.[i] ?? 1 / labels.length;
  }
  const yes = Number(opt.usdcYesAmount ?? 0);
  const no = Number(opt.usdcNoAmount ?? 0);
  const total = yes + no;
  if (total <= 0) return 0.5;
  // index 1 = Yes/affirmative, index 0 = No/default.
  return i === 1 ? yes / total : no / total;
};

// Affirmative option first for binary; default (index 0) last.
const displayOrder = (labels: string[]): number[] =>
  labels.length <= 2
    ? [1, 0]
    : [...labels.map((_, i) => i).filter((i) => i !== 0), 0];

export default function LineupBuilder({
  slate,
  onSubmitted,
}: {
  slate: Slate;
  onSubmitted: () => void;
}) {
  const { authenticated, login } = useAuth();
  const { rawBalance, formattedBalance } = useUsdcBalance();
  const submit = useSubmitPvpTicketMutation();

  const [picks, setPicks] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [amountAll, setAmountAll] = useState("1");

  const pickIds = Object.keys(picks);
  const pickCount = pickIds.length;

  const togglePick = (opt: PropOption, label: string) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (next[opt.id] === label) delete next[opt.id];
      else {
        next[opt.id] = label;
        setAmounts((a) => (a[opt.id] ? a : { ...a, [opt.id]: amountAll }));
      }
      return next;
    });
  };

  const setAmount = (id: string, v: string) =>
    setAmounts((prev) => ({ ...prev, [id]: v }));

  const applyAll = (v: string) => {
    setAmountAll(v);
    setAmounts((prev) => {
      const next = { ...prev };
      for (const id of pickIds) next[id] = v;
      return next;
    });
  };

  const total = useMemo(
    () => pickIds.reduce((s, id) => s + (Number(amounts[id]) || 0), 0),
    [pickIds, amounts],
  );
  const allAmountsValid = pickIds.every((id) => Number(amounts[id]) > 0);
  const enoughBalance =
    BigInt(Math.round(total * 1e6)) <= (rawBalance || BigInt(0));
  const canSubmit =
    pickCount >= 3 && allAmountsValid && enoughBalance && !submit.isPending;

  const totalVolume = useMemo(
    () => slate.options.reduce((s, o) => s + Number(o.volume ?? 0), 0),
    [slate],
  );

  const deadlineLabel = useMemo(() => {
    const t = slate.lockTime || slate.deadline;
    if (!t) return "";
    return new Date(t).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [slate]);

  const handleSubmit = async () => {
    if (!authenticated) return login();
    if (pickCount < 3) return toast.error("Pick at least 3 props.");
    if (!allAmountsValid) return toast.error("Set an amount on every pick.");
    if (!enoughBalance)
      return toast.error(
        `Not enough USDC. Lineup needs ${total} but you have ${formattedBalance}.`,
      );

    await toast.promise(
      submit.mutateAsync({
        parentMarketId: slate.id,
        picks: pickIds.map((id) => ({
          marketId: id,
          selection: picks[id],
          amountUsdc: Number(amounts[id]),
        })),
      }),
      {
        loading: "Backing your lineup…",
        success: "Lineup in — finding you an opponent.",
        error: (e) => e?.message || "Could not submit lineup",
      },
    );
    setPicks({});
    setAmounts({});
    onSubmitted();
  };

  return (
    <div className="pvp-lineup-builder flex flex-col gap-5 pb-56 lg:pb-6">
      {/* Slate header */}
      <div className="flex flex-col gap-1 pb-1">
        <h1 className="text-2xl font-black leading-tight text-charcoal-primary ">
          {slate.question}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
          <span>{slate.options.length} props</span>
          <span>·</span>
          <span>Vol ${totalVolume.toLocaleString()}</span>
          <span>·</span>
          <span>Minimum 3 picks</span>
          {deadlineLabel && (
            <>
              <span>·</span>
              <span>Locks {deadlineLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Prop cards */}
      <div className="flex flex-col gap-3">
        {slate.options.map((opt) => {
          const labels = propOutcomes(opt);
          const order = displayOrder(labels);
          const selected = picks[opt.id];
          const isMulti = labels.length > 2;
          const accent = selected ? "emerald" : isMulti ? "emerald" : "amber";

          return (
            <ArenaCategory
              key={opt.id}
              title={opt.question || "Prop"}
              subtitle={opt.txlineMatchup || "TxLINE prop"}
              icon={
                isMulti ? (
                  <Trophy className="h-4 w-4" />
                ) : (
                  <Target className="h-4 w-4" />
                )
              }
              accentColor={accent}
              volume={Number(opt.volume ?? 0)}
              hasSelection={Boolean(selected)}
              showLp={false}
            >
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(order.length, 3)}, minmax(0, 1fr))`,
                }}
              >
                {order.map((i) => {
                  const label = labels[i];
                  const isSel = selected === label;
                  const cents = (outcomePrice(opt, labels, i) * 100).toFixed(1);
                  return (
                    <button
                      key={label + i}
                      type="button"
                      onClick={() => togglePick(opt, label)}
                      disabled={submit.isPending}
                      className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl p-3.5 text-xs transition-all clickable disabled:opacity-50 ${
                        isSel
                          ? "bg-[#1479ff] font-bold text-white shadow-[0_9px_24px_rgba(20,121,255,.22)]"
                          : "bg-[#FAF9F6] font-medium text-charcoal-primary hover:bg-[#F3F1EC] "
                      }`}
                    >
                      <span className="text-center font-bold leading-tight">
                        {label}
                      </span>
                      <span
                        className={`mt-1 font-mono text-[9px] opacity-70 ${
                          isSel ? "text-zinc-400 " : "text-ash"
                        }`}
                      >
                        {cents}¢
                      </span>
                      {isSel && (
                        <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#FF3E00] text-white ring-2 ring-white ">
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Per-pick amount */}
              {selected && (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-200/70 pt-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                    Your amount
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={amounts[opt.id] ?? ""}
                      onChange={(e) => setAmount(opt.id, e.target.value)}
                      className="h-8 w-24 rounded-lg border border-stone-300 bg-white px-2 text-right text-xs font-mono font-bold text-charcoal-primary "
                      placeholder="0"
                    />
                    <span className="text-[10px] font-bold text-ash">USDC</span>
                  </div>
                </div>
              )}
            </ArenaCategory>
          );
        })}
      </div>

      {/* Sticky summary / submit */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+108px)] z-40 px-4 lg:sticky lg:bottom-4 lg:px-0">
        <div className="pvp-lineup-summary verity-card mx-auto flex max-w-[820px] flex-col gap-2.5 border border-stone-200/70 bg-warm-canvas p-4 ">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                Same on all
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={amountAll}
                onChange={(e) => applyAll(e.target.value)}
                className="h-8 w-16 rounded-lg border border-stone-300 bg-white px-2 text-right text-xs font-mono font-bold text-charcoal-primary "
              />
            </div>
            <div className="text-right" aria-live="polite">
              <span className="font-mono text-sm font-black text-charcoal-primary ">
                {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                USDC
              </span>
              <span className="ml-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                · {pickCount} picks
              </span>
            </div>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[#241b4a]/10"
            aria-hidden="true"
          >
            <span
              className="pvp-pick-progress block h-full rounded-full"
              style={{ width: `${Math.min(100, (pickCount / 3) * 100)}%` }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={authenticated && !canSubmit}
            className="game-button-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black uppercase tracking-wider text-white transition-all hover:opacity-90 disabled:opacity-40 clickable"
          >
            <Swords className="h-4 w-4" />
            {!authenticated
              ? "Sign in to enter"
              : submit.isPending
                ? "Backing lineup…"
                : pickCount < 3
                  ? `Pick ${3 - pickCount} more`
                  : !enoughBalance
                    ? "Not enough USDC"
                    : "Enter the duel"}
          </button>
        </div>
      </div>
    </div>
  );
}
