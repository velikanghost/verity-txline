# verity-worldcup — Solana settlement engine

A parimutuel prop-market settlement program that resolves **trustlessly** by CPI-ing into
[TxLINE](https://txline.txodds.com)'s on-chain `validate_stat` instruction. Bettors stake USDC
on one of a market's **N outcomes** (2–4) for a World Cup match stat; at settlement a keeper
submits fresh TxLINE Merkle proof(s), the program verifies them against TxLINE's signed on-chain
roots, and winners claim pro-rata (losing pools fund winners). It's a **pure parimutuel** — no
LPs and no creator royalty; the only skim is a treasury fee. No oracle trust beyond TxLINE.

- Devnet program id: `8t3WbL4A91QGdUwdz9EAAW1yCtyVyEmmMBGRFcG89a21`
- TxLINE program: devnet `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`,
  mainnet `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` (baked into
  `programs/verity-worldcup/src/txline_cpi.rs`; the `localnet` feature swaps it for the mock).

## Programs

| Program           | Purpose                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `verity-worldcup` | The settlement engine (the deliverable).                                                                                        |
| `mock-txline`     | Local stand-in for TxLINE's `validate_stat`, used only by `anchor test` so the CPI + payout math run deterministically offline. |

## Accounts

- **Market** PDA — seeds `["market", fixture_id (i64 LE), nonce (u32 LE)]`. The **nonce** (not
  the stat key) is the uniqueness seed, so several markets on one fixture can share a base stat
  key (winner / draw / totals all read P1 goals) without their PDAs colliding.
- **Vault** PDA — `["vault", market]`, the market's USDC token account.
- **Position** PDA — `["position", market, owner]`, per-account per-outcome stake accounting.

## Instructions

```
init_market(fixture_id, nonce, stat_key, stat_key_b, stat_period,
            outcome_count, rules[], deadline, fee_bps)
```

Creates a market with `outcome_count` outcomes (2–4). Outcome `0` is the **default / else**
bucket; each of `rules[]` (length `outcome_count − 1`) is the predicate for outcomes `1..N`,
evaluated in order (first true wins, else outcome 0). The winning conditions are fixed here and
immutable. A binary market is just `outcome_count = 2` with one rule; a 3-way match result is
`outcome_count = 3` (0 = Draw, 1 = A−B > 0, 2 = A−B < 0).

- `stake(outcome, amount)` — stake USDC on outcome index `0..N−1`.
- `settle(ts, fixture_summary, fixture_proof, main_tree_proof, stat_value, stat_period,
event_stat_root, stat_proof, stat_b?)` — keeper-only. CPIs `validate_stat` (once per rule that
  needs it), picks the winning outcome, and skims the treasury fee. Zero stake on the winning
  outcome voids the market (everyone refunded).
- `claim()` — winner payout: `distributable * winning_stake / winning_pool` (voided markets
  refund the caller's stakes).
- `claim_treasury()` — keeper claims the one-time treasury fee.

## Settlement modes

Each outcome's rule combines up to two proven stats; the mode is fixed per rule at `init_market`:

| Mode            | Stored as                    | Rule evaluated                                       | Example                                       |
| --------------- | ---------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| **Single stat** | `op=0, logic=0`              | `predicate(stat_a)`                                  | Team A to score: `A goals > 0`                |
| **Arithmetic**  | `op=1 Add` / `op=2 Subtract` | `predicate(stat_a [±] stat_b)`                       | Total goals: `A + B > 2`; Winner: `A − B > 0` |
| **Logical**     | `logic=1 AND` / `logic=2 OR` | `(stat_a cmp_a thr_a) [AND/OR] (stat_b cmp_b thr_b)` | BTTS: `(A>0) AND (B>0)`                       |

- **Arithmetic** `op` is TxLINE's own combine — one `validate_stat` CPI with `stat_b`/`op`.
- **Logical** mode runs **two** `validate_stat` CPIs (one predicate per stat) and combines the
  booleans in-program. ~397k CU for two proofs, well under the 1.4M tx ceiling. This is what
  makes BTTS / correct-score provable (TxLINE's arithmetic op alone can't express AND).

### Stat key encoding

Base keys (full match, **odd = Participant 1, even = Participant 2**):
`1/2` goals · `3/4` yellow cards · `5/6` red cards · `7/8` corners. Period offsets add to the
base key: `+1000` 1st half, `+2000` 2nd half, `+3000/+4000` ET, `+5000` penalties. Fetch the
proof for a stat: `GET /api/scores/stat-validation?fixtureId=..&seq=..&statKey=..`. The
`stat_period` passed to `settle` comes from the fetched proof (not derived from the key).

## Build / test / deploy

The SBF build ships its own rustc — use **platform-tools v1.53 (rustc 1.89)** via Agave 4.0.2,
and put the stable release bin dir directly on PATH (the `active_release` symlink is unreliable):

```bash
STABLE=$(ls -d ~/.local/share/solana/install/releases/stable-*/solana-release | head -1)
export PATH="$STABLE/bin:$HOME/.cargo/bin:$PATH"
cargo-build-sbf --version   # expect: 4.0.0 / platform-tools v1.53 / rustc 1.89.0
```

```bash
# Offline deterministic tests (mock-txline via the localnet feature)
cargo-build-sbf --features localnet
anchor idl build -p verity_worldcup -o target/idl/verity_worldcup.json -t target/types/verity_worldcup.ts
anchor test --skip-build          # single-stat, arithmetic winner, logical BTTS, 3-way + payouts

# Devnet build + deploy
cargo-build-sbf
solana program deploy target/deploy/verity_worldcup.so \
  --program-id target/deploy/verity_worldcup-keypair.json \
  --upgrade-authority .keys/devnet-keeper.json --url devnet
```

Each runs `init_market → stake → settle (CPI into real validate_stat) → claim`.
