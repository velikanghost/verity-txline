import type { WorldCupMarket } from "@/store/verity/worldcupQueries";
import type { DuelStatus } from "@/components/pvp/DuelPanel";

export interface PreviewPvpOption {
  id: string;
  question: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  txlineMatchup: string;
}

export interface PreviewPvpSlate {
  id: string;
  question: string;
  deadline: string;
  lockTime: string;
  status: string;
  createdAt: string;
  options: PreviewPvpOption[];
}

const futureIso = (hours: number): string =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

export const getPreviewPvpSlates = (): PreviewPvpSlate[] => [
  {
    id: "preview-slate-england-argentina",
    question: "England vs Argentina",
    deadline: futureIso(28),
    lockTime: futureIso(28),
    status: "open",
    createdAt: new Date().toISOString(),
    options: [
      {
        id: "preview-eng-arg-winner",
        question: "Match winner",
        outcomes: ["Draw", "England", "Argentina"],
        outcomePrices: [0.24, 0.43, 0.33],
        volume: 18420,
        txlineMatchup: "England vs Argentina",
      },
      {
        id: "preview-eng-arg-goals",
        question: "Over 2.5 total goals?",
        outcomes: ["Under 2.5", "Over 2.5"],
        outcomePrices: [0.46, 0.54],
        volume: 12650,
        txlineMatchup: "England vs Argentina",
      },
      {
        id: "preview-eng-arg-btts",
        question: "Both teams to score?",
        outcomes: ["No", "Yes"],
        outcomePrices: [0.38, 0.62],
        volume: 9300,
        txlineMatchup: "England vs Argentina",
      },
      {
        id: "preview-eng-arg-corners",
        question: "England over 4.5 corners?",
        outcomes: ["No", "Yes"],
        outcomePrices: [0.42, 0.58],
        volume: 7420,
        txlineMatchup: "England vs Argentina",
      },
      {
        id: "preview-eng-arg-card",
        question: "A card before 30 minutes?",
        outcomes: ["No", "Yes"],
        outcomePrices: [0.55, 0.45],
        volume: 5190,
        txlineMatchup: "England vs Argentina",
      },
    ],
  },
  {
    id: "preview-slate-nigeria-brazil",
    question: "Nigeria vs Brazil",
    deadline: futureIso(52),
    lockTime: futureIso(52),
    status: "open",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    options: [
      {
        id: "preview-nga-bra-winner",
        question: "Match winner",
        outcomes: ["Draw", "Nigeria", "Brazil"],
        outcomePrices: [0.21, 0.31, 0.48],
        volume: 24780,
        txlineMatchup: "Nigeria vs Brazil",
      },
      {
        id: "preview-nga-bra-goals",
        question: "Over 3.5 total goals?",
        outcomes: ["Under 3.5", "Over 3.5"],
        outcomePrices: [0.61, 0.39],
        volume: 11320,
        txlineMatchup: "Nigeria vs Brazil",
      },
      {
        id: "preview-nga-bra-shot",
        question: "Brazil 5+ shots on target?",
        outcomes: ["No", "Yes"],
        outcomePrices: [0.34, 0.66],
        volume: 8840,
        txlineMatchup: "Nigeria vs Brazil",
      },
      {
        id: "preview-nga-bra-score",
        question: "Nigeria to score?",
        outcomes: ["No", "Yes"],
        outcomePrices: [0.41, 0.59],
        volume: 7960,
        txlineMatchup: "Nigeria vs Brazil",
      },
    ],
  },
  {
    id: "preview-slate-france-spain",
    question: "France vs Spain",
    deadline: futureIso(76),
    lockTime: futureIso(76),
    status: "open",
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    options: [
      {
        id: "preview-fra-esp-winner",
        question: "Match winner",
        outcomes: ["Draw", "France", "Spain"],
        outcomePrices: [0.28, 0.37, 0.35],
        volume: 31950,
        txlineMatchup: "France vs Spain",
      },
      {
        id: "preview-fra-esp-goals",
        question: "Over 2.5 total goals?",
        outcomes: ["Under 2.5", "Over 2.5"],
        outcomePrices: [0.49, 0.51],
        volume: 13880,
        txlineMatchup: "France vs Spain",
      },
      {
        id: "preview-fra-esp-btts",
        question: "Both teams to score?",
        outcomes: ["No", "Yes"],
        outcomePrices: [0.44, 0.56],
        volume: 10540,
        txlineMatchup: "France vs Spain",
      },
    ],
  },
];

