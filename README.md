⚖️ AirJudge --- Decentralized Contribution Eligibility & Reward Settlement on GenLayer

Live: https://air-judge.vercel.app\Contract (GenVM StudioNet):0x29c49872d34361FdC72C0528f7fCeB97F1eeda95Explorer:https://explorer-studio.genlayer.com/address/0x29c49872d34361FdC72C0528f7fCeB97F1eeda95

AirJudge is a full-stack GenLayer dApp for contribution-based rewardcampaigns.

Campaign creators define qualitative eligibility criteria in plainEnglish and fund a native-token reward pool. Contributors submit apublic proof page and a separate public evidence URL. GenLayervalidators verify the proof-to-evidence binding, reach consensus on theexact evidence snapshot to review, and use AI consensus to decidewhether the contribution satisfies the campaign criteria.

An eligible verdict is not only recorded as a label: when sufficientcampaign funds are available, the contract reserves the configuredreward for that applicant and exposes a native GEN payout that theapplicant can claim onchain.

Why AirJudge

Deterministic smart contracts are good at objective rules such as:

wallet balance,

transaction count,

allowlists,

timestamps,

fixed numeric thresholds.

They cannot reliably determine whether public work is meaningful,relevant, original-looking, educational, useful, or otherwise satisfiesa qualitative campaign requirement.

A centralized reviewer can make those decisions, but introduces a trustbottleneck. A thin AI wrapper is also insufficient: the contract mustdefine what evidence was actually reviewed and connect the accepteddecision to deterministic onchain consequences.

AirJudge combines:

Onchain account control from the transaction sender.

Proof-to-evidence provenance checks before qualitativeadjudication.

Consensus-agreed evidence snapshots so the reviewed content iscommitted onchain.

GenLayer AI-validator consensus for subjective eligibility.

Deterministic reward reservation and native-token settlementafter an eligible verdict.

V3 --- Changes After Steward Feedback

AirJudge V3 was redesigned around the previous review feedback.

1. Account Control

Applications are bound directly to gl.message.sender_address.

The contract no longer relies on a self-declared public handle as proofthat the applicant controls an identity. The wallet submitting theapplication is the wallet recorded as the applicant.

2. Evidence Provenance

Each application contains two separate public URLs:

Proof URL --- a public page containing the requiredcampaign-and-wallet marker.

Evidence URL --- the public contribution that will actually bereviewed.

The proof page must contain both:

AIRJUDGE_PROOF:<campaign_id>:<applicant_wallet>

and an explicit binding to the submitted evidence:

evidence_url:<exact_submitted_evidence_url>

Validators fetch the proof page before adjudication. If either bindingis missing, the contract fails closed to NOT_ELIGIBLE.

The same evidence URL also cannot be submitted twice to the samecampaign.

3. Commit the Reviewed Content

AirJudge does not rely only on a mutable live URL after review.

Validators fetch the evidence and use gl.eq_principle.strict_eq toagree on the exact text snapshot being reviewed. That consensus-agreedsnapshot is then used as the evidence input for AI adjudication.

The exact reviewed snapshot is stored onchain in the application statetogether with the adjudication result.

4. Eligibility → Real Settlement

Campaigns define a native GEN reward and maintain funded, reserved, andavailable balances.

When AI consensus returns ELIGIBLE:

if sufficient funds are available, the reward is reserved;

a researcher-specific/applicant-specific pending payout is created;

the application becomes ELIGIBLE_RESERVED.

The applicant can then call withdraw().

A successful withdrawal:

clears the pending payout,

decreases reserved funds,

decreases the campaign pool,

changes the application to ELIGIBLE_PAID,

transfers the native GEN reward to the applicant.

If the contribution is eligible but the campaign does not have enoughavailable funds, the application becomes ELIGIBLE_UNDERFUNDED insteadof creating an unfunded promise.

How It Works

01  Create campaign
    → creator defines campaign ID, name, qualitative criteria and reward

02  Fund campaign
    → native GEN is deposited into the campaign reward pool

03  Connect applicant wallet
    → applicant identity comes from the onchain transaction sender

04  Prepare proof
    → frontend shows:
      AIRJUDGE_PROOF:<campaign_id>:<applicant_wallet>

05  Submit application
    → description
    → public proof URL
    → public evidence URL
    → one application per wallet per campaign
    → evidence URL cannot be reused in the same campaign

