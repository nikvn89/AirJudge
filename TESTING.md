# AirJudge v1.2 verification record

## Local gates

| Gate | Observed result | Status |
|---|---|---|
| `npm ci && npm run build` | Production build completed; 482 modules transformed | PASS |
| `python3 -m pytest tests/ -q` | 25 passed in 0.84s | PASS |
| `python3 tests/mutation_check.py` | 22/22 killed (100.0%) | PASS |
| `python3 -m genvm_linter.cli lint contracts/airjudge.py` | Lint passed (3 checks) | PASS |
| `sha256sum contracts/airjudge.py` | `156ed2a5906649bc3ba620d7be87afb488fbe9ed80058c30bc3bc761fa5c362c` | PASS |

Direct Mode proves deterministic contract behavior but cannot observe the outbound native transfer. See `tests/README.md` for the exact boundary.

## Fresh StudioNet runtime matrix

Fresh v2 contract address: [`0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1`](https://explorer-studio.genlayer.com/address/0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1)

Deployment transaction: [`0x6205cf355d42efd66382f2979d4f583fe6d5c78671a34de47d8754f4eacf30cd`](https://explorer-studio.genlayer.com/tx/0x6205cf355d42efd66382f2979d4f583fe6d5c78671a34de47d8754f4eacf30cd) — `FINALIZED / SUCCESS`.

No old runtime proof is reused because the contract bytes changed. A row stays `NOT RUN` until its actual transaction hash and Explorer link are recorded.

| # | Method | Expected observation | Transaction hash / Explorer | Status |
|---:|---|---|---|---|
| 1 | `create_campaign` | New campaign exists at the fresh address | — | NOT RUN |
| 2 | `fund_campaign` | Pool increases by the funded amount | — | NOT RUN |
| 3a | `submit_application` | Application becomes `PENDING` | — | NOT RUN |
| 3b | `judge_application` | Eligible application reserves exactly one reward | — | NOT RUN |
| 4 | `reclaim_unused_pool` while active | Reverts with `close the campaign before reclaiming` | — | NOT RUN |
| 5 | `set_campaign_active(false)` | Campaign becomes inactive | — | NOT RUN |
| 6 | `reclaim_unused_pool` | Creator receives `pool - reserved`; post-state `pool == reserved`, available `0` | — | NOT RUN |
| 7 | `withdraw` after reclaim | Approved applicant receives the full reserved reward | — | NOT RUN |
| 8 | second `reclaim_unused_pool` | Reverts with `nothing to reclaim` | — | NOT RUN |

For each completed row record method, full hash, before/after state, and a deep Studio Explorer transaction URL. For step 6 also record creator balance delta; for step 7 record applicant balance delta.

## UI before / after evidence

Required files under `docs/evidence/`:

| Screenshot | Required content | Status |
|---|---|---|
| `milestone-v2-before.png` | Closed campaign in the previous UI without reclaim control | NOT RUN |
| `milestone-v2-reclaim-ready.png` | New UI with reclaim button plus Pool / Reserved / Available | NOT RUN |
| `milestone-v2-reclaimed.png` | Refreshed post-reclaim state with Available `0` | NOT RUN |

## CI and immutable links

- Green two-job CI run: `PENDING /actions/runs/<id>`
- Immutable compare: `https://github.com/nikvn89/AirJudge/compare/0c71578b2b992eb44e4d7b6d0b102dda772c8e8f...<NEW_40_CHARACTER_HEAD_SHA>`
- Deep test evidence: `https://github.com/nikvn89/AirJudge/blob/<NEW_40_CHARACTER_HEAD_SHA>/TESTING.md`

These placeholders must be replaced after upload/push and the fresh runtime exercise. Do not mark any pending item PASS without its evidence.