export const PREVIEW_LEADERBOARD = {
  xp: [
    { id: "preview-1", username: "pitchoracle", displayName: "Pitch Oracle", arenaXp: 7840, pvpMatchesLostCount: 2 },
    { id: "preview-2", username: "naija10", displayName: "Naija No. 10", arenaXp: 6350, pvpMatchesLostCount: 0 },
    { id: "preview-3", username: "lastminutegoal", displayName: "Last Minute Goal", arenaXp: 4920, pvpMatchesLostCount: 4 },
    { id: "preview-4", username: "tacticaltee", displayName: "Tactical Tee", arenaXp: 3180, pvpMatchesLostCount: 1 },
    { id: "preview-5", username: "cleansheet", displayName: "Clean Sheet", arenaXp: 2260, pvpMatchesLostCount: 3 },
    { id: "preview-6", username: "worldie", displayName: "Worldie", arenaXp: 1490, pvpMatchesLostCount: 2 },
  ],
  referrers: [
    { id: "preview-2", username: "naija10", displayName: "Naija No. 10", referralCount: 42, arenaXp: 6350 },
    { id: "preview-4", username: "tacticaltee", displayName: "Tactical Tee", referralCount: 31, arenaXp: 3180 },
    { id: "preview-1", username: "pitchoracle", displayName: "Pitch Oracle", referralCount: 27, arenaXp: 7840 },
    { id: "preview-5", username: "cleansheet", displayName: "Clean Sheet", referralCount: 18, arenaXp: 2260 },
  ],
  currentUserXp: null,
  currentUserXpRank: null,
  currentUserReferral: null,
  currentUserReferralRank: null,
};

export const getPreviewWorldCupMarkets = (): WorldCupMarket[] => [
  {
    id: "preview-market-golden-boot",
    question: "World Cup: Golden Boot winner",
    status: "open",
    parentMarketId: "preview-slate-england-argentina",
    fixtureId: 101,
    matchup: "Golden Boot",
    statKey: 1,
    outcomeCount: 4,
    outcomes: ["Kylian Mbappé", "Lionel Messi", "Harry Kane", "Jude Bellingham"],
    deadline: futureIso(96),
    yesCondition: "Kylian Mbappé",
    noCondition: "Jude Bellingham",
    resolvedOutcome: null,
    winningOutcomeIndex: null,
    solanaMarketPda: null,
    solanaCreateTxSig: null,
    solanaResolveTxSig: null,
    solanaSettled: false,
  },
  {
    id: "preview-market-nigeria-brazil",
    question: "Nigeria vs Brazil: match winner",
    status: "open",
    parentMarketId: "preview-slate-nigeria-brazil",
    fixtureId: 102,
    matchup: "Nigeria vs Brazil",
    statKey: 2,
    outcomeCount: 3,
    outcomes: ["Draw", "Nigeria", "Brazil"],
    deadline: futureIso(52),
    yesCondition: "Nigeria",
    noCondition: "Brazil",
    resolvedOutcome: null,
    winningOutcomeIndex: null,
    solanaMarketPda: null,
    solanaCreateTxSig: null,
    solanaResolveTxSig: null,
    solanaSettled: false,
  },
  {
    id: "preview-market-france-spain",
    question: "France vs Spain: both teams to score",
    status: "open",
    parentMarketId: "preview-slate-france-spain",
    fixtureId: 103,
    matchup: "France vs Spain",
    statKey: 3,
    outcomeCount: 2,
    outcomes: ["No", "Yes"],
    deadline: futureIso(76),
    yesCondition: "Yes",
    noCondition: "No",
    resolvedOutcome: null,
    winningOutcomeIndex: null,
    solanaMarketPda: null,
    solanaCreateTxSig: null,
    solanaResolveTxSig: null,
    solanaSettled: false,
  },
];

export const PREVIEW_POOL_BY_MARKET: Record<string, string[]> = {
  "preview-market-golden-boot": ["1770000000", "2950000000", "21050000000", "33900000000"],
  "preview-market-nigeria-brazil": ["5100000000", "7800000000", "12100000000"],
  "preview-market-france-spain": ["8700000000", "11300000000"],
};

export const PREVIEW_DUEL_HISTORY = [
  {
    matchId: "preview-duel-1",
    eventQuestion: "England vs Argentina",
    opponent: { username: "pitchoracle" },
    myScore: 5,
    oppScore: 3,
    outcome: "WIN",
    xpEarned: 100,
    resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    myPicks: [],
    oppPicks: [],
  },
  {
    matchId: "preview-duel-2",
    eventQuestion: "Nigeria vs Brazil",
    opponent: { username: "naija10" },
    myScore: 4,
    oppScore: 4,
    outcome: "DRAW",
    xpEarned: 50,
    resolvedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    myPicks: [],
    oppPicks: [],
  },
];

