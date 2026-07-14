"use client";

import { useState } from "react";
import { usePvpLeaderboardQuery } from "@/store/verity/verityQueries";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { Zap, Users, Info, CircleHelp, Medal } from "lucide-react";
import Link from "next/link";

type LeaderboardTab = "xp" | "referrers" | "points-system";

export function LeaderboardContent({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("xp");
  const { profile: loggedInProfile } = useWalletProfile();
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = usePvpLeaderboardQuery(loggedInProfile?.id);

  const pvpRules = [
    {
      role: "Match ticket",
      logic:
        "Choose one outcome for each of the 7 World Cup propositions before the event locks.",
    },
    {
      role: "Match scoring",
      logic:
        "Each correct prediction is worth 1 point. Incorrect predictions are worth 0 points. The maximum match score is 7.",
    },
    {
      role: "Match result",
      logic:
        "The player with the higher score wins. If both players finish with the same score, the duel is a draw.",
    },
    {
      role: "Result XP",
      logic:
        "Winner: 100 Arena XP. Loser: 30 Arena XP. Draw: 50 Arena XP for each player.",
    },
    {
      role: "Perfect score",
      logic:
        "A player who correctly predicts all 7 propositions earns an additional 20 Arena XP.",
    },
    {
      role: "XP boost",
      logic:
        "An active boost multiplies the player's total Result XP, including a perfect-score bonus, by 1.2. One boost is automatically used when a ticket is submitted.",
    },
    {
      role: "Referral reward",
      logic:
        "When a referred player wins their first PvP duel, their referrer receives 2 XP boosts. The referred player receives no boost and there is no referral XP kickback.",
    },
    {
      role: "Arena grade",
      logic:
        "Players unlock an Arena grade at 30 total XP. Grades progress from Bronze through Mythic based on total Arena XP.",
    },
    {
      role: "Special Grade",
      logic:
        "Players with more than 30 Arena XP and no recorded PvP losses receive the lavender Special Grade tag alongside their Arena grade.",
    },
  ];

  return (
    <div
      className={`tournament-ranking mx-auto flex max-w-[672px] flex-col gap-4 ${embedded ? "pb-4" : "py-4"}`}
    >
      {/* Header Banner */}
      {!embedded && (
        <section className="verity-card game-grid relative overflow-hidden p-5 sm:p-6">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#1479ff]/22 blur-3xl" />
          <div className="relative max-w-[480px]">
            <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#59a2ff]">
              Global player rankings
            </p>
            <h1 className="text-[32px] font-semibold leading-[1.06] tracking-[-0.7px] text-midnight sm:text-[40px]">
              Who rules the arena?
            </h1>
            <p className="mt-3 text-[14px] leading-[1.47] tracking-[-0.2px] text-graphite ">
              Track XP, duel records, and the players climbing toward World Cup
              glory.
            </p>
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="tournament-ranking-tabs flex gap-2 overflow-x-auto border-b border-border pb-px ">
        <button
          onClick={() => setActiveTab("xp")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium tracking-tight whitespace-nowrap transition-colors ${
            activeTab === "xp"
              ? "border-charcoal-primary text-charcoal-primary "
              : "border-transparent text-ash hover:text-charcoal-primary "
          }`}
        >
          <Zap className="h-4 w-4" />
          Arena XP
        </button>
        <button
          onClick={() => setActiveTab("referrers")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium tracking-tight whitespace-nowrap transition-colors ${
            activeTab === "referrers"
              ? "border-charcoal-primary text-charcoal-primary "
              : "border-transparent text-ash hover:text-charcoal-primary "
          }`}
        >
          <Users className="h-4 w-4" />
          Top Referrers
        </button>
        <button
          onClick={() => setActiveTab("points-system")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium tracking-tight whitespace-nowrap transition-colors ${
            activeTab === "points-system"
              ? "border-charcoal-primary text-charcoal-primary "
              : "border-transparent text-ash hover:text-charcoal-primary "
          }`}
        >
          <Info className="h-4 w-4" />
          PvP Rules
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 min-h-[350px]">
        {isLoading && (
          <div className="verity-card overflow-hidden">
            <div className="p-4 border-b border-border bg-white-surface/40 ">
              <div className="h-4 w-32 rounded bg-stone-surface animate-pulse" />
              <div className="h-3 w-48 rounded bg-stone-surface animate-pulse mt-1.5" />
            </div>
            <div className="divide-y divide-border ">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 animate-pulse"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank Number Skeleton */}
                    <div className="h-6 w-6 shrink-0 rounded-full bg-stone-surface " />

                    {/* User Details Skeleton */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar Skeleton */}
                      <div className="h-9 w-9 shrink-0 rounded-full bg-stone-surface " />
                      {/* Text Skeleton */}
                      <div className="min-w-0 space-y-1.5 flex-1 max-w-[150px]">
                        <div className="h-4 w-3/4 rounded bg-stone-surface " />
                        <div className="h-3 w-1/2 rounded bg-stone-surface " />
                      </div>
                    </div>
                  </div>

                  {/* Score / Grade Skeleton */}
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div className="h-5 w-16 rounded bg-stone-surface/60 hidden sm:block" />
                    <div className="space-y-1">
                      <div className="h-4 w-10 rounded bg-stone-surface ml-auto" />
                      <div className="h-3 w-14 rounded bg-stone-surface ml-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="tournament-ranking-error verity-card p-8 text-center text-sm text-coral-red">
            Failed to load leaderboard data: {error.message}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {activeTab === "xp" && (
              <div className="verity-card overflow-hidden">
                <div className="p-4 border-b border-border bg-white-surface/40 ">
                  <h3 className="text-sm font-semibold tracking-tight text-charcoal-primary ">
                    World Cup Arena XP
                  </h3>
                  <p className="text-xs text-ash mt-0.5">
                    Ranked by Result XP earned from resolved PvP duels.
                  </p>
                </div>
                {leaderboardData?.xp?.length === 0 ? (
                  <div className="p-8 text-center text-sm text-ash">
                    No rankings available yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border ">
                    {leaderboardData?.xp?.map((user: any, index: number) => (
                      <UserLeaderboardRow
                        key={user.id}
                        user={user}
                        rank={index + 1}
                        scoreLabel="XP"
                        scoreValue={user.arenaXp}
                        isCurrentUser={user.id === loggedInProfile?.id}
                      />
                    ))}
                    {(() => {
                      const isUserInXpList = leaderboardData?.xp?.some(
                        (u: any) => u.id === loggedInProfile?.id,
                      );
                      if (
                        !isUserInXpList &&
                        loggedInProfile &&
                        leaderboardData?.currentUserXpRank != null &&
                        leaderboardData.currentUserXpRank > 50
                      ) {
                        return (
                          <>
                            <div className="flex items-center justify-center py-2 bg-stone-50/50 border-t border-dashed border-border ">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ash font-mono">
                                ••• You are ranked{" "}
                                {leaderboardData.currentUserXpRank} •••
                              </span>
                            </div>
                            <UserLeaderboardRow
                              user={{
                                id: loggedInProfile.id,
                                username: loggedInProfile.username,
                                displayName: loggedInProfile.displayName,
                                avatarUrl: loggedInProfile.avatarUrl,
                                pvpMatchesLostCount:
                                  loggedInProfile.pvpMatchesLostCount ?? 0,
                              }}
                              rank={leaderboardData.currentUserXpRank}
                              scoreLabel="XP"
                              scoreValue={leaderboardData.currentUserXp ?? 0}
                              isCurrentUser={true}
                            />
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === "referrers" && (
              <div className="verity-card overflow-hidden">
                <div className="p-4 border-b border-border bg-white-surface/40 ">
                  <h3 className="text-sm font-semibold tracking-tight text-charcoal-primary ">
                    Top Referrers
                  </h3>
                  <p className="text-xs text-ash mt-0.5">
                    Ranked by total number of referred onboarded users.
                  </p>
                </div>
                {leaderboardData?.referrers?.length === 0 ? (
                  <div className="p-8 text-center text-sm text-ash">
                    No referrals recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border ">
                    {leaderboardData?.referrers?.map(
                      (user: any, index: number) => (
                        <UserLeaderboardRow
                          key={user.id}
                          user={user}
                          rank={index + 1}
                          scoreLabel="Referrals"
                          scoreValue={user.referralCount}
                          extraInfo={`(${user.arenaXp} XP)`}
                          isCurrentUser={user.id === loggedInProfile?.id}
                        />
                      ),
                    )}
                    {(() => {
                      const isUserInReferrersList =
                        leaderboardData?.referrers?.some(
                          (u: any) => u.id === loggedInProfile?.id,
                        );
                      if (
                        !isUserInReferrersList &&
                        loggedInProfile &&
                        leaderboardData?.currentUserReferralRank != null &&
                        leaderboardData.currentUserReferralRank > 50
                      ) {
                        return (
                          <>
                            <div className="flex items-center justify-center py-2 bg-stone-50/50 border-t border-dashed border-border ">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ash font-mono">
                                ••• You are ranked{" "}
                                {leaderboardData.currentUserReferralRank} •••
                              </span>
                            </div>
                            <UserLeaderboardRow
                              user={{
                                id: loggedInProfile.id,
                                username: loggedInProfile.username,
                                displayName: loggedInProfile.displayName,
                                avatarUrl: loggedInProfile.avatarUrl,
                              }}
                              rank={leaderboardData.currentUserReferralRank}
                              scoreLabel="Referrals"
                              scoreValue={
                                leaderboardData.currentUserReferral ?? 0
                              }
                              extraInfo={`(${loggedInProfile.arenaXp ?? 0} XP)`}
                              isCurrentUser={true}
                            />
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === "points-system" && (
              <div className="flex flex-col gap-3">
                <div className="verity-card p-5 bg-linear-to-br from-sky-500/5 to-transparent">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sky-blue/10 text-sky-blue">
                      <Medal className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-charcoal-primary ">
                        World Cup PvP Scoring
                      </h3>
                      <p className="text-sm text-graphite mt-1">
                        These are the scoring and Arena XP rules used for the
                        current World Cup PvP test.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="verity-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-white-surface/40 text-xs font-mono font-bold uppercase tracking-wider text-ash">
                          <th className="p-4 w-[160px]">PvP Rule</th>
                          <th className="p-4">How It Works</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border ">
                        {pvpRules.map((item) => (
                          <tr
                            key={item.role}
                            className="hover:bg-white-surface/20 "
                          >
                            <td className="p-4 font-semibold text-charcoal-primary align-top">
                              {item.role}
                            </td>
                            <td className="p-4 text-graphite leading-relaxed">
                              {item.logic}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return <LeaderboardContent />;
}

function UserLeaderboardRow({
  user,
  rank,
  scoreLabel,
  scoreValue,
  extraInfo,
  isCurrentUser,
}: {
  user: any;
  rank: number;
  scoreLabel: string;
  scoreValue: number;
  extraInfo?: string;
  isCurrentUser?: boolean;
}) {
  const isTopThree = rank <= 3;
  const rankColors = [
    "bg-amber-400 text-amber-950 ", // Gold
    "bg-zinc-300 text-zinc-950 ", // Silver
    "bg-amber-600 text-amber-50 ", // Bronze
  ];
  const grade = getArenaGrade(scoreLabel, scoreValue);
  const hasSpecialGrade =
    scoreLabel === "XP" &&
    scoreValue > 30 &&
    Number(user.pvpMatchesLostCount ?? 0) === 0;

  return (
    <div
      className={`flex items-center justify-between p-4 transition-colors ${
        isCurrentUser
          ? "bg-sky-blue/5 border-y border-sky-blue/15"
          : "hover:bg-white-surface/20 "
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Rank Number */}
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono ${
            isTopThree ? rankColors[rank - 1] : "text-ash"
          }`}
        >
          {rank}
        </span>

        {/* User Details */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-zinc-200 relative flex items-center justify-center font-bold text-zinc-500">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              (user.displayName || user.username || "?").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/profile/${encodeURIComponent(user.id)}`}
              className="block text-sm font-semibold tracking-tight text-charcoal-primary truncate hover:underline"
            >
              {user.displayName || user.username}
            </Link>
            <span className="block text-xs font-mono text-ash truncate">
              @{user.username}
            </span>
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          {grade && (
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono ${grade.color}`}
            >
              {grade.name}
            </span>
          )}
          {hasSpecialGrade && (
            <span className="rounded bg-sunburst-yellow/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sunburst-yellow font-mono">
              Special Grade
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="font-semibold text-sm text-charcoal-primary font-mono">
            {scoreValue}
          </span>
          <span className="text-[10px] text-ash font-mono uppercase tracking-wider block leading-none mt-0.5">
            {scoreLabel} {extraInfo}
          </span>
        </div>
      </div>
    </div>
  );
}

function getArenaGrade(scoreLabel: string, arenaXp: number) {
  if (scoreLabel !== "XP") return null;
  if (arenaXp < 30) return null;

  if (arenaXp <= 499) {
    return {
      name: "Bronze",
      color: "bg-amber-700/10 text-amber-700 ",
    };
  }
  if (arenaXp <= 1499) {
    return {
      name: "Silver",
      color: "bg-zinc-500/10 text-zinc-500 ",
    };
  }
  if (arenaXp <= 2999) {
    return {
      name: "Gold",
      color: "bg-amber-500/10 text-amber-600 ",
    };
  }
  if (arenaXp <= 4999) {
    return {
      name: "Platinum",
      color: "bg-cyan-500/10 text-cyan-600 ",
    };
  }
  if (arenaXp <= 6999) {
    return {
      name: "Diamond",
      color: "bg-sky-blue/10 text-sky-blue",
    };
  }
  if (arenaXp <= 9000) {
    return {
      name: "Legend",
      color: "bg-sunburst-yellow/10 text-sunburst-yellow",
    };
  }
  return {
    name: "Mythic",
    color: "bg-fuchsia-500/10 text-fuchsia-600 ",
  };
}
