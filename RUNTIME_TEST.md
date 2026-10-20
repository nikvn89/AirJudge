# Fresh runtime — contract 1.3.1

**Status: PENDING.** No new 1.3.1 deployment or signed transaction has been supplied. Do not attach previous contract transactions as new runtime proof.

## Baselines and immutable comparison

- Reviewed Project: `0c71578b2b992eb44e4d7b6d0b102dda772c8e8f`.
- Accepted Milestone v2: `9ae45a5bdbd79da53da334c1f178c1eebd1ec090` (contract 1.2 source SHA `156ed2a5906649bc3ba620d7be87afb488fbe9ed80058c30bc3bc761fa5c362c`).
- Uploaded archive head `eb18500e29a65311be8a011194e45f19de55e82b` already included an unverified 1.3.0 revision. It is not the accepted v2 baseline and is not the final submitted head for this release.
- After the final upload, use the actual full 40-character Milestone v3 commit SHA as HEAD. Include immutable comparisons from the reviewed Project and, additionally, accepted v2 to that exact HEAD. Never use `main` or guess a commit.

## Deployment and source

Deploy the exact `contracts/airjudge.py`. Add the real address/deploy hash to `release.json`, then execute:

```bash
npm run check:deployment -- --address NEW_ADDRESS
```

Require `profile.version = 1.3.1` and `source_parity.pass = true`. CRLF-to-LF is the only normalization; a missing final newline fails. Each deploy starts with empty storage; there is no migration. Before writing through the dApp, configure the new address in Vercel and redeploy the verified build.

## Minimal critical sequence

Use three separate wallets: C = creator, A = applicant, O = outsider. Use a fresh campaign ID, immutable clear criteria and reward **0.001 GEN**. The evidence/proof pages must actually be published and accessible before judging. No particular semantic outcome is guaranteed: inspect the recorded reason when an expected ELIGIBLE result is not obtained.

| # | Wallet → method | Exact state/value expectation | Evidence required | Status |
|---|---|---|---|---|
| 1 | C → `create_campaign` | Reward `1000000000000000` wei; zero initial pool | Finalized leader SUCCESS; campaign/creator/reward reads | PENDING |
| 2 | A → `submit_application` | Actual proof URL with required marker and exact evidence URL; useful contribution text | PENDING application and stored URL reads | PENDING |
| 3 | Any wallet → `judge_application` for A | If ELIGIBLE, `ELIGIBLE_UNDERFUNDED`; pool/reserved/pending all zero | Leader result, exact reviewed snapshot, verdict and treasury | PENDING |
| 4 | C → `fund_campaign`, value `3000000000000000` wei | Pool/reserved/available = `0.003 / 0 / 0.003 GEN` | Native value, successful receipt, treasury | PENDING |
| 5 | O → `reserve_underfunded` for A | A RESERVED; `0.003 / 0.001 / 0.002`; reservation/release dates set | Before/after window and treasury; no second judging | PENDING |
| 6 | O → `release_expired_reservation` for A before date | Execution ERROR `claim window is still open`; all state/balances unchanged | Actual signed rollback receipt plus before/after reads | PENDING |
| 7 | O → `submit_application` using A's evidence URL plus `?utm_source=runtime` | ERROR duplicate evidence; O still has no application | Signed rollback if Studio is used; if the UI precheck blocks signing, label it read-only and retain the local contract test separately | PENDING |
| 8 | C → `set_campaign_active(id, false)` | Campaign inactive, treasury unchanged | Finalized receipt and active/treasury reads | PENDING |
| 9 | C → `reclaim_unused_pool` | Exactly 0.002 GEN to creator; treasury `0.001 / 0.001 / 0` | Parent leader SUCCESS, actual native-transfer child, destination/value, balance evidence | PENDING |
| 10 | A → `withdraw` | Exactly 0.001 GEN to A; PAID; treasury and pending zero | Parent receipt, actual native-transfer child, destination/value, balance evidence | PENDING |

A read-only capture after any step:

```bash
npm run check:deployment -- --address NEW_ADDRESS --campaign CAMPAIGN_ID --applicant APPLICANT_ADDRESS --tx ACTUAL_HASH
```

The command captures whitelisted chain data, not a full RPC response. Never upload raw Studio node/provider configuration or credentials. A hash, accepted consensus, finalized status or toast alone is not economic proof.

## Full expiry path (separate pending reservation)

Keep a second funded eligible application RESERVED on the same deployment or a separate clean campaign. Record its `expires_day` and verify release at/after its UTC date. Anyone may release; require EXPIRED, pending zero, reserved reduced by exactly the old pending amount and pool unchanged. Repeated release, withdrawal after release and re-reservation must fail without writes. A creator may reclaim the released available value only after closing.

Do not shorten the constant, warp a production transaction, change the production source for a quick demonstration, or substitute another deployment's expiry. Deadline boundary tests already run locally, but actual timed release remains PENDING until the real chain date arrives.

## Historical source check

The supplied 1.3.0 address `0x8DFc1aFE0542bb399756fa9E5BA89992E7B53a85` reports version 1.3.0. Its deployed normalized SHA is `37bdda3c1a5693aad59f0dbf0711c53d36de4f5bb0327245b8e23c7b787c2bf1`; uploaded 1.3.0 source SHA is `1da8d4a99236446e586d74ef049a9e94d9c54e986ac5c5f46ccd267ceead42b0`. The two differ by the final newline after line-ending normalization. This record is historical and not a parity PASS for the new release.