const PREVIEW_LINEUP_PICKS: DuelStatus["ticket"]["picks"] = [
  {
    marketId: "preview-eng-arg-winner",
    optionName: "Match winner",
    matchup: "England vs Argentina",
    selection: "England",
    isCorrect: null,
  },
  {
    marketId: "preview-eng-arg-goals",
    optionName: "Over 2.5 total goals?",
    matchup: "England vs Argentina",
    selection: "Over 2.5",
    isCorrect: null,
  },
  {
    marketId: "preview-eng-arg-btts",
    optionName: "Both teams to score?",
    matchup: "England vs Argentina",
    selection: "Yes",
    isCorrect: null,
  },
  {
    marketId: "preview-eng-arg-corners",
    optionName: "England over 4.5 corners?",
    matchup: "England vs Argentina",
    selection: "Yes",
    isCorrect: null,
  },
  {
    marketId: "preview-eng-arg-card",
    optionName: "A card before 30 minutes?",
    matchup: "England vs Argentina",
    selection: "No",
    isCorrect: null,
  },
];

export const PREVIEW_DUEL_MATCHING: DuelStatus = {
  status: "queued",
  ticket: {
    id: "preview-ticket-matching",
    status: "queued",
    score: 0,
    xpEarned: 0,
    picks: PREVIEW_LINEUP_PICKS,
  },
  match: null,
  opponent: null,
  event: {
    id: "preview-slate-england-argentina",
    question: "England vs Argentina",
  },
};

export const PREVIEW_DUEL_MATCHED: DuelStatus = {
  status: "matched",
  ticket: {
    id: "preview-ticket-matched",
    status: "matched",
    score: 0,
    xpEarned: 0,
    picks: PREVIEW_LINEUP_PICKS,
  },
  match: {
    id: "preview-match-live",
    divergenceScore: 4,
    status: "matched",
  },
  opponent: {
    id: "preview-rival",
    username: "naija10",
    avatarUrl: null,
    picks: [
      { ...PREVIEW_LINEUP_PICKS[0], selection: "Argentina" },
      { ...PREVIEW_LINEUP_PICKS[1], selection: "Under 2.5" },
      { ...PREVIEW_LINEUP_PICKS[2], selection: "Yes" },
      { ...PREVIEW_LINEUP_PICKS[3], selection: "No" },
      { ...PREVIEW_LINEUP_PICKS[4], selection: "Yes" },
    ],
  },
  event: {
    id: "preview-slate-england-argentina",
    question: "England vs Argentina",
  },
};

const resolvedPreviewPicks = (
  picks: DuelStatus["ticket"]["picks"],
  results: Array<{ outcome: string; correct: boolean }>,
): DuelStatus["ticket"]["picks"] =>
  picks.map((pick, index) => ({
    ...pick,
    status: "resolved",
    resolvedOutcome: results[index]?.outcome ?? null,
    isCorrect: results[index]?.correct ?? false,
  }));

export const PREVIEW_DUEL_RESOLVED: DuelStatus = {
  status: "resolved",
  ticket: {
    id: "preview-ticket-resolved",
    status: "resolved",
    score: 4,
    xpEarned: 100,
    picks: resolvedPreviewPicks(PREVIEW_LINEUP_PICKS, [
      { outcome: "England", correct: true },
      { outcome: "Under 2.5", correct: false },
      { outcome: "Yes", correct: true },
      { outcome: "Yes", correct: true },
      { outcome: "No", correct: true },
    ]),
  },
  match: {
    id: "preview-match-resolved",
    divergenceScore: 4,
    status: "resolved",
  },
  opponent: {
    id: "preview-rival",
    username: "naija10",
    avatarUrl: null,
    picks: resolvedPreviewPicks(
      [
        { ...PREVIEW_LINEUP_PICKS[0], selection: "Argentina" },
        { ...PREVIEW_LINEUP_PICKS[1], selection: "Under 2.5" },
        { ...PREVIEW_LINEUP_PICKS[2], selection: "Yes" },
        { ...PREVIEW_LINEUP_PICKS[3], selection: "No" },
        { ...PREVIEW_LINEUP_PICKS[4], selection: "Yes" },
      ],
      [
        { outcome: "England", correct: false },
        { outcome: "Under 2.5", correct: true },
        { outcome: "Yes", correct: true },
        { outcome: "Argentina", correct: false },
        { outcome: "No", correct: false },
      ],
    ),
  },
  event: {
    id: "preview-slate-england-argentina",
    question: "England vs Argentina",
  },
};
