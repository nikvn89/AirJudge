# AirJudge

AirJudge is a GenLayer reward-campaign dApp. Creators fund native GEN pools, applicants bind public evidence to their wallet, validators adjudicate qualitative eligibility, and the contract reserves and settles approved rewards.

Milestone v2 fixes a treasury dead end: after closing a campaign, its creator can now reclaim only the unused portion of the pool. Reserved applicant rewards remain protected and withdrawable.

## Deployment

- Network: GenLayer StudioNet, chain `61999`
- GenVM SDK: `v0.2.16` (`py-genlayer` v0.2)
- v2 address: `0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1`
- v2 Explorer: [`0x3d5f...cc2B1`](https://explorer-studio.genlayer.com/address/0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1)
- deployment transaction: [`0x6205...f30cd`](https://explorer-studio.genlayer.com/tx/0x6205cf355d42efd66382f2979d4f583fe6d5c78671a34de47d8754f4eacf30cd)
- v2 contract SHA-256: `156ed2a5906649bc3ba620d7be87afb488fbe9ed80058c30bc3bc761fa5c362c`
- previous address: [`0x29c49872d34361FdC72C0528f7fCeB97F1eeda95`](https://explorer-studio.genlayer.com/address/0x29c49872d34361FdC72C0528f7fCeB97F1eeda95)
- previous contract SHA-256: `5c7bb12a90f556209472390404e28331552237c793af31964fb4c5e9c5a814fe`

The new deployment starts with empty storage. Campaigns at the previous address are not migrated; that address remains readable in Explorer while the final v2 app will point to the fresh address through `VITE_CONTRACT_ADDRESS`.

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
5. An eligible result reserves the reward when sufficient available funds exist.
6. Applicant calls `withdraw` for the reserved reward.
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

The production fallback already points to the fresh v2 deployment. For Vercel, set the same address explicitly:

```text
VITE_CONTRACT_ADDRESS=0x3d5f7C9E1ED2847EB61FE773D9f33b93c46cc2B1
```

Do not add `client.connect('studionet')`. Browser reads use the same-origin `/genlayer-rpc` proxy in `vercel.json`; MetaMask uses the public Studio RPC declared in `src/lib/config.ts`.

## Security scope

The model, tested invariants, and the intentionally open limitation around approved-but-never-withdrawn rewards are documented in [`SECURITY.md`](SECURITY.md).
