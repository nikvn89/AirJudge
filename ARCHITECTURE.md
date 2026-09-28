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

Reclaim cannot touch reserved value. Thus the sequence “approve → close → reclaim unused → applicant withdraws” preserves the applicant promise.

## Deployment boundary

Contract storage is tied to its address. Milestone v2 changes contract bytes, so it requires a fresh StudioNet deployment and starts with empty campaign state. The frontend address comes from `VITE_CONTRACT_ADDRESS`; same-origin RPC proxying remains unchanged.
