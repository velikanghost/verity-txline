"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Coins,
  ReceiptText,
  Swords,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthModals";
import {
  WorldCupMarket,
  usePoolStateQuery,
  useMarketPositionQuery,
  useStakeWorldCupMutation,
  useClaimWorldCupMutation,
} from "@/store/verity/worldcupQueries";
import { explorerTx } from "@/lib/solana";
import { VerifiableResolutionReceipt } from "./VerifiableResolutionReceipt";
import { PREVIEW_POOL_BY_MARKET } from "@/lib/previewData";

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
      "border-[#35e881]/25 bg-[#35e881]/10 text-[#27bd69] hover:bg-[#35e881]/15",
  },
  {
    bar: "bg-[#ffc844]",
    button:
      "border-[#ffc844]/25 bg-[#ffc844]/10 text-[#bf8e08] hover:bg-[#ffc844]/15",
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

export function WorldCupMarketCard({
  market,
  preview = false,
}: {
  market: WorldCupMarket;
  preview?: boolean;
}) {
  const { authenticated } = useAuth();
  const { data: livePool } = usePoolStateQuery(preview ? null : market.id);
  const pool = preview
    ? {
        pools: PREVIEW_POOL_BY_MARKET[market.id] ?? [],
        resolved: false,
        voided: false,
      }
    : livePool;
  const stake = useStakeWorldCupMutation();
  const claim = useClaimWorldCupMutation();
  const [amount, setAmount] = useState("1");
  const [showReceipt, setShowReceipt] = useState(false);

  const resolved = market.status === "resolved" || pool?.resolved;
  const voided = market.status === "voided" || pool?.voided;

  // The caller's on-chain claim state — only read for resolved, signed-in,
  // non-preview cards. Drives whether the claim button shows and its label.
  const { data: position } = useMarketPositionQuery(preview ? null : market.id, {
    enabled: !preview && authenticated && Boolean(resolved),
  });
  const hasClaimable = (position?.claimableUsdc ?? 0) > 0 && !position?.claimed;
  const alreadyClaimed = position?.claimed === true;
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
    <article className="game-market-card group relative flex h-full flex-col overflow-hidden rounded-[24px] border-[3px] border-[#241b4a] bg-white p-5 text-[#241b4a] shadow-[6px_7px_0_rgba(36,27,74,.92)]">
      <div
        className="worldcup-market-glow absolute right-0 top-0 h-28 w-28 rounded-full bg-[#afe9d9]/75 blur-3xl transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="worldcup-market-trophy flex h-7 w-7 items-center justify-center rounded-lg border-2 border-[#241b4a] bg-[#f2d66a] text-[#241b4a] shadow-[2px_2px_0_#241b4a]">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="worldcup-market-muted truncate font-mono text-[9px] font-black uppercase tracking-[0.17em] text-[#756e89]">
              World Cup · {market.matchup ?? `Fixture ${market.fixtureId}`}
            </p>
          </div>
          <h3 className="worldcup-market-title font-game mt-3 text-xl font-black leading-[1.08] text-[#241b4a]">
            {market.question}
          </h3>
        </div>
        <span
          className={`worldcup-market-status mt-0.5 shrink-0 rounded-full border-2 border-[#241b4a] px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-wider ${resolved ? "bg-[#afe9d9] text-[#176a58]" : "bg-[#eca8cb] text-[#241b4a]"}`}
        >
          {resolved ? "Final" : "Open"}
        </span>
      </div>

      <div className="worldcup-market-muted mt-3 flex items-center gap-1.5 border-b-2 border-[#241b4a]/15 pb-4 font-mono text-[9px] font-bold uppercase tracking-wider text-[#756e89]">
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
              className="worldcup-market-outcome rounded-2xl border-2 border-[#241b4a]/20 bg-[#fff9ec] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="worldcup-market-outcome-label min-w-0 truncate font-game text-[15px] font-black text-[#241b4a]">
                  {label}
                </span>
                <span className="worldcup-market-percent font-mono text-[10px] font-black text-[#241b4a]/75">
                  {percent}%
                </span>
              </div>
              <div className="worldcup-market-track mt-2 h-1.5 overflow-hidden rounded-full bg-[#241b4a]/10">
                <div
                  className={`h-full rounded-full ${style.bar}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="worldcup-market-muted font-mono text-[9px] font-semibold text-[#756e89]">
                  {fmtUsdc(pools[index])} USDC backed
                </span>
                {!resolved && !voided && !market.parentMarketId && (
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
            {hasClaimable ? (
              <button
                onClick={submitClaim}
                disabled={claim.isPending}
                className="game-button-success clickable w-full rounded-2xl py-2.5 font-game text-sm font-black text-[#07170d] disabled:opacity-50"
              >
                {claim.isPending
                  ? "Unlocking…"
                  : `Claim ${position!.claimableUsdc.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })} USDC`}
              </button>
            ) : alreadyClaimed ? (
              <div className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-[#35e881]/40 bg-[#d7f3ea] py-2.5 font-game text-sm font-black text-[#176a58]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Reward claimed
              </div>
            ) : null}

            {/* Receipt is hidden by default — revealed on demand via this CTA. */}
            <button
              type="button"
              onClick={() => setShowReceipt((prev) => !prev)}
              aria-expanded={showReceipt}
              className="clickable flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-[#241b4a]/20 bg-[#fff9ec] py-2 font-mono text-[10px] font-black uppercase tracking-wider text-[#756e89] hover:bg-[#f4fbf7] hover:text-[#176a58]"
            >
              <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
              {showReceipt ? "Hide receipt" : "View settlement receipt"}
            </button>
            {showReceipt && (
              <VerifiableResolutionReceipt
                market={market}
                resolveTxSig={market.solanaResolveTxSig}
                outcome={market.resolvedOutcome}
              />
            )}
          </div>
        ) : voided ? (
          <p className="worldcup-market-void rounded-xl border-2 border-[#241b4a] bg-[#fff0b8] p-3 text-xs font-bold text-[#7f5600]">
            Match voided — your entry can be reclaimed.
          </p>
        ) : market.parentMarketId ? (
          <Link
            href={`/pvp?slate=${market.parentMarketId}`}
            className="game-button-primary clickable flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 font-game text-sm font-black text-white"
          >
            <Swords className="h-4 w-4" aria-hidden="true" />
            Enter in PvP
          </Link>
        ) : (
          <div className="worldcup-market-amount flex items-center gap-2 rounded-2xl border-2 border-[#241b4a] bg-[#d7f3ea] p-2">
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
                className="worldcup-market-input min-w-0 flex-1 bg-transparent font-mono text-xs font-black text-[#241b4a] outline-none placeholder:text-[#756e89]"
                placeholder="Entry amount"
              />
            </div>
            <span className="worldcup-market-currency rounded-xl border border-[#241b4a]/15 bg-white px-3 py-2 font-mono text-[9px] font-black text-[#756e89]">
              USDC
            </span>
          </div>
        )}
      </div>

      {!resolved && !voided && (
        <p className="worldcup-market-muted mt-3 flex items-center justify-center gap-1.5 text-center text-[9px] font-semibold text-[#756e89]">
          <CheckCircle2 className="h-3 w-3 text-[#35e881]" aria-hidden="true" />
          Your pick settles against a signed TxLINE proof
        </p>
      )}
    </article>
  );
}
