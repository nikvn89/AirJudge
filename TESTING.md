# Verification — contract 1.3.1 / Milestone v3

## Executed locally on 2026-10-20

| Gate | Command | Actual result |
|---|---|---|
| Frozen accepted v2 baseline | `python3 -m pytest tests/ -q` in commit `9ae45a5bdbd79da53da334c1f178c1eebd1ec090` | 25 passed |
| Production contract behavior | `python3 -m pytest tests/ -q` | 70 passed |
| Receipt and settlement postconditions | `npm run test:frontend` | 38 passed |
| GenVM lint | `python3 -m genvm_linter.cli lint contracts/airjudge.py` | PASS, 3 checks |
| Dependency installation | `npm ci --no-audit --no-fund` | PASS |
| Production build | `npm run build` | PASS; 482 modules; largest chunk approximately 296 kB |
| Aggregate gate | `npm run verify` | PASS: lint, contract tests, frontend tests, production build |
| Mutation matrix | `python3 tests/mutation_check.py` | 40/40 killed; zero invalid test runs |

Environment: Node 24.19.0, Python 3.12.14; pinned genlayer-test 0.29.2, GenVM SDK v0.2.16, genvm-linter 0.11.0, Hypothesis 6.168.1 and pytest 9.1.1. CI targets Node 22 and Python 3.12. Node 22.18+ supports the frontend test runner's type stripping.

Normalized source SHA-256: `bf4db63a5836f00a030b513563657088caee9f643a1339ff6864bf1118a12a78`. `scripts/verify-source.mjs` checks it against `release.json` before every production build.

## What the local tests exercise

- Existing campaign authorization, funding, judging gates, withdrawal, reclaim and accounting property tests remain covered.
- Underfunded eligibility can reserve later, does not call a model again and cannot reserve twice.
- Reservation release changes reserved/pending, not pool; released value can support another applicant or a creator reclaim.
- Date clock and release boundary: one second before, exactly at and one second after UTC midnight on reservation date + 30 days. Withdrawal before release remains possible even after the date. Paid/released states reject repeat settlement.
- Canonical URL replay variants, fenced-input markers and exact decimal-string wei above 2^53.
- Eighteen invalid semantic outputs: invalid JSON, wrong schema/type/label/case, duplicate keys, unknown keys, wrapper text, trailing commas and invalid reason. Each must leave application, snapshot, pending, treasury and window unchanged.
- Proof-fetch, evidence-fetch and model-provider failures preserve the pending application.
- Frontend tests reject ACCEPTED-only, missing leader receipts, validator-only results, error returns and confirmation timeout. Success needs the authoritative finalized leader's normal return plus method-specific state deltas.
- Wrong deployment versions are locked; stale reads and unchanged balances are not sufficient proof of settlement.

A regression was reproduced on the uploaded 1.3.0 source: `not json` completed instead of reverting, permanently recording a negative verdict. The new schema tests reject this before writes. Mutation results count a mutant as killed only after behavioral test failures, not collection/import errors.

## Boundaries — do not equate these with live proof

The suite loads the production source through the actual SDK Direct Mode. It does not recreate a separate treasury implementation. Web responses and model verdicts are controlled; actual validator accuracy, consensus convergence, live web provenance and injection resistance are not established. Direct Mode cannot prove recipient delivery of emitted native transfers or asynchronous downstream failure recovery.

## Fresh deployment gates

| Gate | Current status |
|---|---|
| New 1.3.1 contract | Address `0x350A7F43117AE162976E441c8B23A5C2d4F98104` and profile verified; deployment transaction hash PENDING |
| Deployed-source parity for 1.3.1 | PASS — [source/profile check](docs/evidence/v3-deployment-check.json), CRLF-to-LF only |
| Actual validator eligibility/underfunding and later reservation | Finalized-state sequence observed; earlier transaction hashes still outstanding |
| Native withdrawal/reclaim recipients and amounts | Withdrawal PASS: finalized parent leader SUCCESS, linked credited transfer and exact applicant balance increase. Reclaim PASS: finalized parent leader SUCCESS, linked credited transfer and exact creator balance increase |
| Actual 30-calendar-day release transaction | PENDING — cannot accelerate the production clock |
| Signed early-release/duplicate-URL rollback and unchanged state | PENDING |
| Final Vercel URL and exact submitted commit | https://air-judge.vercel.app is live; exact submitted commit pending |
| Browser wallet switching, mobile layout, production smoke | Automated browser test NOT RUN — browser binary unavailable. User screenshots show the production flow; no automated wallet/mobile PASS claimed |

A headless browser smoke test was attempted, but the browser download was truncated; no visual/browser PASS is claimed. The production build and pure frontend tests did execute. [RUNTIME_TEST.md](RUNTIME_TEST.md) specifies the remaining evidence. Historical material is under `docs/history` and is not runtime proof for 1.3.1.

## Observed production settlement

On 2026-10-20 campaign `airjudge-v3-20261020-a` progressed through underfunded eligibility, late reservation, pause/reclaim and paid state. See [whitelisted chain evidence](docs/evidence/v3-settlement-runtime.json) for scope and timestamps. Claim parent `0x002928439b94640fc0c4ce088ea3b91774ba16a39ca9951781d8a2e77e66b695` finalized with authoritative leader SUCCESS and normal return. Its linked transfer `0xed62d13fcf5997336b2ba93670059816f3f7b7347e512fe0a4d43b6de0bfb162` finalized and credited exactly 0.001 GEN to the applicant. The independently observed applicant balance increased by that same amount; contract native balance and campaign treasury became zero. This does not establish the unexecuted expiry/replay/third-wallet paths.

Reclaim parent `0x92e25c55cf8f67acca92404114a9c9b618acf24085ff7d630f73177a6112e6f0` finalized with leader SUCCESS and normal return. Its linked transfer `0x8c5adb8eef58c32d3fcff0e1d82bc03a63cc964ddee4b6bfd0ec15d1d2e3b1e9` finalized and credited exactly 0.002 GEN to the creator. Creator balance increased by that amount while contract native balance fell from 0.003 to 0.001 GEN; the applicant reservation remained intact.
