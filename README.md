# AirJudge

AirJudge is a GenLayer reward-campaign dApp. Creators fund native GEN pools, applicants bind public evidence to their wallet, validators adjudicate qualitative eligibility, and the contract reserves and settles approved rewards.

Milestone v3 (contract v1.3) makes settlement fair at both ends: a reserved reward has a 30-day claim window after which anyone can return it to the pool, an applicant judged eligible while the pool was short is reserved as soon as funds arrive, and one public contribution can no longer be paid twice through URL variants. Milestone v2 let a creator reclaim only the unused portion of a closed campaign's pool.

## Deployment

- Network: GenLayer StudioNet, chain `61999`
- GenVM SDK: `v0.2.16` (`py-genlayer` v0.2)
- v1.3 address: ⟨v1.3 address⟩ — deployment transaction ⟨hash⟩
- v1.3 contract SHA-256: `1da8d4a99236446e586d74ef049a9e94d9c54e986ac5c5f46ccd267ceead42b0`
- v1.2 address (previous, readable): `0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1`
- v2 Explorer: [`0x3d5f...cc2B1`](https://explorer-studio.genlayer.com/address/0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1)
- deployment transaction: [`0x6205...f30cd`](https://explorer-studio.genlayer.com/tx/0x6205cf355d42efd66382f2979d4f583fe6d5c78671a34de47d8754f4eacf30cd)
- v1.2 contract SHA-256: `156ed2a5906649bc3ba620d7be87afb488fbe9ed80058c30bc3bc761fa5c362c`
- previous address: [`0x29c49872d34361FdC72C0528f7fCeB97F1eeda95`](https://explorer-studio.genlayer.com/address/0x29c49872d34361FdC72C0528f7fCeB97F1eeda95)
- previous contract SHA-256: `5c7bb12a90f556209472390404e28331552237c793af31964fb4c5e9c5a814fe`

Each deployment starts with empty storage. Campaigns at earlier addresses are not migrated; those addresses remain readable in Explorer, and the app points to the current one through `VITE_CONTRACT_ADDRESS`.

## Claim window and late reservation (v1.3)

| Application state | What can happen next |
|---|---|
| `ELIGIBLE_RESERVED` | the applicant calls `withdraw` (any time until the reservation is released); from day 30 after reservation **anyone** may call `release_expired_reservation` → `ELIGIBLE_EXPIRED`, the reward returns to *available* |
| `ELIGIBLE_UNDERFUNDED` | **anyone** may call `reserve_underfunded` once *available* ≥ reward → `ELIGIBLE_RESERVED`, and the 30-day window starts |
| `ELIGIBLE_EXPIRED` | final; the value is available for the next eligible applicant or for the creator's reclaim |

Both methods are deterministic — the verdict is already on chain and no model is called. Days come from the transaction's committed datetime. `get_payout_window(campaign_id, applicant)` returns the state, pending wei, reservation and expiry day, today, `expired` and `reservable_now`; the app renders it as "Claim by YYYY-MM-DD — N days left".

The evidence replay key ignores scheme, `www.`, query, fragment, letter case and trailing slashes (`normalize_evidence_url` shows the identity), so one contribution can be submitted once per campaign.

## Reclaim flow

For a campaign with:

```text
Pool      10 GEN
Reserved   1 GEN
Available  9 GEN
```

the creator must first close the campaign, then call `reclaim_unused_pool`. The contract records `Pool = Reserved = 1 GEN` before emitting the 9 GEN transfer. It never modifies `campaign_reserved_wei`. The approved applicant can still withdraw the reserved 1 GEN afterward.

The dApp makes the change visible:

- Pool, Reserved, and Available are shown together.
- The creator sees a reclaim control on every loaded campaign.
- While active, the button is disabled with “Close the campaign first.”
- When closed with unused value, the button shows the exact reclaimable GEN amount.
- Success is shown only after accepted onchain state reads back as `pool == reserved` and `available == 0`.

## Contract lifecycle

1. Creator calls `create_campaign` with criteria and reward per approved applicant.
2. Creator funds the pool through payable `fund_campaign`.
3. Applicant submits a wallet-bound proof URL and a separate evidence URL.
4. Validators verify proof/evidence binding, agree on the reviewed snapshot, and classify eligibility.
5. An eligible result reserves the reward when sufficient available funds exist; otherwise it waits as `ELIGIBLE_UNDERFUNDED` until anyone calls `reserve_underfunded` after more funding.
6. Applicant calls `withdraw` within the 30-day claim window; afterwards anyone may release the reservation back to the pool.
7. Creator closes the campaign and may reclaim only the remaining unreserved pool.

## Local verification

Prerequisites: Node.js 22+, Python 3.12, and the pinned packages in `requirements-test.txt`.

```bash
npm ci
npm run build
python3 -m pip install -r requirements-test.txt
python3 -m genvm_linter.cli lint contracts/airjudge.py
python3 -m pytest tests/ -q
python3 tests/mutation_check.py
sha256sum contracts/airjudge.py
```

Direct Mode boundaries and mutation history are in [`tests/README.md`](tests/README.md). The complete fresh-deployment transaction matrix, native transfer hashes, and screenshot index are in [`TESTING.md`](TESTING.md).

## Configure the final frontend

Set the v1.3 address in Vercel (and redeploy without the build cache, because Vite inlines the value at build time):

```text
VITE_CONTRACT_ADDRESS=⟨v1.3 address⟩
```

Do not add `client.connect('studionet')`. Browser reads use the same-origin `/genlayer-rpc` proxy in `vercel.json`; MetaMask uses the public Studio RPC declared in `src/lib/config.ts`.

## Security scope

The model, the tested invariants, what v1.3 closed and what remains open are documented in [`SECURITY.md`](SECURITY.md).
