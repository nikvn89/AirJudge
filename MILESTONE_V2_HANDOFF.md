# Milestone v2 handoff

## Portal title

AirJudge — Campaign Creators Can Reclaim Unused Pool, Backed by a GenVM Test Suite

## Changes & Improvements

Previously, GEN deposited into a campaign could leave only through an approved applicant, so every unused amount stayed locked even after the campaign closed. AirJudge v1.2 adds `reclaim_unused_pool`: only the creator may call it, only after closing the campaign, and it returns exactly `pool - reserved`. Reserved applicant rewards are never modified and remain withdrawable after reclaim. The dApp now shows Pool, Reserved, and Available, displays the reclaimable amount, and refreshes accepted onchain state before reporting success. This contract change requires a fresh StudioNet deployment with empty state. The production contract is backed by 25 pinned GenVM Direct Mode tests, a 22-mutant matrix with 100% killed, linting, and two-job CI.

Character count (paragraph only): 747

## Evidence links to finalize after the final push

1. `https://github.com/nikvn89/AirJudge/compare/0c71578b2b992eb44e4d7b6d0b102dda772c8e8f...<NEW_40_CHARACTER_HEAD_SHA>`
2. `https://explorer-studio.genlayer.com/address/0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1`
3. `https://github.com/nikvn89/AirJudge/blob/<NEW_40_CHARACTER_HEAD_SHA>/TESTING.md`
4. `https://github.com/nikvn89/AirJudge/actions/runs/<GREEN_RUN_ID>`

## Completion status and final GitHub step

1. ~~Deploy the exact `contracts/airjudge.py` bytes on StudioNet 61999.~~ Completed.
2. ~~Record the fresh contract address and deployment hash.~~ Completed.
3. ~~Point the production frontend to the fresh deployment.~~ Completed.
4. ~~Execute the eight-case runtime matrix.~~ Completed; see `TESTING.md`.
5. ~~Add the selected runtime screenshots.~~ Completed under `docs/evidence/`.
6. Upload this package to the root of `nikvn89/AirJudge` with commit title `Add AirJudge v1.2 runtime evidence`.
7. Open the new commit, copy its full 40-character SHA, replace `<NEW_40_CHARACTER_HEAD_SHA>` in the compare and deep-file links, and record the green two-job Actions run URL.

No contract redeploy and no additional runtime transaction are required before that upload.

## GitHub web upload layout

Upload the repository contents preserving these exact paths:

- `contracts/airjudge.py`
- `src/App.tsx`, `src/styles.css`, `src/lib/config.ts`, `src/lib/genlayer.ts`
- `tests/` including `README.md` and `mutation_check.py`
- `.github/workflows/ci.yml`
- `docs/evidence/` (v1 baseline plus selected v2 runtime proof)
- root documentation, `package.json`, `package-lock.json`, and `requirements-test.txt`

Files to delete from the existing repository: none. Do not upload `.git`, `node_modules`, `dist`, `.pytest_cache`, `__pycache__`, or local environment files.
