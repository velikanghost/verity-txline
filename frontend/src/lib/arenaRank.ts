export interface ArenaRank {
  name: string;
  minXp: number;
  nextName: string | null;
  nextMinXp: number | null;
  badgeClass: string;
  labelClass: string;
  progressClass: string;
}

const ARENA_RANKS = [
  {
    name: "Unranked",
    minXp: 0,
    badgeClass: "bg-[#e9edf2] text-[#667085]",
    labelClass: "text-[#667085]",
    progressClass: "from-[#9aa4b2] to-[#c4cad2]",
  },
  {
    name: "Bronze",
    minXp: 30,
    badgeClass: "bg-[#f3dfca] text-[#9a5527]",
    labelClass: "text-[#9a5527]",
    progressClass: "from-[#b86b35] to-[#e0a16b]",
  },
  {
    name: "Silver",
    minXp: 500,
    badgeClass: "bg-[#e8ebef] text-[#68717d]",
    labelClass: "text-[#68717d]",
    progressClass: "from-[#8c96a3] to-[#c9d0d8]",
  },
  {
    name: "Gold",
    minXp: 1500,
    badgeClass: "bg-[#fff0b8] text-[#a66c00]",
    labelClass: "text-[#a66c00]",
    progressClass: "from-[#f0ad16] to-[#ffd862]",
  },
  {
    name: "Platinum",
    minXp: 3000,
    badgeClass: "bg-[#d9f5f1] text-[#177f79]",
    labelClass: "text-[#177f79]",
    progressClass: "from-[#32a7a1] to-[#80ded2]",
  },
  {
    name: "Diamond",
    minXp: 5000,
    badgeClass: "bg-[#dceeff] text-[#1479ff]",
    labelClass: "text-[#1479ff]",
    progressClass: "from-[#1479ff] to-[#72b7ff]",
  },
  {
    name: "Legend",
    minXp: 7000,
    badgeClass: "bg-[#eee6ff] text-[#7553c7]",
    labelClass: "text-[#7553c7]",
    progressClass: "from-[#806acb] to-[#b6a8e2]",
  },
  {
    name: "Mythic",
    minXp: 9001,
    badgeClass: "bg-[#ffe0ed] text-[#c63470]",
    labelClass: "text-[#c63470]",
    progressClass: "from-[#d93d7b] to-[#ff8ab8]",
  },
] as const;

export function getArenaRank(arenaXp: number): ArenaRank {
  const safeXp = Math.max(0, arenaXp);
  let index = 0;

  for (let rankIndex = 0; rankIndex < ARENA_RANKS.length; rankIndex += 1) {
    if (safeXp >= ARENA_RANKS[rankIndex].minXp) index = rankIndex;
  }

  const rank = ARENA_RANKS[index];
  const nextRank = ARENA_RANKS[index + 1] ?? null;

  return {
    ...rank,
    nextName: nextRank?.name ?? null,
    nextMinXp: nextRank?.minXp ?? null,
  };
}

export function getArenaRankProgress(arenaXp: number, rank: ArenaRank): number {
  if (rank.nextMinXp === null) return 100;
  const range = rank.nextMinXp - rank.minXp;
  if (range <= 0) return 100;
  return Math.min(100, Math.max(0, ((arenaXp - rank.minXp) / range) * 100));
}
