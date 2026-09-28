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

No old runtime proof is reused because the contract bytes changed. All hashes below were read back from the official StudioNet RPC for the fresh contract address after the browser run.

| # | Method | Expected observation | Transaction hash / Explorer | Status |
|---:|---|---|---|---|
| 1 | `create_campaign` | Campaign `airjudge-v12-reclaim-test` created with reward `1 GEN` | [`0x8d9fc35b…11794`](https://explorer-studio.genlayer.com/tx/0x8d9fc35b97b4567b09912d7540bdb0c7b3cd58f86190c410cecd69a6c3311794) | PASS |
| 2 | `fund_campaign` | Pool increases to `3 GEN` | [`0xa0d73b18…4800a`](https://explorer-studio.genlayer.com/tx/0xa0d73b1892b2dbce29479a35d51830752e9d2b55a9e6e2e6de23626df204800a) | PASS |
| 3a | `submit_application` | Second applicant becomes `PENDING` | [`0x510f9bed…bf34b`](https://explorer-studio.genlayer.com/tx/0x510f9bed9e47a47d72c1bdd3a7331c552afdc81298bbb5c2a756f805a0abf34b) | PASS |
| 3b | `judge_application` | Result is `ELIGIBLE_RESERVED`; Pool / Reserved / Available = `3 / 1 / 2 GEN` | [`0x96bd663c…1c39a`](https://explorer-studio.genlayer.com/tx/0x96bd663cdb1977e032cfa25186a63ee038af6d60b0b6f6f1c402b3abfcb1c39a) | PASS |
| 4 | `reclaim_unused_pool` while active | Reverts with `close the campaign before reclaiming` | [`0x4c2abf17…47ff6`](https://explorer-studio.genlayer.com/tx/0x4c2abf172028e2619e47d964b688c9885b33ee4af241110f5cb4e7aa02847ff6) | PASS |
| 5 | `set_campaign_active(false)` | Campaign becomes `PAUSED`; treasury remains `3 / 1 / 2 GEN` | [`0xcea867dc…f8bb6`](https://explorer-studio.genlayer.com/tx/0xcea867dc2cd08cb595075702a55a837be67249944220d8269e038617efaf8bb6) | PASS |
| 6 | `reclaim_unused_pool` | Creator receives `2 GEN`; Pool / Reserved / Available becomes `1 / 1 / 0 GEN` | [`0xc3b9e359…722d3`](https://explorer-studio.genlayer.com/tx/0xc3b9e359b4c2b69dabd8e56c644646e549a4809cfefa37450c9f89d948d722d3) | PASS |
| 7 | `withdraw` after reclaim | Applicant receives reserved `1 GEN`; status becomes `ELIGIBLE_PAID` and treasury becomes `0 / 0 / 0 GEN` | [`0xf2e0d494…49b5d`](https://explorer-studio.genlayer.com/tx/0xf2e0d494cde528534e073c779c1f09685e8a3a563b8879a061dd15f5fae49b5d) | PASS |
| 8 | second `reclaim_unused_pool` | Reverts with `nothing to reclaim` | [`0x47b7cfeb…ca80e`](https://explorer-studio.genlayer.com/tx/0x47b7cfebc5b02c556c70a3d1fd9ab84fc508d20f70d5cec32235700dd48ca80e) | PASS |

The native transfer triggered by step 6 is [`0x3a59a607…a1c8c`](https://explorer-studio.genlayer.com/tx/0x3a59a607fcbf9cfa7f25b0c1cb8fc2afea46e5b1f116810ed5c737b27a4a1c8c), sending `2 GEN` from the contract to creator `0x6276095FAEA15108740445ff277fdA8c304657F4`. The transfer triggered by step 7 is [`0x836ad2b7…7ece0`](https://explorer-studio.genlayer.com/tx/0x836ad2b75f5b8642d3bc5a6bd2bf02026fedad685b0c60f25c49762c3067ece0), sending `1 GEN` to applicant `0x146e44881d35814bA582D265AF5b97ef2695ec8e`.

An additional semantic check rejected weak self-asserted evidence as `NOT_ELIGIBLE`: submission [`0x3a4b20d1…458b2`](https://explorer-studio.genlayer.com/tx/0x3a4b20d15bb7139d23a2b52a6b68bfe0132b9e80ae61d8edde17d77d96f458b2), adjudication [`0x2c289e87…c5c46`](https://explorer-studio.genlayer.com/tx/0x2c289e87dab02f2a1d0f9315ccab4e6cb9e4348bf78b30deb40db759e8bc5c46).

## UI before / after evidence

Required files under `docs/evidence/`:

| Screenshot | Required content | Status |
|---|---|---|
| `milestone-v1-create-fund-success.png` | Baseline v1 UI before the reclaim milestone | PASS |
| `milestone-v2-created-funded.png` | Fresh v2 campaign funded to `3 GEN` | PASS |
| `milestone-v2-eligible-reserved.png` | Eligible result reserves `1 GEN`; available remains `2 GEN` | PASS |
| `milestone-v2-reclaim-ready.png` | Closed campaign with Pool / Reserved / Available = `3 / 1 / 2 GEN` | PASS |
| `milestone-v2-reclaimed.png` | Post-reclaim state = `1 / 1 / 0 GEN` | PASS |
| `milestone-v2-withdrawn.png` | Reserved reward remains withdrawable; final state = `0 / 0 / 0 GEN` | PASS |
| `milestone-v2-active-reclaim-reverted.png` | Active-campaign reclaim protection | PASS |
| `milestone-v2-second-reclaim-reverted.png` | Double-reclaim protection | PASS |

## CI and immutable links

- Green two-job CI run: `PENDING /actions/runs/<id>` (add after the final evidence commit)
- Immutable compare: `https://github.com/nikvn89/AirJudge/compare/0c71578b2b992eb44e4d7b6d0b102dda772c8e8f...<NEW_40_CHARACTER_HEAD_SHA>`
- Deep test evidence: `https://github.com/nikvn89/AirJudge/blob/<NEW_40_CHARACTER_HEAD_SHA>/TESTING.md`

Only the GitHub-dependent placeholders remain. Replace them after uploading this final evidence package, then wait for both CI jobs to pass.
