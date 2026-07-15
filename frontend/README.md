# Verity Frontend

The user-facing app for the TxLINE World Cup arena, built with **Next.js (App Router)**,
**React 19**, and **Tailwind CSS v4**. Custodial by design — users sign in with email OTP, get a
**Circle Solana wallet** provisioned automatically, and stake/claim without ever seeing a wallet
popup (the backend builds + signs each Solana transaction). Ships as a single fixed light
"arcade" theme (Poppins + Silkscreen; no theme toggle).

Runs on `http://localhost:3000`.

## Page routes

| Route | View |
| --- | --- |
| `/` | **Home** — signed-out: landing hero + how-it-works; signed-in: player progress + World Cup markets. |
| `/pvp` | **PvP Arena** — contest carousel, cross-game lineup builder, live duels. |
| `/search` | Search open PvP contests. |
| `/leaderboard` | Rankings (also embedded in the profile's **Rankings** tab). |
| `/profile` | Account: **Profile · Portfolio · Rankings** tabs. |
| `/profile/[id]` | Public profile: stats, positions, XP, past duels. |
| `/portfolio` | Balances (USDC + SOL), position values, active duels, history. |
| `/markets`, `/markets/worldcup` | Standalone lists of TxLINE-settled World Cup prop markets. |
| `/notifications` | Comments, PvP results, market resolution events. |
| `/posts/[id]` | Single matchup/market thread with comments. |

## World Cup market cards

`components/worldcup/` renders TxLINE markets: each card shows the **match name**
(e.g. "Australia vs Brazil"), the question, live per-outcome pool sizes, and — once resolved — a
**verifiable resolution receipt** linking to the Solana settlement transaction on the explorer.
Standalone markets stake/claim directly via `/solana/stake` and `/solana/claim` (backend signs
via Circle); a market that belongs to a **PvP game event** instead shows an **"Enter in PvP"**
button that routes to `/pvp?slate=…`, where it's backed as part of a duel lineup.

## Custom hooks

| Hook | Description |
| --- | --- |
| `useUsdcBalance` | The user's Circle wallet USDC **and** SOL balance (`GET /solana/balance`). |
| `useUsdcTransfer` | Sends USDC from the user's Solana wallet (`POST /solana/send`). |
| `useClaimWinnings` | Redeems winnings across resolved markets (`POST /solana/claim`). |
| `useWalletProfile` | Authenticated user profile + Solana wallet address. |
| `useUserPortfolio` | Positions, trade logs, balances. |
| `useDailyVotes` | Remaining free daily signal votes. |
| `useFeed` | Feed posts from the NestJS API. |
| `useSocket` | Socket.IO rooms for real-time feed/market/user updates. |

World Cup market queries/mutations live in `store/verity/worldcupQueries.ts`; Solana helpers
(explorer links, address formatting, condition labels) in `lib/solana.ts`.

## Getting started

```bash
pnpm install
cp .env.example .env

pnpm dev      # → http://localhost:3000
pnpm build
```

### Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:5050/api

# Solana / TxLINE
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_WORLDCUP_PROGRAM_ID=8t3WbL4A91QGdUwdz9EAAW1yCtyVyEmmMBGRFcG89a21
NEXT_PUBLIC_TXLINE_PROGRAM_ID=6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
```

`.env` is gitignored; `.env.example` is the committed template.
