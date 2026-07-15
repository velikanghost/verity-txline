import { Swords, Loader2 } from "lucide-react";

interface PvpDuelStatusProps {
  status: "queued" | "matched" | "resolved";
  pvpStatus: any;
  runningScoreUser: number;
  runningScoreOpponent: number;
  profile?: any;
}

const opponentColors = [
  "bg-[#ffbb26]", // sunburst-yellow
  "bg-meadow-green",
  "bg-ember-orange",
  "bg-coral-red",
];

function getAvatarColor(username: string): string {
  if (!username || username.toLowerCase() === "you") return "bg-sky-blue";
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % opponentColors.length;
  return opponentColors[index];
}

// Custom brand avatar component with blob fallback
function DuelAvatar({
  avatarUrl,
  username,
}: {
  avatarUrl?: string;
  username: string;
}) {
  if (avatarUrl) {
    return (
      <div
        className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center ring-2 ring-white shadow-sm"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      />
    );
  }

  const blobBg = getAvatarColor(username);
  return (
    <div
      className={`verity-blob h-10 w-10 shrink-0 ${blobBg} ring-2 ring-white `}
    >
      <span className="verity-blob-smile" />
    </div>
  );
}

export default function PvpDuelStatus({
  status,
  pvpStatus,
  runningScoreUser,
  runningScoreOpponent,
  profile,
}: PvpDuelStatusProps) {
  if (status === "queued") {
    return (
      <div className="verity-card p-6 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden bg-gradient-to-b from-stone-50/50 to-stone-100/30 border border-border ">
        <div className="absolute left-0 top-0 h-1 w-full animate-pulse bg-coral-red" />

        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-coral-red/20 bg-coral-red/10 shadow-sm">
            <Loader2 className="absolute h-6 w-6 animate-spin text-coral-red" />
            <Swords className="relative z-10 h-4.5 w-4.5 text-coral-red" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold tracking-tight text-charcoal-primary ">
              Scanning for Opponent...
            </h3>
            <p className="text-xs text-ash mt-0.5 font-medium leading-normal max-w-sm">
              Searching for a predictor with high selection divergence to pair.
            </p>
          </div>
        </div>

        <div className="bg-[#FAF9F6] px-4 py-3 rounded-xl border border-stone-200/20 text-[10px] font-mono text-ash text-left space-y-1 shrink-0 w-full md:w-auto shadow-xs">
          <p className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-coral-red">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-coral-red" />
            <span>Ticket Active</span>
          </p>
          <p className="truncate max-w-[200px]">
            • Matchup: {pvpStatus.event?.question}
          </p>
        </div>
      </div>
    );
  }

  // Resolved or Matched — both share the H2H layout
  const isResolved = status === "resolved";
  const resultLabel =
    runningScoreUser > runningScoreOpponent
      ? "YOU WON 🏆"
      : runningScoreUser < runningScoreOpponent
        ? "YOU LOST ❌"
        : "DRAW 🤝";
  const resultColor =
    runningScoreUser > runningScoreOpponent
      ? "text-emerald-600 "
      : runningScoreUser < runningScoreOpponent
        ? "text-[#FF4D00]"
        : "text-ash";

  const userAvatarUrl = profile?.avatar_url || profile?.avatarUrl;
  const opponentAvatarUrl =
    pvpStatus.opponent?.avatar_url || pvpStatus.opponent?.avatarUrl;

  return (
    <div className="verity-card p-5 bg-white border border-border flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        {/* Left: You */}
        <div className="w-full md:w-auto md:min-w-[180px] flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/20 shadow-xs shrink-0">
          <DuelAvatar avatarUrl={userAvatarUrl} username="You" />
          <div className="text-left min-w-0 flex-1">
            <h4 className="text-sm font-extrabold text-charcoal-primary leading-tight truncate">
              You
            </h4>
            <span className="text-[10px] font-mono text-ash font-medium mt-0.5 block">
              Score:{" "}
              <strong className="text-xs font-bold text-sky-blue">
                {runningScoreUser} pts
              </strong>
            </span>
          </div>
        </div>

        {/* Middle: VS / Result */}
        <div className="flex-1 flex flex-col items-center justify-center text-center py-2 px-4">
          {isResolved ? (
            <span
              className={`text-sm font-black uppercase tracking-wider ${resultColor} whitespace-nowrap`}
            >
              {resultLabel}
            </span>
          ) : (
            <div className="h-8 w-8 rounded-full border border-border bg-[#FAF9F6] flex items-center justify-center shadow-xs">
              <Swords className="h-3.5 w-3.5 text-coral-red" />
            </div>
          )}
          <span className="text-[9px] font-mono text-ash font-bold uppercase tracking-wider mt-1.5">
            Div: {pvpStatus.match?.divergenceScore ?? 0}
          </span>
        </div>

        {/* Right: Opponent */}
        <div className="w-full md:w-auto md:min-w-[180px] flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/20 shadow-xs shrink-0">
          <div className="text-left min-w-0 flex-1 pl-1 pr-2">
            <h4 className="text-sm font-extrabold text-charcoal-primary leading-tight truncate">
              @{pvpStatus.opponent?.username || "Opponent"}
            </h4>
            <span className="text-[10px] font-mono text-ash font-medium mt-0.5 block">
              Score:{" "}
              <strong className="text-xs font-bold text-sky-blue">
                {runningScoreOpponent} pts
              </strong>
            </span>
          </div>
          <DuelAvatar
            avatarUrl={opponentAvatarUrl}
            username={pvpStatus.opponent?.username || "Opponent"}
          />
        </div>
      </div>

      {isResolved && (
        <div className="pt-3 border-t border-dashed border-border text-center">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
            Duel is resolved. Arena XP has been distributed.
          </p>
        </div>
      )}
    </div>
  );
}
