import { Trophy, Target, Flag, Swords, RectangleVertical } from "lucide-react";

/* ──────────────────────────────────────────────
   Category metadata helper
   ────────────────────────────────────────────── */
export interface CatMeta {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  selectedBg: string;
  ring: string;
  unselectedBg: string;
}

export function getCategoryMeta(groupKey: string): CatMeta {
  const map: Record<string, CatMeta> = {
    major: {
      title: "Match Winner",
      subtitle: "3-way: Win / Draw / Win",
      icon: <Trophy className="h-4 w-4" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg:
        "bg-emerald-50/80 text-emerald-700 border border-emerald-100 ",
    },
    match_winner: {
      title: "Match Winner",
      subtitle: "3-way: Win / Draw / Win",
      icon: <Trophy className="h-4 w-4" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg:
        "bg-emerald-50/80 text-emerald-700 border border-emerald-100 ",
    },
    first_goal: {
      title: "First Team to Score",
      subtitle: "First to Score",
      icon: <Target className="h-4 w-4" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg:
        "bg-emerald-50/80 text-emerald-700 border border-emerald-100 ",
    },
    red_card: {
      title: "Red Card",
      subtitle: "Red card shown in match",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg: "bg-red-50/80 text-red-700 border border-red-100 ",
    },
    red_cards: {
      title: "Red Card",
      subtitle: "Red card shown in match",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg: "bg-red-50/80 text-red-700 border border-red-100 ",
    },
    corners: {
      title: "Corners",
      subtitle: "Over / Under",
      icon: <Flag className="h-4 w-4" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg:
        "bg-emerald-50/80 text-emerald-700 border border-emerald-100 ",
    },
    total_corners: {
      title: "Corners",
      subtitle: "Over / Under",
      icon: <Flag className="h-4 w-4" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg:
        "bg-emerald-50/80 text-emerald-700 border border-emerald-100 ",
    },
    goals: {
      title: "Goals",
      subtitle: "Over / Under",
      icon: <Target className="h-4 w-4" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg: "bg-amber-50/80 text-amber-700 border border-amber-100 ",
    },
    total_goals: {
      title: "Goals",
      subtitle: "Over / Under",
      icon: <Target className="h-4 w-4" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg: "bg-amber-50/80 text-amber-700 border border-amber-100 ",
    },
    cards: {
      title: "Yellow Cards",
      subtitle: "Over / Under",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg: "bg-yellow-50/80 text-yellow-700 border border-yellow-100 ",
    },
    yellow_cards: {
      title: "Yellow Cards",
      subtitle: "Over / Under",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg: "bg-yellow-50/80 text-yellow-700 border border-yellow-100 ",
    },
    total_yellow_cards: {
      title: "Yellow Cards",
      subtitle: "Over / Under",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg: "bg-yellow-50/80 text-yellow-700 border border-yellow-100 ",
    },
    extra_time_penalties: {
      title: "Extra Time / Penalties Winner",
      subtitle: "3-way: Shootout / Decided in ET / Shootout",
      icon: <Swords className="h-4 w-4" />,
      accent: "emerald",
      selectedBg: "bg-emerald-600",
      ring: "ring-emerald-400/30",
      unselectedBg:
        "bg-emerald-50/80 text-emerald-700 border border-emerald-100 ",
    },
  };

  const fallback: CatMeta = {
    title: groupKey
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    subtitle: "Proposition",
    icon: <Swords className="h-4 w-4" />,
    accent: "emerald",
    selectedBg: "bg-emerald-600",
    ring: "ring-emerald-400/30",
    unselectedBg: "bg-stone-100/80 text-stone-700 border border-stone-200 ",
  };

  const meta = map[groupKey] || fallback;
  return {
    ...meta,
    unselectedBg:
      "bg-stone-50/50 text-stone-600 border border-stone-200/80 hover:bg-stone-100/60 ",
  };
}

/* ──────────────────────────────────────────────
   ArenaCategory — visual card for each group
   ────────────────────────────────────────────── */
interface ArenaCategoryProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  volume: number;
  hasSelection: boolean;
  /** Show the "+ LP" action. Off for pure-parimutuel markets (no LPs). */
  showLp?: boolean;
  onAddLiquidity?: () => void;
  children: React.ReactNode;
}

export default function ArenaCategory({
  title,
  subtitle,
  icon,
  accentColor,
  volume,
  hasSelection,
  showLp = true,
  onAddLiquidity,
  children,
}: ArenaCategoryProps) {
  const accentMap: Record<
    string,
    { bg: string; border: string; iconBg: string; iconActive: string }
  > = {
    indigo: {
      bg: "bg-sky-blue/5",
      border: "border-sky-blue/20",
      iconBg: "bg-sky-blue/10 text-sky-blue",
      iconActive: "bg-sky-blue text-white",
    },
    emerald: {
      bg: "bg-emerald-50/30 ",
      border: "border-emerald-200 ",
      iconBg: "bg-emerald-100 text-emerald-600 ",
      iconActive: "bg-emerald-600 text-white",
    },
    amber: {
      bg: "bg-amber-50/30 ",
      border: "border-amber-200 ",
      iconBg: "bg-amber-100 text-amber-600 ",
      iconActive: "bg-amber-500 text-white",
    },
    yellow: {
      bg: "bg-yellow-50/30 ",
      border: "border-yellow-200 ",
      iconBg: "bg-yellow-100 text-yellow-600 ",
      iconActive: "bg-yellow-500 text-white",
    },
    stone: {
      bg: "bg-stone-50/30 ",
      border: "border-stone-200 ",
      iconBg: "bg-stone-100 text-stone-500 ",
      iconActive: "bg-stone-600 text-white",
    },
  };

  const colors = accentMap[accentColor] || accentMap.stone;

  return (
    <div
      data-selected={hasSelection}
      className={`pvp-arena-category rounded-xl border transition-all overflow-hidden ${
        hasSelection
          ? `${colors.bg} ${colors.border}`
          : "border-border bg-white "
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              hasSelection ? colors.iconActive : colors.iconBg
            }`}
          >
            {icon}
          </div>
          <div className="text-left min-w-0">
            <span className="block text-sm font-bold text-charcoal-primary leading-tight">
              {title}
            </span>
            <span className="block text-[10px] text-ash font-mono truncate">
              {subtitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-ash font-mono">
            ${volume.toLocaleString()} Vol.
          </span>
          {showLp && (
            <button
              type="button"
              onClick={onAddLiquidity}
              className="cursor-pointer rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ash shadow-xs transition-all hover:border-sky-blue hover:bg-sky-blue/10 hover:text-sky-blue"
            >
              + LP
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}
