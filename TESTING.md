# AirJudge verification record

## v1.3 — fresh StudioNet runtime (Milestone v3)

Contract v1.3: [`0x8DFc1aFE0542bb399756fa9E5BA89992E7B53a85`](https://explorer-studio.genlayer.com/address/0x8DFc1aFE0542bb399756fa9E5BA89992E7B53a85) · deployment [`0xbc7aff07…fe808d`](https://explorer-studio.genlayer.com/tx/0xbc7aff073743785d907957780eeed57f3e8c816124fd360f85d99327fffe808d) — `FINALIZED / SUCCESS` · SHA-256 `1da8d4a99236446e586d74ef049a9e94d9c54e986ac5c5f46ccd267ceead42b0`.

Campaign `airjudge-v13-window-test`, reward `1 GEN`. Creator `0x6276095FAEA15108740445ff277fdA8c304657F4` · applicant A `0x037f58E33c1Ec8fdA272361E0aAC1e31054a1CDE` · applicant B `0x146e44881d35814bA582D265AF5b97ef2695ec8e`. Public evidence and wallet-proof pages: [`docs/evidence/v13-*.html`](./docs/evidence/), served at `https://nikvn89.github.io/AirJudge/evidence/`.

| # | Wallet | Method | Observed on StudioNet (2026-10-06) | Tx | Status |
|---:|---|---|---|---|---|
| 1 | creator | `create_campaign` + `fund_campaign` 1 GEN | Pool / Reserved / Available = `1 / 0 / 1 GEN` | [`0x82e9d7a1…7a03db`](https://explorer-studio.genlayer.com/tx/0x82e9d7a16844d4b839fea93a942a953814454c8494e33af28c43fa75297a03db) [`0x852bc098…de508d`](https://explorer-studio.genlayer.com/tx/0x852bc0983250b9215efd29f89a0cef4d7f4bbb5bd7564b6ffaac47e727de508d) | PASS |
| 2 | A | `submit_application` + `judge_application` | `ELIGIBLE_RESERVED`; claim window "Claim by 2026-11-05 (UTC) — 30 days left"; `1 / 1 / 0 GEN` · [screenshot](./docs/evidence/milestone-v3-claim-window.png) | [`0x222fde20…85e3aa`](https://explorer-studio.genlayer.com/tx/0x222fde20b64eaab4f3b19e2226cd03712c1cdf81c753a0b4f3c0de3c7885e3aa) [`0xd74e2460…5aa726`](https://explorer-studio.genlayer.com/tx/0xd74e24600285cca27401182963f4e278aaf2488fe3232ba976852762525aa726) | PASS |
| 3 | B | `is_evidence_used(campaign, A's evidence URL + "?utm_source=x")` before signing | The accepted-state read returned **true** for the variant (v1.2 keyed the raw URL and returned false); the app refused to submit, so no transaction was sent · [screenshot](./docs/evidence/milestone-v3-url-variant-blocked.png). The contract-side revert `this evidence has already been submitted to this campaign` is covered by `tests/test_v13_settlement.py` | read-only | PASS |
| 4 | B | `submit_application` (own evidence) + `judge_application` | `ELIGIBLE_UNDERFUNDED`, "waiting for funds" (pool fully reserved) · [screenshot](./docs/evidence/milestone-v3-underfunded.png) | [`0x22430ee9…f8213f`](https://explorer-studio.genlayer.com/tx/0x22430ee9b8b22b01bcc89123c00f2b5d55fedcbaece85e5cc7772cfbb1f8213f) [`0x375f1ccf…46c893`](https://explorer-studio.genlayer.com/tx/0x375f1ccf0e7b1b5998017e483e2d98ed254a067e1fdfed148bc36269bb46c893) | PASS |
| 5 | creator | `fund_campaign` 1 GEN | `2 / 1 / 1 GEN`; B now reservable | [`0x85046665…fa4e93`](https://explorer-studio.genlayer.com/tx/0x85046665f4e1649f447d66f363359ccb5bb420074511b61e007bfd8112fa4e93) | PASS |
| 6 | A | `reserve_underfunded(campaign, B)` (called by a third party) | B `ELIGIBLE_RESERVED`, claim window starts; `2 / 2 / 0 GEN` · [screenshot](./docs/evidence/milestone-v3-late-reservation.png) | [`0xf6dd9ff6…39f807`](https://explorer-studio.genlayer.com/tx/0xf6dd9ff6c4f645b85c61693181f1713ad6a326c741754cbb31883843bc39f807) | PASS |
| 7 | B | `withdraw` | B paid 1 GEN, `ELIGIBLE_PAID`; `1 / 1 / 0 GEN` · native transfer [`0x1ddcfc03…cc3501`](https://explorer-studio.genlayer.com/tx/0x1ddcfc03cbf86b536de1c201893b014c268c1a8d4d4a8e6ee145e9eecfcc3501) · [screenshot](./docs/evidence/milestone-v3-paid.png) | [`0x78a07602…fde597`](https://explorer-studio.genlayer.com/tx/0x78a0760223e33def873d5b3b07c977248b9dae202b40f67a0f0c7195c6fde597) | PASS |

The contract still holds 1 GEN, reserved for applicant A until 2026-11-05. The 30-day release itself and the two by-design reverts (`claim window is still open`, `campaign pool still cannot cover the reward`) are not repeated on StudioNet; they are covered by the Direct Mode suite (`test_anyone_may_release_on_day_thirty_and_the_pool_is_untouched` and its mutants).

## v1.3 — local gates

| Gate | Observed result | Status |
|---|---|---|
| `python3 -m pytest tests/ -q` | 46 passed | PASS |
| `python3 tests/mutation_check.py` | 38/38 killed | PASS |
| `python3 -m genvm_linter.cli lint contracts/airjudge.py` | Lint passed (3 checks) | PASS |
| `npm ci && npm run build` | built; largest chunk 296 kB, no size warning | PASS |
| `sha256sum contracts/airjudge.py` | `1da8d4a99236446e586d74ef049a9e94d9c54e986ac5c5f46ccd267ceead42b0` | PASS |

---

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

