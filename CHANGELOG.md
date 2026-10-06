# Changelog

## [1.3.0] — 2026-10-06 — Fair settlement: claim window, late reservation, one reward per contribution

### Contract changed — fresh deployment required

- **Claim window.** A reserved reward is held for its applicant for 30 days from the
  transaction date that reserved it. After that, `release_expired_reservation(campaign_id,
  applicant)` — callable by anyone — returns it to the campaign's available pool (status
  `ELIGIBLE_EXPIRED`). The pool does not change; only the reservation is released. This
  closes the limitation v1.2 left open in `SECURITY.md`: a reward approved for an
  applicant who never withdraws was locked forever.
- **Late reservation.** An application judged `ELIGIBLE_UNDERFUNDED` used to be a dead
  end even after the creator added funds. `reserve_underfunded(campaign_id, applicant)` —
  callable by anyone, no model call — reserves the reward as soon as the available pool
  covers it, and starts the claim window.
- **One reward per contribution.** The evidence replay key now uses a canonical identity
  (host without `www.`, path without trailing slashes, lower case; scheme, query and
  fragment ignored). In v1.2 `…/pull/12?x=1`, the `www.` form, an upper-case host, a
  trailing slash or a `#fragment` each counted as unused evidence, so a second wallet could
  bind its own proof page to a variant and be judged — and paid — for the same
  contribution. The five variants are regression tests that fail on v1.2.
- **Prompt fence.** The claim and the reviewed snapshot are stripped of `<CLAIM>`,
  `</CLAIM>`, `<EVIDENCE>`, `</EVIDENCE>` in any letter case, to a fixed point. v1.2 used a
  single case-sensitive `.replace()`, so `</claim>` or `<CL<CLAIM>AIM>` reached the
  adjudication input intact.
- **Exact wei in views.** `get_campaign_pool_status` returns decimal strings. JSON numbers
  above 2^53 lose precision in a browser, and from 1000 GEN up they print as `1e+21`, which
  the frontend's `BigInt()` cannot parse.
- **Transaction clock.** Reservation days come from `gl.message_raw["datetime"]`, converted
  by integer calendar arithmetic.
- New views: `get_payout_window(campaign_id, applicant)` (status, pending wei, reserved
  and expiry day, today, `expired`, `reservable_now`), `get_contract_info()`,
  `normalize_evidence_url(url)`.
- Contract SHA-256: `1da8d4a99236446e586d74ef049a9e94d9c54e986ac5c5f46ccd267ceead42b0`. Fresh address: `0x8DFc1aFE0542bb399756fa9E5BA89992E7B53a85`. Storage is not migrated; v1.2
  stays readable at `0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1`.

### User-visible changes

- Reserved rewards show their claim deadline and days left; an expired reservation shows a
  **Release expired reservation** button to any connected wallet.
- An eligible-but-underfunded application explains that it is waiting for funds and shows
  **Reserve reward now** as soon as the pool can cover it.
- New `ELIGIBLE_EXPIRED` state.
- The production bundle is split into `react`, `genlayer` and `vendor` chunks (largest file
  296 kB; the 500 kB warning is gone).

### Verification

- Direct Mode suite 25 → 46 tests (21 new in `tests/test_v13_settlement.py`), all on the
  production contract with GenVM SDK v0.2.16.
- Mutation matrix 22 → 38 one-change mutants, 38/38 killed. The first run left one
  survivor (a fence mutant: no gap and a single pass); a cross-token rebuild case was added
  and it is killed.
- `genvm-linter lint` passes; `npm ci && npm run build` pass.

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
- Completed a fresh StudioNet lifecycle: funded `3 GEN`, reserved `1 GEN`, reclaimed `2 GEN`, then paid the protected `1 GEN` reward. Both active-campaign reclaim and double reclaim reverted as designed. Full hashes and screenshots are recorded in `TESTING.md`.

## [1.1.0] — Create & Fund

Added an optional Fund Now amount to the campaign creation flow while keeping `create_campaign` and `fund_campaign` as separate contract transactions.

## [1.0.0] — Published release

Initial contribution reward campaign, adjudication, reservation, and applicant withdrawal flow.
