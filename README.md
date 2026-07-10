# TxLINE World Cup — Verity

![Solana](https://img.shields.io/badge/Solana-Devnet-14F195)
![TxLINE](https://img.shields.io/badge/Settled_via-TxLINE_validate__stat-blue)
![Parimutuel](https://img.shields.io/badge/Markets-Parimutuel_USDC-emerald)

> A social sports prediction arena whose World Cup prop markets settle **trustlessly on
> Solana** by CPI-ing into [TxLINE](https://txline.txodds.com)'s on-chain `validate_stat`
> instruction — no oracle trust beyond TxLINE's cryptographically-signed match data.

This is a hackathon pivot of the original "Verity" (an EVM/Arc prediction-market social app)
onto the **TxODDS TxLINE** track. The social layer, PvP Arena, missions/XP, admin, and
portfolio are kept; the settlement engine is rebuilt as a custom Solana Anchor program that
reads TxLINE's signed Merkle roots.

## How settlement works

TxLINE publishes World Cup match stats as signed Merkle roots on Solana and exposes a
`validate_stat` instruction that verifies a stat against those roots and returns a boolean.
Our program never trusts an off-chain oracle — at settlement a keeper fetches a fresh Merkle
proof from TxLINE's REST API and the program **CPIs into `validate_stat`** to get the verdict.

```
Admin/user creates market  →  on-chain parimutuel pool (USDC-SPL)
Users stake YES / NO       →  pool grows
Match ends                 →  keeper fetches TxLINE proof(s)
settle() CPIs validate_stat →  boolean verdict sets the winning side
Winners + LPs claim         →  pro-rata USDC payout
```

### Market types it can settle

The engine resolves any predicate over TxLINE's per-participant **goals / yellow cards /
red cards / corners** (at full match or a half), combined three ways:

- **Single stat** — e.g. "Team A to score", "Team A clean sheet".
- **Arithmetic (Add / Subtract)** — totals (`A + B` goals), match winner & handicap
  (`A − B` goals), corner/card races.
- **Logical (AND / OR)** — the program calls `validate_stat` twice and combines the booleans:
  **BTTS** (`A>0 AND B>0`), **correct score** (`A=2 AND B=1`), "either team scores 3+", etc.

The only markets that can't be settled are those whose stat TxLINE doesn't publish (offsides,
fouls, shots, possession, goalscorer identity).

## Monorepo layout

```
verity-txline/
├── solana/     # Anchor program (verity-worldcup) — the settlement engine
├── backend/    # NestJS API: TxLINE client, keeper, Circle Solana wallets, social/PvP
├── frontend/   # Next.js user app (custodial, no wallet popups)
├── admin/      # Next.js admin console (market builder, moderation, metrics)
└── docs/       # Internal planning notes (gitignored)
```

`frontend`, `backend`, and `admin` are a **pnpm workspace**. `solana` is a standalone
Anchor project (npm) with its own toolchain — see [solana/README.md](solana/README.md).

## Key facts

| | |
| --- | --- |
| Settlement program (devnet) | `8t3WbL4A91QGdUwdz9EAAW1yCtyVyEmmMBGRFcG89a21` |
| TxLINE program (devnet) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| Collateral | USDC (SPL); SOL is the gas token |
| Wallets | Custodial **Circle** Solana wallets (`SOL-DEVNET`), backend-signed |
| Toolchain | Anchor 0.31.1 · Agave 4.0.2 · NestJS 11 · Next.js 15 / React 19 |

## Getting started

### Prerequisites
- **Node.js 20+** and **pnpm**
- **MongoDB** (local or remote)
- For the on-chain program: **Anchor 0.31.1** + **Agave/Solana 4.0.2** (see [solana/README.md](solana/README.md))

### Setup
```bash
git clone <repo> verity-txline
cd verity-txline
pnpm install

# Configure each service (fill in secrets — never commit .env)
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example    admin/.env
```

### Run
```bash
pnpm dev:backend    # NestJS API   → http://localhost:5050/api
pnpm dev:frontend   # user app     → http://localhost:3000
pnpm --filter verity-admin dev   # admin console → http://localhost:3001
```

## Demo flow

1. **Sign in** at `http://localhost:3000` (passwordless email OTP). A custodial Circle Solana
   wallet is provisioned automatically — fund it with devnet USDC + a little SOL for gas.
2. **Create a market** in the admin console: pick a live TxLINE fixture and a market type
   (Total goals, Match winner, BTTS, Correct score, …). The on-chain pool + settlement rule
   are built for you and deployed.
3. **Stake** YES/NO on the market card (Circle signs the Solana transaction — no popup).
4. **Settlement** happens automatically: when the match ends the keeper fetches TxLINE's proof
   and calls `settle`, which CPIs `validate_stat`. The market card shows the Solana explorer
   link to the settlement transaction.
5. **Claim** winnings; PvP duels tied to the same fixtures are scored and XP awarded.

---

<p align="center">Built for the TxODDS TxLINE track · settled trustlessly on Solana</p>
