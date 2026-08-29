# Changelog

All notable changes to AirJudge. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [1.1.0] — 2026-08-29 — One-action campaign funding + architecture docs

Acts on the Project Explorer reviewer's note:

> *"If `create_campaign` is intended to receive native GEN funding directly upon
> creation, please add `@gl.public.write(payable=True)` to the contract
> function."*

**The contract is unchanged and there is no redeploy.**
`0x29c49872d34361FdC72C0528f7fCeB97F1eeda95` stays live and every existing
campaign keeps its state.

### Added

- **Create & Fund in one action.** The create form carries an optional
  **FUND NOW / GEN** field. Fill it in and the button becomes **CREATE & FUND
  CAMPAIGN**: the app submits `create_campaign`, waits for it to be confirmed
  on-chain, then submits `fund_campaign` for the amount entered. The creator
  signs twice but drives one action, which is the outcome the note is asking
  for.

  Leave the field empty and nothing changes — one transaction, unfunded
  campaign, exactly as before.

  Two properties of the sequence are deliberate:

  - The funding leg runs **only after the create is confirmed**. Firing
    `fund_campaign` against a campaign that does not exist yet would revert.
  - If the funding leg fails, the message says **the campaign was still
    created**, names its id, and points at the standalone Fund control. A
    generic failure would send the user back to create it again and straight
    into `"campaign already exists"`.

- **`ARCHITECTURE.md`** — the funding model, campaign lifecycle, the two-stage
  consensus design, and the line between what the contract enforces
  deterministically and what validators decide. None of this was written down
  anywhere; `grep "fund_campaign" README.md` returned nothing before this
  release, which is why the reviewer had to ask at all.

- **README "Funding model" section.**

- `CHANGELOG.md` — this file.

### Why the contract was not made payable

The underlying need — a creator who already knows the budget should not have to
come back for a second step — is real, and it is met above. What it does not
require is a redeploy.

`create_campaign` is deployed and live at the address on the listing, and the
state of every existing campaign lives there. Redeploying moves the address and
strands that state: a real cost, paid for a convenience the frontend delivers at
zero risk.

Keeping the value out of `create_campaign` also keeps one property worth having:
every GEN that enters a campaign passes through `fund_campaign`, so there is a
single function to audit for the accounting that guards reservation and
settlement.

If the contract is redeployed for some other reason, folding the value in is a
two-line change worth making at that point — `gl.message.value` in place of
`u256(0)` where the pool is initialised.

### Two-stage consensus, documented for the first time

| Stage | Question | Principle | Returns |
|---|---|---|---|
| 1 | Is this proof page bound to this campaign and this wallet? | `gl.eq_principle.strict_eq` | bare `bool` |
| 2 | Does this contribution satisfy the campaign criteria? | `gl.eq_principle.prompt_non_comparative` | verdict + reason |

`strict_eq` is used correctly here: stage 1's nondeterministic block returns one
boolean, so the meaning is distilled before consensus sees it and every
validator must land on the same value. Free-form reasoning appears only in stage
2, which is scored against stated criteria rather than compared byte for byte.

Failing stage 1 costs nothing — a bad binding never reaches semantic
adjudication and never reserves value.

---

## [1.0.0] — Published release

Contribution reward campaigns adjudicated by GenLayer validator consensus.
Creators define qualitative eligibility criteria and fund a native GEN pool;
applicants submit a public contribution plus a campaign-and-wallet-bound proof
page; validators verify the binding and then judge the contribution against the
criteria. Eligible results reserve a reward the applicant claims on-chain.
