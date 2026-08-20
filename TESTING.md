# AirJudge — Project Explorer Regression Checklist

## Deployment under test

- Network: GenLayer StudioNet
- Contract: `0x29c49872d34361FdC72C0528f7fCeB97F1eeda95`
- Explorer: https://explorer-studio.genlayer.com/address/0x29c49872d34361FdC72C0528f7fCeB97F1eeda95
- Contract source is unchanged by the Explorer-readiness frontend fixes.

## Historical V3 flow already demonstrated

The existing project record documents successful V3 paths for invalid provenance, valid proof/evidence, reward reservation, and native GEN claim through `ELIGIBLE_PAID`. Those historical results are not substitutes for re-testing the final Explorer frontend.

## Explorer-readiness changes to regression-test

### 1. Fresh wallet on the wrong network

INPUT:

```text
Open the final frontend with MetaMask on a non-Studio network.
Connect a wallet.
```

EXPECTED:

```text
- Account remains visibly connected after account approval.
- App identifies the wrong network and offers SWITCH NETWORK.
- MetaMask can add/switch to GenLayer Studio (61999).
- No raw provider error and no [object Object].
```

Status: **NOT YET RE-VERIFIED**

### 2. Change applicant account in MetaMask

INPUT:

```text
Load a campaign, then change MetaMask from wallet A to wallet B.
```

EXPECTED:

```text
- Wallet button updates to wallet B without F5.
- Applicant lookup defaults to wallet B.
- Required marker changes immediately to:
  AIRJUDGE_PROOF:<campaign_id>:<wallet_b_lowercase>
- UI notice explains that the proof marker now belongs to the new wallet.
```

Status: **NOT YET RE-VERIFIED**

### 3. Complete proof-page copier

INPUT:

```text
Load a campaign as the applicant.
Paste the exact public HTTPS Evidence URL.
Click COPY PROOF PAGE.
```

EXPECTED clipboard text:

```text
AIRJUDGE_PROOF:<campaign_id>:<applicant_lowercase>
evidence_url:<exact_evidence_url>
```

Then publish those exact two lines at a publicly fetchable HTTPS URL and use it as Proof / Binding URL.

Status: **NOT YET RE-VERIFIED**

### 4. Full reviewer path

INPUT:

```text
Use the exact README Quick Reviewer Test steps with fresh/reviewer-like wallets.
Use only a public host that has actually been confirmed readable by GenLayer web rendering.
```

EXPECTED:

```text
PENDING
→ provenance verification
→ consensus evidence snapshot
→ AI adjudication
→ ELIGIBLE_RESERVED
→ CLAIM
→ ELIGIBLE_PAID
```

Status: **NOT YET RE-VERIFIED**

### 5. Build

INPUT:

```text
npm install
npm run build
```

EXPECTED:

```text
PASS with 0 TypeScript errors.
```

Status: **NOT YET VERIFIED IN THIS PATCH PACKAGE**

## RPC proxy check

Local Vite reads must go through:

```text
http://localhost:5173/genlayer-rpc
→ https://studio.genlayer.com/api
```

Vercel uses the same `/genlayer-rpc` path via `vercel.json`.

MetaMask network configuration uses the public Studio RPC directly because the wallet itself must reach the chain.

## Do not overclaim before Explorer submission

Do not publish the Project Explorer listing until all five checks above pass on the final frontend. If using a pre-funded demo campaign to reduce the reviewer flow to one applicant wallet, create and test that exact campaign first, then place the tested campaign ID into the listing instructions.


---

# Explorer E2E Regression — Aug 20, 2026

## Environment

```text
Network:  GenLayer StudioNet
Contract: 0x29c49872d34361FdC72C0528f7fCeB97F1eeda95
Campaign: airjudge-test-01
Reward:   1 GEN
Funded:   10 GEN
```

## Regression A — Account change synchronization

The connected MetaMask account was changed without reloading the page.

Observed:

```text
Wallet changed to <new applicant address>.
The proof marker below now belongs to this wallet.
```

The required proof marker immediately changed to the new applicant wallet.

**Result: PASS**

## Regression B — StudioNet chain on the write path

The browser provider returned:

```text
eth_chainId = 0xf22f
```

which is GenLayer StudioNet chain ID 61999.

The campaign funding write completed and the frontend verified:

```text
10 GEN added to campaign pool and verified onchain.
```

**Result: PASS**

## Regression C — Two-line proof binding

The frontend generated a proof page containing both required lines:

```text
AIRJUDGE_PROOF:<campaign_id>:<applicant_wallet>
evidence_url:<exact contribution evidence URL>
```

The proof page was published at a public GitHub Gist Raw URL and loaded back into the Proof / Binding URL field.

**Result: PASS**

## Regression D — Application submission

The applicant submitted the contribution using:

```text
Contribution description
Proof / Binding URL
Contribution Evidence URL
```

The frontend loaded the application with:

```text
status = PENDING
```

**Result: PASS**

## Regression E — GenLayer adjudication

Observed frontend result:

```text
Consensus reached: ELIGIBLE_RESERVED
```

Campaign accounting updated to:

```text
Reward:    1 GEN
Pool:      10 GEN
Reserved:   1 GEN
Available:  9 GEN
```

The application showed:

```text
Reserved / Claimable = 1 GEN
```

**Result: PASS**

## Regression F — Claim / settlement

The applicant clicked:

```text
CLAIM 1 GEN
```

Observed final frontend state:

```text
Reserved / Claimable = 0 GEN
✓ REWARD CLAIMED
```

**Result: PASS**

## Final Explorer E2E Result

```text
Account switching        PASS
Proof marker rebinding   PASS
Proof-page generation    PASS
Campaign funding         PASS
Application submission   PASS
Consensus adjudication   PASS
Reward reservation       PASS
Reward claim             PASS
```

**AIRJUDGE REVIEWER FLOW: END-TO-END PASS**


## UI Refactor Regression Note

The professional compact UI is a presentation-only refactor. Before publishing the updated frontend, re-check:

```text
[ ] npm run build
[ ] account change still updates wallet + proof marker
[ ] campaign load / fund still works
[ ] proof page still contains both required lines
[ ] existing application can be loaded in Review & Claim
```

The previously completed AirJudge contract E2E flow remains the functional baseline; do not claim the new UI deployment itself as verified until these checks are run.