06  Verify provenance
    → validators fetch the proof URL
    → marker must match campaign + applicant wallet
    → proof must explicitly bind the exact evidence URL
    → failure => NOT_ELIGIBLE

07  Commit evidence
    → validators fetch the evidence URL
    → strict consensus selects the exact reviewed snapshot
    → fetch failure => NOT_ELIGIBLE

08  AI adjudication
    → GenLayer validators judge the consensus-agreed snapshot
      against the campaign's natural-language criteria

09  Settlement
    → NOT_ELIGIBLE
      or
    → ELIGIBLE_RESERVED
      or
    → ELIGIBLE_UNDERFUNDED

10  Claim
    → applicant calls withdraw()
    → native GEN is transferred
    → status becomes ELIGIBLE_PAID

Application State Machine

PENDING
   │
   ├── provenance failure ───────────────→ NOT_ELIGIBLE
   │
   ├── evidence fetch failure ───────────→ NOT_ELIGIBLE
   │
   └── AI adjudication
          │
          ├── rejected ──────────────────→ NOT_ELIGIBLE
          │
          └── eligible
                 │
                 ├── enough funds ───────→ ELIGIBLE_RESERVED
                 │                              │
                 │                              └── withdraw()
                 │                                   ↓
                 │                              ELIGIBLE_PAID
                 │
                 └── insufficient funds ───────→ ELIGIBLE_UNDERFUNDED

Security & Settlement Model

Property                           V3 implementation

Account control                Applicant is derived fromgl.message.sender_address, notfrom a self-declared handle.

Proof/evidence binding         Proof page must contain thecampaign-and-wallet marker and theexact submitted evidence URL.

One application per wallet     Application state is keyed bycampaign + applicant.

Evidence anti-replay           The same evidence URL cannot besubmitted twice to the samecampaign.

Consensus evidence snapshot    Validators use strict_eq overfetched evidence beforequalitative adjudication.

Reviewed-content commitment    The exact consensus-agreedreviewed snapshot is storedonchain.

Claim is not proof             Applicant description is treatedas untrusted context and cannotestablish eligibility by itself.

Prompt-injection fencing       Claim and evidence are delimitedand validators are instructed toignore embedded instructions.

Fail-closed behavior           Failed provenance, failed evidencefetch, or malformed adjudicationoutput cannot produce an eligiblepayout.

Reserved-fund accounting       Eligible rewards are reservedbefore they become claimable.

Underfunded handling           Eligibility can be recordedwithout creating a claimablepayout when available campaignfunds are insufficient.

Applicant-only withdrawal      withdraw() derives the claimantfrom gl.message.sender_addressand pays that applicant's pendingreward.

Important Scope

AirJudge establishes control of the submitting wallet through theonchain transaction sender and verifies that the submitted proof pagebinds that campaign/wallet identity to the exact evidence URL reviewedby validators.

It does not claim to establish universal first-publicationauthorship or to detect plagiarism across every external website. Amalicious user could republish copied content at a new URL. Solvingglobal authorship/originality requires stronger external identity,signatures, timestamped content commitments, or cross-source plagiarismdetection.

The V3 security claim is intentionally narrower: the contract verifiesthe submitting wallet, proof-to-evidence binding, reviewed content,adjudication result, and reward settlement path.

AI Consensus

AirJudge uses two different consensus mechanisms for two different jobs.

Exact Evidence Agreement

gl.eq_principle.strict_eq(fetch_evidence_snapshot)

Validators must agree on the exact fetched evidence snapshot. Thisdetermines the content that will be reviewed and committed.

Qualitative Eligibility

gl.eq_principle.prompt_non_comparative(...)

Validators independently evaluate whether that consensus-agreed evidencesatisfies the campaign criteria.

The applicant's description is explicitly treated as untrusted.Eligibility must be supported by the reviewed evidence itself.

Reward Accounting

Each funded campaign tracks:

POOL
RESERVED
AVAILABLE = POOL - RESERVED

Example with a 5 GEN reward:

Initial:
Pool       10 GEN
Reserved    0 GEN
Available  10 GEN

After eligible adjudication:
Pool       10 GEN
Reserved    5 GEN
Available   5 GEN

After applicant claims:
Pool        5 GEN
Reserved    0 GEN
Available   5 GEN

