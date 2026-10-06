# Architecture

AirJudge separates qualitative consensus from deterministic treasury accounting.

## Consensus boundary

1. `strict_eq` agrees on proof binding and the exact fetched evidence snapshot.
2. `prompt_non_comparative` classifies that agreed snapshot as `ELIGIBLE` or `NOT_ELIGIBLE` against campaign criteria.
3. Deterministic code alone decides whether funds can be reserved and how state changes.

Applicant descriptions and external pages are untrusted. The reviewed evidence snapshot is stored onchain.

## Treasury states

```text
available = max(pool - reserved, 0)
```

- Funding increases `pool`.
- An eligible, funded verdict increases `reserved` and the applicant's pending payout.
- Applicant withdrawal reduces pending, `reserved`, and `pool` by the same reward.
- Creator reclaim is allowed only while inactive and sets `pool = reserved` before transferring the prior available amount.

- v1.3: `release_expired_reservation` (anyone, from day 30 after reservation) reduces `reserved` and the applicant's pending payout by the reward; `pool` is unchanged, so the value becomes *available* again.
- v1.3: `reserve_underfunded` (anyone) moves an `ELIGIBLE_UNDERFUNDED` application to `ELIGIBLE_RESERVED` when `available >= reward`, exactly as a funded verdict would have.

Reclaim cannot touch reserved value. Thus the sequence “approve → close → reclaim unused → applicant withdraws” preserves the applicant promise.

## Deployment boundary

Contract storage is tied to its address. Milestones v2 and v3 change contract bytes, so each requires a fresh StudioNet deployment and starts with empty campaign state. The frontend address comes from `VITE_CONTRACT_ADDRESS`; same-origin RPC proxying remains unchanged.
