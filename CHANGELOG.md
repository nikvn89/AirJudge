# Changelog

## [1.2.0] — 2026-09-28

### Contract changed — fresh deployment required

- Added `reclaim_unused_pool(campaign_id)` for creators to recover `max(pool - reserved, 0)` after explicitly closing a campaign.
- The method updates state before transfer, sets `pool = reserved`, and never changes the reserved amount.
- Previous address: `0x29c49872d34361FdC72C0528f7fCeB97F1eeda95`.
- Fresh v2 address: `0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1`.
- Deployment transaction: `0x6205cf355d42efd66382f2979d4f583fe6d5c78671a34de47d8754f4eacf30cd`.
- Previous SHA-256: `5c7bb12a90f556209472390404e28331552237c793af31964fb4c5e9c5a814fe`.
- v2 SHA-256: `156ed2a5906649bc3ba620d7be87afb488fbe9ed80058c30bc3bc761fa5c362c`.
- Storage is not migrated. The previous deployment remains readable, and the frontend must be updated to the fresh address after deployment.

### User-visible changes

- Added a creator-only reclaim control with active/closed guidance and exact available amount.
- Added Pool / Reserved / Available treasury visibility.
- Re-reads accepted state after reclaim and warns against resubmission if monitoring is unavailable.

### Verification infrastructure

- Added 25 Direct Mode tests against the production contract, including a contract-driven Hypothesis accounting property.
- Added 22 one-change mutants; final mutation score is 100% killed.
- Added pinned Python test dependencies, `package-lock.json`, two-job GitHub Actions CI, `SECURITY.md`, and explicit test-boundary documentation.

Immutable comparison after the final commit is pushed:

`https://github.com/nikvn89/AirJudge/compare/0c71578b2b992eb44e4d7b6d0b102dda772c8e8f...<NEW_40_CHARACTER_HEAD_SHA>`

## [1.1.0] — Create & Fund

Added an optional Fund Now amount to the campaign creation flow while keeping `create_campaign` and `fund_campaign` as separate contract transactions.

## [1.0.0] — Published release

Initial contribution reward campaign, adjudication, reservation, and applicant withdrawal flow.
