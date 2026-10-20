# Security and evidence boundary

## Deterministic responsibilities

Creator-only creation controls, funding, active flag and reclaim; applicant-only withdrawal. Anyone can judge pending applications, reserve an already-eligible underfunded reward, or release an expired reservation. Amounts are integer wei. `pool >= reserved`; pending value is removed exactly once by withdrawal or release. A released or paid application is terminal. Reclaim after closing leaves protected reservations untouched.

Each campaign has one application per wallet. Canonical evidence identity is scoped to the campaign. Replay keys lowercase the entire host/path, strip a leading `www.`, ignore scheme/query/fragment and remove trailing slashes. This blocks the tested syntactic variants, but **can also reject distinct pages** on case-sensitive paths or query-driven sites. Redirects, short links, mirrors and different URLs for the same work are not universally detected. Admission latches a URL before adjudication; a malicious first submission may prevent another wallet from using it in that campaign.

## Semantic boundary

Validators assess only whether fetched evidence supports campaign eligibility criteria. Proof pages, applicant text and evidence can be misleading. A marker containing an address and URL is public and copyable; it is not a cryptographic signature by the external page owner or proof of independent authorship. Signed submission only authenticates the sending wallet.

Only raw JSON with exactly `verdict` and `reason`, a verdict of `ELIGIBLE` or `NOT_ELIGIBLE`, and a nonempty string reason of at most 240 characters is accepted. Invalid schema, duplicate keys and provider/model failures cannot be rewritten as a semantic verdict. Claim/evidence fence stripping reduces delimiter confusion; it does not prove prompt-injection resistance or model correctness.

A consensus-reviewed snapshot records what was read, not objective truth. Evidence may change/disappear before it is fetched. Web equality consensus and model agreement can fail. See tests and runtime gates for what was actually executed.

## Release clock and liveness

Date-based soft expiry opens release eligibility at 00:00 UTC on `reservation_day + 30`; a late-day reservation is therefore protected for less than 720 elapsed hours. Nothing happens automatically. Until release executes, even an overdue applicant can withdraw. At the boundary, transaction ordering resolves the withdrawal/release race. Expired rewards are released only by a transaction and never restored to that applicant.

Late reservation is first-come-first-served among underfunded applicants; no automatic queue or keeper is supplied. An inactive campaign blocks new submissions/judging but permits the existing settlement paths, and the creator can reopen it. External native-transfer delivery is a separate runtime boundary: Direct Mode ledger checks alone do not prove the recipient received funds or a later delivery failure was refunded.

## Browser and deployment

Writes require the exact supported deployment profile before wallet signing. After submission, the frontend checks FINALIZED, authoritative leader SUCCESS and normal-return tag, then method-specific finalized postconditions. Timeout or missing evidence never produces a success claim. Concurrent unrelated campaign writes can prevent an exact delta from being confirmed; the UI conservatively asks for inspection instead of declaring failure or resending.

Source parity, real native transfers, actual validator behavior, signed wallet switching and production hosting must be verified for the final new address. Historical screenshots/transactions and local mocked semantic labels cannot establish those gates.