This prevents the same available campaign funds from being promised tomultiple approved applicants.

Frontend Features

Wallet connection with passive restoration of an already-authorizedwallet after refresh.

Campaign creation, loading and funding.

Native GEN pool / reserved / available accounting display.

Campaign-and-wallet-specific required proof marker with live MetaMask account synchronization.

Ready-to-publish two-line proof page generator that binds the exact evidence URL.

Separate Proof URL and Evidence URL fields.

Wrong-network detection and explicit GenLayer Studio (61999) switching.

Readable wallet/provider errors instead of `[object Object]`.

HTTPS URL validation and normalized pasted input.

Evidence anti-replay pre-check.

Application status and consensus reason.

Onchain reviewed snapshot display.

ELIGIBLE_RESERVED, ELIGIBLE_UNDERFUNDED, ELIGIBLE_PAID andrejection states.

Claimable GEN display and applicant-only claim action.

Retry/backoff for RPC reads.

Pre-hash RPC failures are distinguished from transactions that werealready submitted.

Post-submit monitoring failures do not encourage unsafe doublesubmission.

Post-claim RPC refresh failures are treated as verification warningsrather than proof that the claim failed.

Verified V3 End-to-End Tests

AirJudge V3 was tested on GenLayer StudioNet with public GitHub Gistproof/evidence pages.

Test A --- Invalid Proof / Provenance Failure

A submission whose proof did not satisfy the required wallet/evidencebinding was adjudicated as:

NOT_ELIGIBLE
Reserved / Claimable: 0 GEN

The consensus reason reported that wallet control or evidence provenancewas not verified.

Test B --- Valid Proof + Evidence

A separate applicant submitted:

the correct campaign-and-wallet proof marker,

a proof page explicitly binding the exact evidence URL,

public evidence satisfying the campaign criteria.

The application progressed through:

PENDING
→ ELIGIBLE_RESERVED

with:

Claimable: 5 GEN

Test C --- Native Reward Claim

The eligible applicant claimed the reserved reward.

Observed final application state:

ELIGIBLE_PAID
Claimable: 0 GEN

Observed campaign accounting after the 5 GEN claim:

Pool       5 GEN
Reserved   0 GEN
Available  5 GEN

This verifies the complete V3 path:

public proof + evidence
→ provenance verification
→ consensus evidence snapshot
→ AI eligibility adjudication
→ reward reservation
→ applicant claim
→ native GEN settlement

Test D --- RPC / Double-Submit Safety

During testing, StudioNet returned rate-limit and intermittentFailed to fetch errors.

The frontend distinguishes a failure before a transaction hash isreturned from a transaction that has already been submitted. Once a hashexists, monitoring/read failures are treated separately so the UI doesnot instruct the user to submit the same action again.

Quick Reviewer Test

This is the safest currently documented end-to-end path. It requires two wallets because the deployed contract does not allow the campaign creator to apply to the same campaign.

1. Connect a creator wallet. AirJudge will request GenLayer Studio (chain 61999) if MetaMask is on another network.
2. Create a campaign with qualitative criteria and a small reward, then fund it with enough native StudioNet GEN.
3. Switch MetaMask to a different applicant wallet. The wallet button and required proof marker must update automatically to the new address.
4. Load the campaign. Publish the contribution at a public HTTPS evidence URL.
5. Paste that exact evidence URL into AirJudge. Click COPY PROOF PAGE. The copied content contains both required lines:

AIRJUDGE_PROOF:<campaign_id>:<applicant_wallet>
evidence_url:<exact_evidence_url>

6. Publish those two lines unchanged at a public HTTPS proof page. A publicly fetchable GitHub Gist Raw URL was used successfully in the V3 tests. Paste that URL into Proof / Binding URL.
7. Submit the application once. Expected initial state: PENDING.
8. Run GenLayer adjudication once. If consensus returns ELIGIBLE_RESERVED, claim the reward from the applicant wallet. Expected final state: ELIGIBLE_PAID.

Important: after a transaction hash exists, do not blindly submit the same action again because RPC monitoring is slow or temporarily unavailable. Reload campaign/application state first.

Project Explorer note: the lowest-friction listing should use a pre-created, pre-funded demo campaign so a reviewer needs only one applicant wallet. Do not publish a demo campaign ID in the listing until that exact campaign and the exact written steps have been tested end-to-end with a fresh wallet.

