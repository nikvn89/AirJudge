# AirJudge — Project Explorer Listing Draft

> DRAFT ONLY. Do not submit until the final browser regression checklist passes and a demo campaign ID has been created/tested.

## Name
AirJudge

## Category
AI / Rewards

Reason: the core product uses GenLayer AI-validator consensus to adjudicate qualitative contribution evidence and connect the accepted result to deterministic reward reservation/settlement.

## One-liner
Create contribution reward campaigns where GenLayer validators review public evidence and eligible applicants can claim native GEN rewards.

## Short description
AirJudge lets campaign creators define qualitative eligibility criteria and fund a native GEN reward pool. Applicants submit a public contribution together with a campaign-and-wallet-bound proof page. GenLayer validators verify the proof/evidence binding, agree on the reviewed evidence snapshot, and adjudicate whether the contribution satisfies the campaign criteria. Eligible results reserve a reward that the applicant can claim onchain.

## How to try it — preferred one-wallet reviewer flow

**Only use this version after creating and testing a funded demo campaign.**

Demo campaign ID: `<TESTED_DEMO_CAMPAIGN_ID>`

1. Open the AirJudge website and connect MetaMask. Approve switching to GenLayer Studio (chain 61999) if prompted.
2. Load demo campaign `<TESTED_DEMO_CAMPAIGN_ID>`. It must already be active and funded.
3. Publish your contribution at a public HTTPS URL that has been confirmed readable by GenLayer.
4. Paste that exact URL into Contribution Evidence URL. Click **COPY PROOF PAGE**.
5. Publish the copied two lines unchanged at a public HTTPS URL, then paste that URL into **Proof / Binding URL**.
6. Enter a short contribution description and submit once. Expected state: `PENDING`.
7. Click **RUN GENLAYER ADJUDICATION** once and wait for validator consensus.
8. If the result is `ELIGIBLE_RESERVED`, click **CLAIM** from the same applicant wallet. Expected final state: `ELIGIBLE_PAID`.

## Contract
https://explorer-studio.genlayer.com/address/0x29c49872d34361FdC72C0528f7fCeB97F1eeda95

## Website
https://air-judge.vercel.app/

## GitHub
https://github.com/nikvn89/AirJudge


---

## Tested reviewer path (use this wording for Project Explorer)

A reviewer-style end-to-end flow was completed successfully on Aug 20, 2026 against the unchanged StudioNet deployment.

### How to try it

1. Open the AirJudge frontend and connect MetaMask.
   The app uses GenLayer StudioNet (chain ID 61999).

2. Load the public demo campaign:

```text
airjudge-test-01
```

The campaign is active and funded. Reward per eligible application is 1 GEN.

3. Use a wallet that is not the campaign creator. If you change accounts in MetaMask, AirJudge updates the displayed account and proof marker automatically.

4. Enter a short contribution description and a public Contribution Evidence URL. AirJudge generates a two-line proof page containing:

```text
AIRJUDGE_PROOF:<campaign_id>:<your_wallet>
evidence_url:<your exact evidence URL>
```

Click **COPY PROOF PAGE**, publish those two lines unchanged at a public HTTPS URL (the tested flow used a GitHub Gist Raw URL), and paste that public URL into **Proof / Binding URL**.

5. Submit the application, then run GenLayer adjudication. A qualifying test reached:

```text
ELIGIBLE_RESERVED
```

with 1 GEN reserved.

6. Click **CLAIM 1 GEN**. The tested flow completed with:

```text
REWARD CLAIMED
```

Notes:
- The campaign creator cannot apply to their own campaign.
- The proof page is wallet-specific; every applicant must publish their own generated binding.
- GitHub Gist Raw was tested successfully for the proof page in the completed E2E run.
