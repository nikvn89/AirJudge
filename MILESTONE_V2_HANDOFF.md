# Milestone v2 handoff

## Portal title

AirJudge — Campaign Creators Can Reclaim Unused Pool, Backed by a GenVM Test Suite

## Changes & Improvements

Previously, GEN deposited into a campaign could leave only through an approved applicant, so every unused amount stayed locked even after the campaign closed. AirJudge v1.2 adds `reclaim_unused_pool`: only the creator may call it, only after closing the campaign, and it returns exactly `pool - reserved`. Reserved applicant rewards are never modified and remain withdrawable after reclaim. The dApp now shows Pool, Reserved, and Available, displays the reclaimable amount, and refreshes accepted onchain state before reporting success. This contract change requires a fresh StudioNet deployment with empty state. The production contract is backed by 25 pinned GenVM Direct Mode tests, a 22-mutant matrix with 100% killed, linting, and two-job CI.

Character count (paragraph only): 747

## Evidence links to finalize after push and runtime proof

1. `https://github.com/nikvn89/AirJudge/compare/0c71578b2b992eb44e4d7b6d0b102dda772c8e8f...<NEW_40_CHARACTER_HEAD_SHA>`
2. `https://explorer-studio.genlayer.com/address/0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1`
3. `https://github.com/nikvn89/AirJudge/blob/<NEW_40_CHARACTER_HEAD_SHA>/TESTING.md`
4. `https://github.com/nikvn89/AirJudge/actions/runs/<GREEN_RUN_ID>`

## Required deployment sequence

1. Upload the pre-deploy package to the repository.
2. ~~Deploy the exact `contracts/airjudge.py` bytes on StudioNet 61999.~~ Completed.
3. ~~Record the fresh contract address and deploy transaction hash.~~ Address `0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1`; transaction `0x6205cf355d42efd66382f2979d4f583fe6d5c78671a34de47d8754f4eacf30cd`.
4. Set Vercel `VITE_CONTRACT_ADDRESS` to `0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1` and redeploy.
5. Execute the eight-case transaction matrix in `TESTING.md` using creator and applicant wallets.
6. Add the three required UI screenshots under `docs/evidence/`.
7. Replace all `PENDING` placeholders, push the final commit, then add the immutable compare SHA and concrete green CI run URL.

## GitHub web upload layout

Upload the repository contents preserving these exact paths:

- `contracts/airjudge.py`
- `src/App.tsx`, `src/styles.css`, `src/lib/config.ts`, `src/lib/genlayer.ts`
- `tests/` including `README.md` and `mutation_check.py`
- `.github/workflows/ci.yml`
- `docs/evidence/` (existing v1 evidence now; add v2 screenshots after runtime exercise)
- root documentation, `package.json`, `package-lock.json`, and `requirements-test.txt`

Files to delete from the existing repository: none. Do not upload `.git`, `node_modules`, `dist`, `.pytest_cache`, `__pycache__`, or local environment files.
