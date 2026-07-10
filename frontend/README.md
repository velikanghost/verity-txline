# Verity Frontend

The user-facing app for the TxLINE World Cup arena, built with **Next.js (App Router)**,
**React 19**, and **Tailwind CSS v4**. Custodial by design — users sign in with email OTP, get a
**Circle Solana wallet** provisioned automatically, and stake/claim without ever seeing a wallet
popup (the backend builds + signs each Solana transaction).

Runs on `http://localhost:3000`.

## Page routes

| Route | View |
| --- | --- |
| `/` | **Home feed / PvP Arena** — upcoming matchups, live duels, ticket builders. |
| `/markets` | **Markets** — tabs for General, PvP Arena, and **World Cup** prop markets. |
| `/markets/worldcup` | **World Cup markets** — standalone list of TxLINE-settled prop markets. |
| `/profile/[id]` | Public profile: stats, positions, rank, XP, past duels. |
| `/portfolio` | Balances (USDC + SOL), position values, active duels, history. |
| `/notifications` | Comments, PvP results, market resolution events. |
| `/posts/[id]` | Single matchup/market thread with comments. |

## World Cup market cards

`components/worldcup/` renders TxLINE markets: each card shows the **match name**
(e.g. "Australia vs Brazil"), the question, live YES/NO pool sizes, and — once resolved — a
**verifiable resolution receipt** linking to the Solana settlement transaction on the explorer.
Staking and claiming POST to `/solana/stake` and `/solana/claim`; the backend signs via Circle.

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
