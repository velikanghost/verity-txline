# Verity Backend

The NestJS 11 API server powering the TxLINE World Cup arena. It provides the social/PvP layer,
provisions custodial **Circle Solana wallets**, talks to **TxLINE** for match data + Merkle
proofs, and runs the **keeper** that auto-settles markets by CPI-ing into the
[`verity-worldcup`](../solana) program.

Runs on `http://localhost:5050/api` (Swagger at `/api/docs`).

## Module overview (`src/modules/`)

| Module | Purpose |
| --- | --- |
| **solana** | The chain layer. `SolanaService` (keeper-signed `init_market`/`settle`, pool reads), `TxlineService` (TxLINE REST + proof client), `CircleSolanaWalletService` (per-user custodial `SOL-DEVNET` wallets + tx signing), `WorldCupMarketService` (create market + deploy pool). |
| **markets** | Market CRUD + the `MarketsKeeperService` settlement loop (below) + admin **force-settle** (`POST /markets/:id/force-settle`) as a keeper-miss safety net. |
| **pvp** | PvP Arena: **slates** (cross-game contests), duels, matchmaking, ticket scoring. Each slate prop is a real TxLINE-settled parimutuel market that's individually backable on the home feed and links to its slate. |
| **auth** | Passwordless email OTP (Resend) → JWT. Serializes the user's Solana wallet address. |
| **users** | Profiles, XP/arena points, followers, Solana wallet id/address. |
| **posts** / **comments** / **interactions** | Social feed containers, threaded comments, likes/reshares. |
| **notifications** / **socket** | Activity feed + Socket.IO real-time broadcasts. |

Removed: the EVM `blockchain`, LLM `agent`, `liquidity`, Circle `nanopayments`/`royalty`,
and the `missions` / `coupons` / `categories` modules. TxLINE-verified settlement replaces
oracle/subjective resolution, and markets are a **pure parimutuel** — no LPs and no creator
royalty on-chain (only a treasury fee).

## Market resolution keeper

`MarketsKeeperService.processSolanaMarkets()` runs on a background loop:

1. Finds markets past their staking deadline that aren't yet settled.
2. Fetches a fresh TxLINE Merkle proof for the market's stat (and a **second proof** when the
   market is relational — arithmetic `op` or logical `logic`).
3. Calls `SolanaService.settleMarket(...)`, which CPIs `validate_stat`; the boolean verdict sets
   the winning side on-chain.
4. Marks the market `resolved`/`voided`, stores the settlement tx signature, and fires
   `PvpService.resolvePvpMatchesForMarket(...)` to score any linked duels.

The keeper signer (`SOLANA_KEEPER_PRIVATE_KEY`) is a backend-controlled protocol wallet — it
authorizes `init_market`/`settle` only, and is distinct from each user's Circle wallet.

## TxLINE integration (`TxlineService`)

- **Fixtures:** `GET /api/fixtures/snapshot` (surfaced to admin via `GET /solana/fixtures`).
- **Scores:** snapshot + SSE stream for live/completed match state.
- **Proofs:** `GET /api/scores/stat-validation?fixtureId=..&seq=..&statKey=..`, normalized into
  the exact `{ ts, statValue, statPeriod, eventStatRoot, statProof, fixtureProof, mainTreeProof,
  fixtureSummary, epochDay }` shape `settle` needs.

## Custodial Solana wallets (`CircleSolanaWalletService`)

Each user gets a Circle developer-controlled EOA on `SOL-DEVNET`. User actions
(`stake`/`claim`/`send`) are built server-side as a single Solana transaction, base64-encoded,
signed via Circle's `signTransaction`, and broadcast — no wallet popup.

## Key endpoints

`/solana`: `admin/create-market`, `admin/prune-stale`, `stake`, `claim`, `send`, `balance`
(USDC + SOL), `markets`, `market/:id/pool`, `fixtures`. \
`/pvp`: `slates` (admin — create a PvP game event), `ticket`, `status`, `active-events`,
`leaderboards`, `history`. \
`/markets`: `:id/force-settle` (admin).

## Getting started

```bash
pnpm install
cp .env.example .env    # fill in the values below

pnpm dev                # watch mode → http://localhost:5050/api
pnpm build && pnpm start
```

### Required env

| Var | Purpose |
| --- | --- |
| `MONGODB_URI` | Database connection |
| `JWT_SECRET`, `RESEND_API_KEY` | Auth + OTP email |
| `SOLANA_RPC_URL`, `SOLANA_CLUSTER` | Solana connection (devnet) |
| `SOLANA_KEEPER_PRIVATE_KEY` | base58 keeper secret — signs `init_market`/`settle` |
| `SOLANA_USDC_MINT` | SPL USDC mint for stakes/pools |
| `TXLINE_API_ORIGIN`, `TXLINE_API_TOKEN` | TxLINE REST + `X-Api-Token` |
| `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `CIRCLE_WALLET_SET_ID`, `CIRCLE_SOLANA_BLOCKCHAIN` | Custodial Solana wallets |

`.env`, and the Circle `recovery`/`recovery-dev` entity-secret material, are gitignored — never
commit them. The IDL at `src/modules/solana/idl/verity_worldcup.json` is copied from the Anchor
build (`solana/target/idl/`) and must be re-copied after any program change.