Testing Guide

Prerequisites

MetaMask

MetaMask (AirJudge can add/switch GenLayer Studio chain 61999)

Native StudioNet GEN for campaign funding and transactions

A public HTTPS host that GenLayer validators can fetch, such as apublic GitHub Gist

1. Create a Campaign

Connect the campaign creator wallet and create a campaign with:

campaign ID,

campaign name,

qualitative eligibility criteria,

reward amount.

Fund the campaign with native GEN.

2. Load the Campaign as an Applicant

Connect a different wallet and load the campaign.

AirJudge displays the required marker:

AIRJUDGE_PROOF:<campaign_id>:<applicant_wallet>

3. Publish Evidence

Create a public HTTPS page containing the contribution to be reviewed.

Copy its exact URL.

4. Publish the Proof Page

Create a second public page containing:

AIRJUDGE_PROOF:<campaign_id>:<applicant_wallet>

evidence_url:<exact_evidence_url>

The evidence URL must exactly match the URL submitted to AirJudge.

5. Submit the Application

Fill:

Contribution Description

Authorship / Proof URL

Contribution Evidence URL

Submit once.

The application should enter:

PENDING

6. Run GenLayer Adjudication

Run adjudication once.

Validators first verify the proof/evidence binding, then agree on theevidence snapshot, then judge that snapshot against the campaigncriteria.

Possible results include:

NOT_ELIGIBLE
ELIGIBLE_RESERVED
ELIGIBLE_UNDERFUNDED

7. Claim an Eligible Reward

For an ELIGIBLE_RESERVED application, connect the applicant wallet andclick Claim.

After successful settlement:

ELIGIBLE_PAID

and the campaign's pool/reserved accounting updates accordingly.

RPC Notes

GenLayer StudioNet may occasionally rate-limit RPC requests or return transient network errors. Browser reads use the same-origin `/genlayer-rpc` proxy on both Vite and Vercel.

Examples include:

Request is being rate limited
Failed to fetch

AirJudge V3 handles these cases conservatively:

No transaction hash returned: the transaction was not submitted;retry is safe after the RPC recovers.

Transaction hash returned: do not blindly resubmit becausemonitoring failed.

Post-claim refresh failure: reload the application and campaignstate to verify settlement rather than claiming again.

Tech Stack

Layer                           Technology

Contract                    Python / GenLayer Intelligent Contract,GenVM v0.2.16

Exact snapshot consensus    gl.eq_principle.strict_eq

AI adjudication             gl.eq_principle.prompt_non_comparative

Public evidence retrieval   gl.nondet.web.render

Native payout               GenLayer EVM contract interface / nativetransfer emission

Frontend                    Vite + React + TypeScript

Blockchain SDK              genlayer-js + viem

Wallet                      MetaMask

Hosting                     Vercel

Project Structure

contracts/
  airjudge.py              ← AirJudge V3 Intelligent Contract

src/
  App.tsx                  ← campaign, proof, adjudication and settlement UI
  main.tsx                 ← frontend entry point
  styles.css               ← application styles
  vite-env.d.ts
  components/
    StatusPill.tsx
    WalletButton.tsx
  lib/
    config.ts              ← contract address + RPC configuration
    genlayer.ts            ← GenLayer reads/writes, polling and RPC safety
    storage.ts             ← local frontend persistence helpers

Local Development

git clone https://github.com/nikvn89/AirJudge.git
cd AirJudge
npm install
npm run dev

Set `VITE_CONTRACT_ADDRESS` if you deploy a new instance. Browser RPC reads use the same-origin `/genlayer-rpc` proxy configured by Vite/Vercel.

To deploy a new AirJudge contract, deploy contracts/airjudge.pythrough GenLayer Studio using the appropriate consensus configuration.

Reusable Primitive

AirJudge V3 demonstrates a reusable GenLayer pattern:

onchain applicant identity
+ public proof-to-evidence binding
+ consensus-agreed evidence snapshot
+ subjective AI-validator adjudication
+ deterministic reserved-fund accounting
+ native onchain settlement

The same architecture can support contribution rewards, granteligibility, community incentive programs, qualitative milestonerewards, and other systems where subjective public evidence must lead toenforceable onchain outcomes.


