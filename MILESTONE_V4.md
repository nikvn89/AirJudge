# AirJudge — Safe Verdict Handling and Verified Payouts

**Milestone v4 draft · contract 1.3.1 · prepared 2026-10-20.**

## Submitted-v3 baseline

Milestone v3 was submitted on 2026-10-19 and is pending review. Its pinned evidence identifies commit [`eb18500e29a65311be8a011194e45f19de55e82b`](https://github.com/nikvn89/AirJudge/tree/eb18500e29a65311be8a011194e45f19de55e82b), contract 1.3.0. Accepted v2 remains a historical reference, not the incremental v4 baseline. The pending v3 submission has not been edited by this package.

## New behavior only

1. An invalid or uncertain semantic result cannot silently become a permanent NOT_ELIGIBLE verdict. Strict full-string two-key JSON validation rejects malformed JSON, duplicate/unknown keys, wrong types, invalid labels, empty/oversized reasons and wrappers before writes.
2. Unavailable proof/evidence fetches and model-provider failures preserve PENDING. A genuinely unbound proof remains a distinct negative result.
3. The frontend verifies finalized authoritative leader SUCCESS and normal return, then the action's exact state delta. Accepted-only, validator-only, error, unknown/missing-result and unchanged-state responses cannot produce success. Incompatible deployment profiles lock writes.
4. Production payout verification reconciles parent execution, linked credited native-transfer child, correct destination/value and independent before/after balances. Both 0.001 GEN applicant withdrawal and 0.002 GEN creator reclaim were checked on the new address.

## Inherited behavior, not claimed again

The 30-UTC-calendar-day soft expiry, permissionless late reservation, canonical URL identity, exact wei views, original campaign lifecycle and creator reservation protection belong to v3 or earlier releases. They remain regression/integration tests in this package. A new address, additional screenshots, documentation or a new milestone label alone is not the claimed increment.

## Verification

The exact submitted-v3 archive was re-executed on 2026-10-20: 46 Direct Mode tests passed in 87.12 seconds. The unchanged 1.3.1 production source has the previously executed 70-test contract suite, 38 frontend verification tests and 40/40 mutation result. Source bytes were rechecked after this documentation-only reclassification; no test result was invented by changing milestone labels.

## Source and runtime boundaries

Source SHA-256 after CRLF-to-LF only: `bf4db63a5836f00a030b513563657088caee9f643a1339ff6864bf1118a12a78`. Address: `0x350A7F43117AE162976E441c8B23A5C2d4F98104`.

Contract version stays 1.3.1. No re-deployment or source change is needed for this documentation reclassification. Actual campaign IDs, dates, URLs and transaction hashes are preserved verbatim even where their original labels contain v3.

The local suite does not establish model accuracy or adversarial robustness. Production early-release/URL-replay negative transactions, third-wallet reservation and real 30-day expiry were not run. Earlier deploy/create/submit/judge/fund/reserve/pause receipt hashes remain outstanding. [TESTING.md](TESTING.md) distinguishes those gaps from the verified native payouts.

## Immutable comparison

After uploading the v4 documentation, resolve that commit's full SHA externally. Provide reviewed-Project → v4 and submitted-v3 → v4 comparisons. Do not reuse the old v2 → current comparison as the only proof of v4 progress, and do not change the pinned evidence of the existing pending v3 submission. Do not embed a self-referential submitted HEAD in release.json.

This is a prepared v4 draft, not evidence that Portal permits submission before v3 has completed review or that a steward will accept the scope.
