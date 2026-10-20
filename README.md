# AirJudge — Milestone v4 draft

AirJudge is a GenLayer contribution-reward application: campaign creators fund native GEN pools, applicants publish wallet-bound evidence, and validators assess qualitative eligibility. Deterministic contract code reserves rewards, pays applicants and protects reservations when creators reclaim unused funds.

This **Milestone v4 draft** builds on the **submitted, not yet reviewed Milestone v3** commit [`eb18500e29a65311be8a011194e45f19de55e82b`](https://github.com/nikvn89/AirJudge/tree/eb18500e29a65311be8a011194e45f19de55e82b). V3 was submitted on 2026-10-19 and remains pending review. Accepted Milestone v2 is `9ae45a5bdbd79da53da334c1f178c1eebd1ec090`; it is not substituted for the submitted-v3 baseline when describing the v4 increment.

Contract **1.3.1** remains deployed at [`0x350A7F43117AE162976E441c8B23A5C2d4F98104`](https://explorer-studio.genlayer.com/address/0x350A7F43117AE162976E441c8B23A5C2d4F98104). Milestone numbering is separate from contract versioning. Reclassifying this package does not change the deployed source, storage, campaign identifiers, or transaction evidence. Source/profile parity, native applicant withdrawal and native creator reclaim were independently verified. Earlier transaction receipts and timed-release coverage remain incomplete; see [TESTING.md](TESTING.md).

## What changes from submitted v3

| Boundary | Submitted v3 / contract 1.3.0 | V4 draft / contract 1.3.1 |
|---|---|---|
| Invalid semantic result | A malformed response could become a permanent negative verdict | Exactly two JSON keys, typed nonempty reason and valid label; malformed/duplicate/wrapped output reverts before writes |
| Unavailable proof or evidence | Fetch failure could be treated as rejected evidence | Distinguishes unavailable fetch from genuinely unbound proof; provider/fetch errors preserve the pending application |
| Browser confirmation | No authoritative leader execution and action-delta gate | Requires finalized authoritative leader SUCCESS and normal return, then method-specific finalized-state postconditions |
| Deployment identity | No exact 1.3.1 profile gate | Locks writes when the deployed profile is incompatible |
| Settlement audit | Historical supplied test/evidence record | Production parent execution, linked credited native transfer and independent balance reconciliation for both withdrawal and reclaim |

The 30-day soft claim window, late reservation and canonical evidence identity **belong to v3**. V4 retains them as regression coverage and does not claim them again as new features. Public proof markers remain copyable and are not cryptographic authorship verification. [MILESTONE_V4.md](MILESTONE_V4.md) freezes the incremental scope and comparison policy.

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

The default address and `.env.example` point to `0x350A7F43117AE162976E441c8B23A5C2d4F98104`. Writes require the 1.3.1 profile. If a legacy `VITE_CONTRACT_ADDRESS` is set in Vercel, update it: an environment override takes precedence over the default.

On **StudioNet, chain 61999**, recheck the deployed source with:

```bash
npm run check:deployment -- --address 0x350A7F43117AE162976E441c8B23A5C2d4F98104
```

The command is read-only and checks CRLF-to-LF normalized SHA-256; it does not ignore trailing newlines. The address is recorded in `release.json`; add the deployment transaction hash once known. Use this public Vercel environment variable and redeploy:

```text
VITE_CONTRACT_ADDRESS=0x350A7F43117AE162976E441c8B23A5C2d4F98104
```

Vercel: `npm run build`, output `dist`; the included `/genlayer-rpc` rewrite keeps browser reads same-origin. There are no backend secrets. Private keys and seed phrases must never be added to configuration. Existing campaigns are not migrated to the new address.

## Evidence and limitations

[SECURITY.md](SECURITY.md) describes the trust boundary and remaining risks. [RUNTIME_TEST.md](RUNTIME_TEST.md) separates pending fresh runtime checks from supplied historical evidence. [docs/history](docs/history) retains previous milestone records; `docs/evidence` retains their referenced screenshots and pages.

A wallet marker on a public page binds a claim to a wallet string and exact URL; it does not universally establish the author's identity or ownership of the underlying contribution. Model judgments can be wrong. Canonical URL matching is conservative, not universal plagiarism or redirect detection.
