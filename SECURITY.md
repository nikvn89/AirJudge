# Security model

## Trust boundary

AirJudge keeps authorization, campaign lifecycle, reward capacity, reservation, and payout accounting deterministic. Validators only resolve external proof/evidence content and the qualitative eligibility verdict. Applicant claims and rendered evidence are untrusted prompt inputs.

## Tested invariants

- Only the campaign creator can fund, pause, reopen, or reclaim its pool.
- Reclaim is impossible while a campaign is active.
- Reclaimable value is `max(pool - reserved, 0)`.
- Reclaim sets `pool = reserved` and never writes `campaign_reserved_wei`.
- A reserved applicant can still withdraw after creator reclaim.
- A payout is reserved only when the available pool covers the configured reward.
- Withdrawal clears pending value and reduces both pool and reserved exactly once.
- Across the tested lifecycle, funded value equals reclaimed value plus withdrawn value plus the remaining pool.

The Direct Mode suite exercises these properties against the production contract and kills all 22 defined mutants. The boundary of that evidence is documented in `tests/README.md`.

## Known limitations — open

Reserved rewards belonging to approved applicants have no expiry. If an approved applicant never withdraws, that promised value remains locked. Milestone v2 intentionally does not let the creator seize it; adding expiry or forfeiture requires a separate policy design, new tests, and another contract deployment.

External evidence can change or disappear before validators fetch it. AirJudge commits the exact consensus-reviewed snapshot after retrieval, but does not establish universal authorship or detect plagiarism across the web.

## Accepted by design

- One application is allowed per `(campaign, applicant)`.
- One evidence URL is allowed per campaign.
- Closing a campaign stops submission and judging, and is the explicit prerequisite for reclaiming unused pool value.
- Direct Mode cannot observe the native outbound transfer; StudioNet transaction evidence is required for that boundary.
