# Verity Admin Console

The administrative control panel for the TxLINE World Cup arena. Built with **Next.js (App
Router)**, **React 19**, and **Tailwind CSS v4** + shadcn UI primitives. Runs independently of
the user app on `http://localhost:3001`.

Admins create markets and PvP game events, and monitor keeper/wallet balances. Access is
restricted to accounts flagged `"admin"` in MongoDB (email-OTP sign-in).

## Markets tab (`MarketsAdmin`)

The primary tool — one surface with a mode toggle for the two things an admin creates:

- **Individual Market** — a single TxLINE-settled prop on one fixture.
- **PvP Game Event** — a slate of props (across one or more fixtures) that players build
  lineups from and duel over (`POST /pvp/slates`).

Both are built from the same **guided market-type picker** (no raw stat keys):

1. **Match** — a dropdown of live TxLINE fixtures (pulled from `GET /solana/fixtures`).
2. **Market** — one grouped list of every settleable market in plain English, using the
   fixture's real team names:
   - **Result:** Match winner, Double chance, Goal handicap
   - **Goals:** Total goals, Both teams to score, Team to score, Clean sheet, Exact total
     goals, Correct score, Team total goals
   - **Corners:** Total corners, Team corners, Most corners
   - **Cards:** Total yellow cards, Total/any red cards, Team yellow cards, Most bookings
3. **Contextual inputs** appear per type — a line (2.5), a team/outcome picker, correct-score
   two-number inputs, or a period selector (full / 1st half / 2nd half).
4. An auto-written (editable) **question** and a live **settlement-rule preview**
   (e.g. `YES if Australia goals − Brazil goals > 0`).

Each selection is compiled into the on-chain config (`statKey`, `statKeyB`, per-outcome
`rules`, `outcomeCount`) and `POST`ed to `/solana/admin/create-market` (individual) or
`/pvp/slates` (PvP event), which deploys the parimutuel pool(s). Settlement then runs
automatically via the backend keeper + TxLINE.

The Markets list shows every created market with a **Force settle** action per unresolved
market — a keeper-miss safety net that fetches a fresh TxLINE proof and settles on-chain now
(`POST /markets/:id/force-settle`) — plus a **Prune stale** action for pre-redeploy accounts.

## Metrics tab

On-chain volume, users, bets, fees, and keeper balances.

## Balances header

- **Admin Wallet** — shows **SOL (gas)** prominently plus USDC, for the admin's Solana wallet.
- **Keeper (Settlement Signer)** — the backend protocol wallet that signs `init_market`/`settle`;
  shows **SOL (gas)** + USDC so you can top it up before it runs dry.

(SOL is the native gas token on Solana; USDC is the settlement collateral.)

## Getting started

```bash
pnpm install
cp .env.example .env    # set NEXT_PUBLIC_API_URL to the NestJS API, e.g. http://localhost:5050/api

pnpm dev      # → http://localhost:3001
pnpm build
```
