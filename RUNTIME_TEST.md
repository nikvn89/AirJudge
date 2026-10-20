# Fresh runtime — contract 1.3.1

**Settlement runtime status: PARTIALLY VERIFIED (2026-10-20).** Source/profile parity is verified. The actual production campaign reached underfunded eligibility, late reservation, pause/reclaim and paid state. Native withdrawal is fully checked through finalized parent execution, linked credited transfer, recipient/value, independent balance increase and zero final treasury. Native creator reclaim is also verified through finalized parent execution, linked credited transfer and matching balance changes. Earlier campaign/application transaction hashes, signed negative cases and the real timed expiry path remain outstanding. See [runtime evidence](docs/evidence/v3-settlement-runtime.json) and [deployment evidence](docs/evidence/v3-deployment-check.json). Historical transactions are not reused as new runtime proof.

Claim parent: [0x002928439b94640fc0c4ce088ea3b91774ba16a39ca9951781d8a2e77e66b695](https://explorer-studio.genlayer.com/tx/0x002928439b94640fc0c4ce088ea3b91774ba16a39ca9951781d8a2e77e66b695).
Native transfer: [0xed62d13fcf5997336b2ba93670059816f3f7b7347e512fe0a4d43b6de0bfb162](https://explorer-studio.genlayer.com/tx/0xed62d13fcf5997336b2ba93670059816f3f7b7347e512fe0a4d43b6de0bfb162).

Production dApp: https://air-judge.vercel.app. Campaign: `airjudge-v3-20261020-a`; creator `0x6276095FAEA15108740445ff277fdA8c304657F4`; applicant `0x037f58E33c1Ec8fdA272361E0aAC1e31054a1CDE`.


## Baselines and immutable comparison

- Reviewed Project: `0c71578b2b992eb44e4d7b6d0b102dda772c8e8f`.
- Accepted Milestone v2: `9ae45a5bdbd79da53da334c1f178c1eebd1ec090` (contract 1.2 source SHA `156ed2a5906649bc3ba620d7be87afb488fbe9ed80058c30bc3bc761fa5c362c`).
- Uploaded archive head `eb18500e29a65311be8a011194e45f19de55e82b` already included an unverified 1.3.0 revision. It is not the accepted v2 baseline and is not the final submitted head for this release.
- After the final upload, use the actual full 40-character Milestone v3 commit SHA as HEAD. Include immutable comparisons from the reviewed Project and, additionally, accepted v2 to that exact HEAD. Never use `main` or guess a commit.

## Deployment and source

The exact `contracts/airjudge.py` source is now deployed. Add the deployment transaction hash to `release.json` when known. Recheck it with:

```bash
npm run check:deployment -- --address 0x350A7F43117AE162976E441c8B23A5C2d4F98104
```

Require `profile.version = 1.3.1` and `source_parity.pass = true`. CRLF-to-LF is the only normalization; a missing final newline fails. Each deploy starts with empty storage; there is no migration. Before writing through the dApp, configure the new address in Vercel and redeploy the verified build.

## Minimal critical sequence

Use three separate wallets: C = creator, A = applicant, O = outsider. Use a fresh campaign ID, immutable clear criteria and reward **0.001 GEN**. The evidence/proof pages must actually be published and accessible before judging. No particular semantic outcome is guaranteed: inspect the recorded reason when an expected ELIGIBLE result is not obtained.

| # | Wallet → method | Exact state/value expectation | Evidence required | Status |
|---|---|---|---|---|
| 1 | C → `create_campaign` | Reward `1000000000000000` wei; zero initial pool | Finalized leader SUCCESS; campaign/creator/reward reads | State observed; receipt hash pending |
| 2 | A → `submit_application` | Actual proof URL with required marker and exact evidence URL; useful contribution text | PENDING application and stored URL reads | Pending state observed before judging; receipt/stored-field verification pending |
| 3 | Any wallet → `judge_application` for A | If ELIGIBLE, `ELIGIBLE_UNDERFUNDED`; pool/reserved/pending all zero | Leader result, exact reviewed snapshot, verdict and treasury | Underfunded verdict/reason and zero treasury observed; receipt hash pending |
| 4 | C → `fund_campaign`, value `3000000000000000` wei | Pool/reserved/available = `0.003 / 0 / 0.003 GEN` | Native value, successful receipt, treasury | Treasury observed; receipt hash pending |
| 5 | O → `reserve_underfunded` for A | A RESERVED; `0.003 / 0.001 / 0.002`; reservation/release dates set | Before/after window and treasury; no second judging | Reserved state/date observed; creator used in user-guided run, not outsider; receipt hash pending |
| 6 | O → `release_expired_reservation` for A before date | Execution ERROR `claim window is still open`; all state/balances unchanged | Actual signed rollback receipt plus before/after reads | NOT RUN on chain; local boundary tests passed |
| 7 | O → `submit_application` using A's evidence URL plus `?utm_source=runtime` | ERROR duplicate evidence; O still has no application | Signed rollback if Studio is used; if the UI precheck blocks signing, label it read-only and retain the local contract test separately | NOT RUN on chain; local replay tests passed |
| 8 | C → `set_campaign_active(id, false)` | Campaign inactive, treasury unchanged | Finalized receipt and active/treasury reads | Inactive state observed; receipt hash pending |
| 9 | C → `reclaim_unused_pool` | Exactly 0.002 GEN to creator; treasury `0.001 / 0.001 / 0` | Parent leader SUCCESS, actual native-transfer child, destination/value, balance evidence | PASS — parent execution, credited child, creator/value, balance increase and protected reservation verified |
| 10 | A → `withdraw` | Exactly 0.001 GEN to A; PAID; treasury and pending zero | Parent receipt, actual native-transfer child, destination/value, balance evidence | PASS — parent execution, credited child, recipient/value, balance increase and final ledger verified |

A read-only capture after any step:

```bash
npm run check:deployment -- --address 0x350A7F43117AE162976E441c8B23A5C2d4F98104 --campaign CAMPAIGN_ID --applicant APPLICANT_ADDRESS --tx ACTUAL_HASH
```

The command captures whitelisted chain data, not a full RPC response. Never upload raw Studio node/provider configuration or credentials. A hash, accepted consensus, finalized status or toast alone is not economic proof.

## Full expiry path (separate pending reservation)

Keep a second funded eligible application RESERVED on the same deployment or a separate clean campaign. Record its `expires_day` and verify release at/after its UTC date. Anyone may release; require EXPIRED, pending zero, reserved reduced by exactly the old pending amount and pool unchanged. Repeated release, withdrawal after release and re-reservation must fail without writes. A creator may reclaim the released available value only after closing.

Do not shorten the constant, warp a production transaction, change the production source for a quick demonstration, or substitute another deployment's expiry. Deadline boundary tests already run locally, but actual timed release remains PENDING until the real chain date arrives.

## Historical source check

The supplied 1.3.0 address `0x8DFc1aFE0542bb399756fa9E5BA89992E7B53a85` reports version 1.3.0. Its deployed normalized SHA is `37bdda3c1a5693aad59f0dbf0711c53d36de4f5bb0327245b8e23c7b787c2bf1`; uploaded 1.3.0 source SHA is `1da8d4a99236446e586d74ef049a9e94d9c54e986ac5c5f46ccd267ceead42b0`. The two differ by the final newline after line-ending normalization. This record is historical and not a parity PASS for the new release.

Reclaim parent: [0x92e25c55cf8f67acca92404114a9c9b618acf24085ff7d630f73177a6112e6f0](https://explorer-studio.genlayer.com/tx/0x92e25c55cf8f67acca92404114a9c9b618acf24085ff7d630f73177a6112e6f0).
Native transfer: [0x8c5adb8eef58c32d3fcff0e1d82bc03a63cc964ddee4b6bfd0ec15d1d2e3b1e9](https://explorer-studio.genlayer.com/tx/0x8c5adb8eef58c32d3fcff0e1d82bc03a63cc964ddee4b6bfd0ec15d1d2e3b1e9).
