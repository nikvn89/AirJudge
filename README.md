# AirJudge — Milestone v3

AirJudge is a GenLayer contribution-reward application: campaign creators fund native GEN pools, applicants publish wallet-bound evidence, and validators assess qualitative eligibility. Deterministic contract code reserves rewards, pays applicants and protects reservations when creators reclaim unused funds.

This release builds on the accepted **Milestone v2** commit [`9ae45a5bdbd79da53da334c1f178c1eebd1ec090`](https://github.com/nikvn89/AirJudge/tree/9ae45a5bdbd79da53da334c1f178c1eebd1ec090). Contract release **1.3.1** is prepared locally; its new deployment and production runtime are **PENDING**. Do not use the previous 1.3.0 address for this source.

## What changes from v2

| Situation | Accepted v2 / contract 1.2 | Milestone v3 / contract 1.3.1 |
|---|---|---|
| Approved reward never withdrawn | Reserved indefinitely | Anyone may release it from UTC calendar day `reservation_day + 30` |
| Eligible applicant judged while unfunded | No late reservation operation | Anyone can reserve the configured reward once the available pool covers it |
| Tracking-query / case / slash URL variants | Raw URL keys can count separately | Conservative canonical URL identity blocks those variants within the campaign |
| Malformed model output | Could become a recorded negative verdict | Exact two-key JSON or transaction rollback; no verdict or treasury writes |
| Browser transaction confirmation | Accepted-state polling | Finalized authoritative leader execution, normal-return tag, then action-specific finalized reads |

Release and late reservation do not call a model or move native value. Withdrawal and creator reclaim remain separate transfer operations. Release subtracts the pending reward from `reserved`, leaves `pool` unchanged and makes the value available again. Reclaim still transfers only `pool - reserved` after closing.

## Claim-window semantics

The clock is the transaction's committed UTC date, **not a 720-hour timer**. A reservation made at any time on 20 October becomes release-eligible at 00:00 UTC on 19 November. It does not release automatically. Until a successful release transaction executes, the applicant can still withdraw, including after that date. At or after the boundary, withdrawal and release compete in transaction order; the first successful terminal operation wins. Released applications cannot be reserved or withdrawn again.

## Roles and lifecycle

1. Creator creates a campaign, then funds it in a separate payable transaction.
2. A different wallet submits one application with a proof page and evidence URL.
3. Anyone may request judging while the campaign is active. The creator cannot apply.
4. A valid `ELIGIBLE` result reserves the fixed campaign reward, or records `ELIGIBLE_UNDERFUNDED` when available funds are insufficient.
5. Anyone can invoke `reserve_underfunded(campaign_id, applicant)` after more funds arrive; it starts that applicant's date-based claim window.
6. Applicant withdraws, or anyone invokes `release_expired_reservation` after the release date.
7. Creator can pause/close and reclaim only unreserved funds; protected applicant rewards remain withdrawable. Closing is reversible via the existing v2 active flag. Already-judged underfunded rewards can still be reserved while inactive if funds remain; closing blocks new applications and judging.

## Run and verify

Node.js 22.18+ and Python 3.12 are required.

```bash
npm ci
python3 -m pip install -r requirements-test.txt
npm run verify
python3 tests/mutation_check.py
npm run dev
```

`npm run verify` runs contract lint, actual-source Direct Mode behavior tests, frontend receipt/postcondition tests and the production build. Test boundaries and the latest executed results are in [TESTING.md](TESTING.md).

## Deployment configuration

The new address has not been supplied. The default address and `.env.example` are intentionally empty; writes remain locked until a deployment reports the required 1.3.1 profile.

After deploying the exact `contracts/airjudge.py` source on **StudioNet, chain 61999**, verify source parity:

```bash
npm run check:deployment -- --address YOUR_DEPLOYED_ADDRESS
```

The command is read-only and checks CRLF-to-LF normalized SHA-256; it does not ignore trailing newlines. Record the real address/deploy transaction in `release.json` and [RUNTIME_TEST.md](RUNTIME_TEST.md). Then set this public Vercel environment variable and redeploy:

```text
VITE_CONTRACT_ADDRESS=YOUR_VERIFIED_1_3_1_ADDRESS
```

Vercel: `npm run build`, output `dist`; the included `/genlayer-rpc` rewrite keeps browser reads same-origin. There are no backend secrets. Private keys and seed phrases must never be added to configuration. Existing campaigns are not migrated to the new address.

## Evidence and limitations

[SECURITY.md](SECURITY.md) describes the trust boundary and remaining risks. [RUNTIME_TEST.md](RUNTIME_TEST.md) separates pending fresh runtime checks from supplied historical evidence. [docs/history](docs/history) retains previous milestone records; `docs/evidence` retains their referenced screenshots and pages.

A wallet marker on a public page binds a claim to a wallet string and exact URL; it does not universally establish the author's identity or ownership of the underlying contribution. Model judgments can be wrong. Canonical URL matching is conservative, not universal plagiarism or redirect detection.
