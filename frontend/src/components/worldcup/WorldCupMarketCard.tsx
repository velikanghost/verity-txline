"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, Coins, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthModals";
import {
  WorldCupMarket,
  usePoolStateQuery,
  useStakeWorldCupMutation,
  useClaimWorldCupMutation,
} from "@/store/verity/worldcupQueries";
import { explorerTx } from "@/lib/solana";
import { VerifiableResolutionReceipt } from "./VerifiableResolutionReceipt";

const OUTCOME_STYLES = [
  {
    bar: "bg-[#1479ff]",
    button:
      "border-[#1479ff]/30 bg-[#1479ff]/10 text-[#62a4ff] hover:bg-[#1479ff]/18",
  },
  {
    bar: "bg-[#ff6b4a]",
    button:
      "border-[#ff6b4a]/30 bg-[#ff6b4a]/10 text-[#ff927b] hover:bg-[#ff6b4a]/18",
  },
  {
    bar: "bg-[#35e881]",
    button:
      "border-[#35e881]/25 bg-[#35e881]/10 text-[#27bd69] dark:text-[#58f09a] hover:bg-[#35e881]/15",
  },
  {
    bar: "bg-[#ffc844]",
    button:
      "border-[#ffc844]/25 bg-[#ffc844]/10 text-[#bf8e08] dark:text-[#ffc844] hover:bg-[#ffc844]/15",
  },
];

const fmtUsdc = (base?: string) =>
  base
    ? (Number(base) / 1e6).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
    : "0";

const formatDeadline = (deadline: string) => {
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "Fixture open";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export function WorldCupMarketCard({ market }: { market: WorldCupMarket }) {
  const { authenticated } = useAuth();
  const { data: pool } = usePoolStateQuery(market.id);
  const stake = useStakeWorldCupMutation();
  const claim = useClaimWorldCupMutation();
  const [amount, setAmount] = useState("1");

  const resolved = market.status === "resolved" || pool?.resolved;
  const voided = market.status === "voided" || pool?.voided;
  const outcomes =
    market.outcomes?.length > 0
      ? market.outcomes
      : [market.noCondition, market.yesCondition];
  const pools = pool?.pools ?? [];
  const total = pools.reduce((sum, value) => sum + Number(value ?? 0), 0);
  const percentage = (index: number) =>
    total > 0
      ? Math.round((Number(pools[index] ?? 0) / total) * 100)
      : Math.round(100 / outcomes.length);

  const submitStake = async (outcome: number) => {
    if (!authenticated) return toast.error("Sign in to enter the arena.");
    const amountUsdc = Number(amount);
    if (!amountUsdc || amountUsdc <= 0)
      return toast.error("Enter a USDC amount.");
    await toast.promise(
      stake.mutateAsync({ marketId: market.id, outcome, amountUsdc }),
      {
        loading: "Locking your prediction…",
        success: (result) => (
          <span>
            Prediction locked.{" "}
            <a
              className="underline"
              href={explorerTx(result.txSig)}
              target="_blank"
              rel="noreferrer"
            >
              view tx
            </a>
          </span>
        ),
        error: (error) => error?.message || "Prediction failed",
      },
    );
  };

  const submitClaim = async () => {
    await toast.promise(claim.mutateAsync({ marketId: market.id }), {
      loading: "Unlocking reward…",
      success: "Reward claimed.",
      error: (error) => error?.message || "Nothing to claim",
    });
  };

  return (
    <article className="game-market-card group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0d1121] p-5 text-white shadow-[0_18px_60px_rgba(10,13,29,.16)]">
      <div
        className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[#7359ff]/10 blur-3xl transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#ffc844]/10 text-[#ffc844]">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="truncate font-mono text-[9px] font-black uppercase tracking-[0.17em] text-[#77809f]">
              World Cup · {market.matchup ?? `Fixture ${market.fixtureId}`}
            </p>
          </div>
          <h3 className="font-game mt-3 text-xl font-black leading-[1.08] text-white">
            {market.question}
          </h3>
        </div>
        <span
          className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-wider ${resolved ? "bg-[#35e881]/10 text-[#58f09a]" : "bg-[#ff6b4a]/10 text-[#ff927b]"}`}
        >
          {resolved ? "Final" : "Open"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-b border-white/[0.07] pb-4 font-mono text-[9px] font-bold uppercase tracking-wider text-[#68718f]">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
        Locks {formatDeadline(market.deadline)}
      </div>

      <div className="mt-4 space-y-2.5">
        {outcomes.map((label, index) => {
          const percent = percentage(index);
          const style = OUTCOME_STYLES[index % OUTCOME_STYLES.length];
          return (
            <div
              key={`${market.id}-${label}`}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-game text-[15px] font-black text-white">
                  {label}
                </span>
                <span className="font-mono text-[10px] font-black text-white/70">
                  {percent}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full ${style.bar}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] font-semibold text-[#697290]">
                  {fmtUsdc(pools[index])} USDC backed
                </span>
                {!resolved && !voided && (
                  <button
                    type="button"
                    onClick={() => submitStake(index)}
                    disabled={stake.isPending}
                    className={`clickable rounded-xl border px-3 py-1.5 font-game text-xs font-black disabled:opacity-50 ${style.button}`}
                  >
                    Pick {label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        {resolved && market.solanaResolveTxSig ? (
          <div className="space-y-2.5">
            <VerifiableResolutionReceipt
              resolveTxSig={market.solanaResolveTxSig}
              outcome={market.resolvedOutcome}
            />
            <button
              onClick={submitClaim}
              disabled={claim.isPending}
              className="game-button-success clickable w-full rounded-2xl py-2.5 font-game text-sm font-black text-[#07170d] disabled:opacity-50"
            >
              {claim.isPending ? "Unlocking…" : "Claim reward"}
            </button>
          </div>
        ) : voided ? (
          <p className="rounded-xl border border-[#ffc844]/15 bg-[#ffc844]/10 p-3 text-xs font-bold text-[#ffc844]">
            Match voided — your entry can be reclaimed.
          </p>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-[#070a15]/60 p-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
              <Coins
                className="h-4 w-4 shrink-0 text-[#ffc844]"
                aria-hidden="true"
              />
              <label htmlFor={`amount-${market.id}`} className="sr-only">
                Entry amount in USDC
              </label>
              <input
                id={`amount-${market.id}`}
                type="number"
                min="0"
                step="0.5"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-xs font-black text-white outline-none placeholder:text-white/25"
                placeholder="Entry amount"
              />
            </div>
            <span className="rounded-xl bg-white/[0.06] px-3 py-2 font-mono text-[9px] font-black text-white/50">
              USDC
            </span>
          </div>
        )}
      </div>

      {!resolved && !voided && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[9px] font-semibold text-[#5f6886]">
          <CheckCircle2 className="h-3 w-3 text-[#35e881]" aria-hidden="true" />
          Your pick settles against a signed TxLINE proof
        </p>
      )}
    </article>
  );
}