Explorer readiness fixes

The current frontend adds the reviewer-safety fixes identified before Project Explorer submission: MetaMask account/network listeners, explicit StudioNet chain handling before writes, normalized EIP-1193 errors, a complete two-line proof-page copier, pinned `genlayer-js@1.1.8`, and same-origin RPC proxying. The deployed contract is unchanged.

These source changes are not marked as browser-regression PASS until the checklist in `TESTING.md` is run on the final deployment.



## Funding model

`create_campaign` records the promise; `fund_campaign` moves the money:

```python
@gl.public.write            def create_campaign(id, name, criteria, reward_wei)
@gl.public.write.payable    def fund_campaign(id)
```

`reward_wei` is the reward promised **per eligible applicant**
(`campaign_reward_wei`) and is recorded whether or not any GEN has arrived.
`campaign_pool_wei` is the balance those rewards are actually paid from. Keeping
them apart lets a campaign exist while unfunded — a creator can publish criteria
and let people read them before committing money — and means every GEN that
enters a campaign passes through one auditable function.

**Funding at creation time.** Fill in the optional *FUND NOW / GEN* field on the
create form and the button becomes **CREATE & FUND CAMPAIGN**: the app creates
the campaign, waits for confirmation, then funds it. Two signatures, one action.
Leave the field empty for an unfunded campaign you top up later.

Full flow, the two-stage consensus design, and the deterministic/semantic
boundary: [ARCHITECTURE.md](ARCHITECTURE.md).

## Explorer End-to-End Verification — Aug 20, 2026

A fresh reviewer-style flow was completed locally against the unchanged StudioNet contract.

Test campaign:

```text
Campaign ID: airjudge-test-01
Campaign:    AirJudge Test
Reward:      1 GEN
Pool funded: 10 GEN
Criteria:    Applicant must provide public proof of contributing to a GenLayer project.
```

Observed flow:

```text
1. Creator created and loaded the campaign.
2. Creator funded the pool with 10 GEN.
3. Wallet was changed in MetaMask without reloading the page.
   → UI account updated immediately.
   → proof marker updated to the new applicant wallet.
4. Applicant submitted:
   → public Proof / Binding URL containing the generated two-line binding
   → public Contribution Evidence URL
5. Application status became PENDING.
6. GenLayer adjudication reached ELIGIBLE_RESERVED.
   → 1 GEN reserved / claimable
   → campaign available balance moved from 10 GEN to 9 GEN
7. Applicant claimed the reward.
   → claimable returned to 0 GEN
   → UI displayed REWARD CLAIMED
```

Final result:

```text
CREATE / LOAD CAMPAIGN       PASS
FUND CAMPAIGN                PASS
ACCOUNT CHANGE SYNC          PASS
PROOF MARKER REBIND          PASS
TWO-LINE PROOF PAGE          PASS
SUBMIT APPLICATION           PASS
GENLAYER ADJUDICATION        PASS
ELIGIBLE_RESERVED            PASS
CLAIM 1 GEN                  PASS
REWARD CLAIMED               PASS
```

This verifies the complete reviewer path through the frontend and the existing deployed contract.


## Compact Professional UI

The frontend is organized into three workflow tabs:

```text
01 Campaign
02 Proof & Submit
03 Review & Claim
```

A persistent summary strip keeps campaign reward, pool, available balance, and application status visible without requiring a long scroll. Long reviewed snapshots are contained in a scrollable panel.

The visual layer uses a brighter purple/navy system, glass panels, subtle ambient glows, tab transitions, hover lift, button glow, and reduced-motion support.

This redesign is frontend-only. Contract logic, wallet synchronization, chain handling, RPC proxy behavior, proof binding, adjudication, and settlement logic are unchanged.


## Brighter UI polish

The professional workspace was brightened further for better first-screen readability:
- brighter navy/purple background;
- lighter cards and form surfaces;
- stronger active-tab contrast;
- more visible disabled workflow tabs;
- reduced hero height;
- tighter form spacing;
- brighter borders and glow states.

This is a visual-only CSS refinement.


## GenLayer branding

The frontend header includes the official GenLayer white logo on the dark interface as a
small "Built on GenLayer" lockup. The logo asset is loaded from GenLayer's official brand
asset URL and is displayed without recoloring or distortion.
