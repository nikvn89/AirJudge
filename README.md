# ⚖️ AirJudge — Decentralized Contribution Eligibility on GenLayer

**Live:** https://air-judge.vercel.app
**Contract (GenVM StudioNet):** `0x7Caa41e15cdbDdCB4b7165F4a9eCE2694bB6A05A`
**Explorer:** https://explorer-studio.genlayer.com/address/0x7Caa41e15cdbDdCB4b7165F4a9eCE2694bB6A05A

A full-stack dApp that lets anyone create airdrop or reward campaigns with eligibility rules written in plain English, and uses GenLayer's AI-validator consensus to adjudicate whether a contributor's public evidence actually qualifies — with authorship proven onchain before anyone is approved.

---

## The Problem

Deterministic rules handle "wallet has N transactions" well. They cannot handle "created a meaningful educational contribution" — that judgement normally falls to a centralised reviewer. Worse, any AI adjudicator that only reads evidence and scores its quality is trivially farmable: submit someone else's good work from your own wallet, and the model approves it.

AirJudge solves both: GenLayer validators evaluate qualitative criteria, and an onchain identity registry binds wallets to public handles so authorship must be proven before any approval.

---

## How It Works

```
01  Bind identity     →  register_handle("nikvn89")
                          wallet ↔ public handle, set once, immutable

02  Create campaign   →  create_campaign(id, name, criteria)
                          criteria in natural language

03  Submit evidence   →  submit_application(id, claim, url)
                          requires registered handle
                          evidence URL burned per campaign (anti-replay)

04  AI adjudication   →  judge_application(id, applicant)
                          each validator independently:
                            CHECK 1: is the page author the registered handle?
                            CHECK 2: does the evidence satisfy the criteria?
                          contract forces NOT_ELIGIBLE if authorship fails

05  Onchain verdict   →  ELIGIBLE / NOT_ELIGIBLE stored as contract state
```

---

## Security Model

| Property | Implementation |
|---|---|
| **Attribution** | `register_handle` binds a wallet to a public handle, once, permanently. Validators must locate the author on the evidence page and match it against the handle. |
| **Contract-Side Enforcement** | If `authorship_proven` is false, the contract forces `NOT_ELIGIBLE` regardless of the model's own verdict — a confused model cannot approve an unattributed submission. |
| **Anti-Replay** | Each evidence URL is burned per campaign at submission time. A second wallet cannot reuse the same evidence. |
| **One Application Per Wallet** | Keyed on `campaign_id:applicant`. No double-dipping. |
| **Prompt Injection Fencing** | Evidence and claims are wrapped in fenced blocks. The model is instructed to ignore embedded instructions. |
| **Fail-Closed** | A dead or unreachable evidence URL yields `FETCH_FAILED` and a `NOT_ELIGIBLE` verdict — it does not revert the transaction. |
| **Campaign Lifecycle** | Both submission and judging require an active campaign. Only the creator can close one. |

---

## Frontend Features

| Feature | What it does |
|---|---|
| **Identity gate** | Wallet without a registered handle cannot submit — the form is disabled with a warning pointing to step 01. |
| **Handle chip** | Registered handle shown in the nav bar after connect. |
| **Evidence URL pre-check** | URLs that GenLayer cannot crawl (`raw.githubusercontent.com`, `github.com/.../blob/...`) are blocked client-side with an explanation, before spending a transaction. |
| **Anti-replay pre-check** | `isEvidenceUsed()` is called before submission — the user learns the URL is taken before signing. |
| **Dynamic hint** | The evidence URL field shows "The page must publicly show 'nikvn89' as its author" — personalized to the connected handle. |
| **Non-blocking adjudication** | `judgeApplication` returns the tx hash immediately. The UI polls `getApplicationStatus` with backoff until the verdict lands, instead of blocking on `waitForTransactionReceipt` for 1-2 minutes. |
| **Accepted-state reads** | All `readContract` calls specify `stateStatus: 'accepted'` so verdicts appear as soon as consensus is reached, not after finalization. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Contract** | Python on GenVM v0.2.16 |
| **AI Consensus** | `gl.eq_principle.prompt_non_comparative` — independent validator evaluation |
| **Frontend** | Vite + React + TypeScript |
| **Blockchain SDK** | genlayer-js + viem |
| **Hosting** | Vercel |
| **Wallet** | MetaMask (GenLayer Studionet network) |

---

## Project Structure

```
contracts/
  airjudge.py              ← the intelligent contract

src/
  App.tsx                   ← main UI: 5-step flow
  main.tsx                  ← entry point
  styles.css                ← full stylesheet
  vite-env.d.ts
  components/
    StatusPill.tsx           ← ELIGIBLE / NOT_ELIGIBLE / PENDING badge
    WalletButton.tsx         ← connect + display wallet
  lib/
    config.ts                ← contract address + RPC URL
    genlayer.ts              ← SDK wrapper: read/write/poll + evidence checks
    storage.ts               ← localStorage for recent campaign IDs
```

---

## On-Chain Test Results (StudioNet)

Campaign `genlayer-edu`, criteria: *"Applicant must have created original educational content explaining GenLayer intelligent contracts."*

| # | Test | Result |
|---|---|---|
| 1 | `register_handle` twice from one wallet | Reverted — `handle already registered for this wallet` |
| 2 | Second wallet submits the first wallet's evidence URL | Reverted — `this evidence URL has already been submitted to this campaign` |
| 3 | Adjudicate evidence authored by someone else | `NOT_ELIGIBLE` — "Visible author is @alice, which does not match registered handle nikvn89; authorship not proven." |
| 4 | Adjudicate evidence authored by the registered handle | `ELIGIBLE` — "Authorship proven as 'someoneelse' matches registered handle. Evidence shows original educational content explaining GenLayer intelligent contracts and AI consensus mechanism." |

Tests 3 and 4 used the **same campaign and criteria**. The only variable was whether the evidence was authored by the applicant — isolating attribution as the deciding factor.

---

## Testing Guide

### Prerequisites

- MetaMask with GenLayer Studionet network added (RPC: `https://studio.genlayer.com/api`)
- Two wallet addresses (Wallet A and Wallet B)
- GenLayer Studio rate limits: 30 req/minute, 500 req/hour — space out AI calls

### Test 1 — Identity Registration

1. Open https://air-judge.vercel.app
2. Connect Wallet A
3. Section 01 should show a registration form (no handle yet)
4. Enter a handle (e.g. `testuser`) → Register
5. Green panel shows "Permanently bound to this wallet"
6. Chip appears on nav bar
7. Try registering again → error "handle already registered"

### Test 2 — Create Campaign

1. Section 02 → Create:
   - ID: `my-test`
   - Name: `Test Campaign`
   - Criteria: `Applicant must have created original content about any topic`
2. Campaign appears with ACTIVE status

### Test 3 — Evidence URL Pre-checks

1. Load campaign `my-test`
2. In evidence URL field, type: `https://raw.githubusercontent.com/abc/def/main/x.md`
   - Yellow warning appears, Submit button disabled
3. Type: `https://github.com/abc/def/blob/main/README.md`
   - Yellow warning appears
4. Type: `https://pastebin.com/xxxxxx`
   - Warning disappears, button enabled

### Test 4 — Submit Application

1. Create a pastebin with content:
   ```
   Author: testuser
   Posted by: testuser

   This is an article about any topic. It demonstrates original content
   creation for the purpose of testing eligibility adjudication.
   ```
2. Section 04 → fill description (20+ chars) + paste URL → Submit evidence
3. Section 05 → enter Wallet A address → Search → see PENDING status

### Test 5 — Anti-Replay

1. Switch to Wallet B in MetaMask
2. Register a handle for Wallet B
3. Try submitting with the same evidence URL as Wallet A
4. Error: "This evidence URL has already been submitted to this campaign"

### Test 6 — Adjudication (requires AI — takes 1-2 minutes)

1. Section 05 → enter Wallet A address → Search → see PENDING
2. Click "Run GenLayer adjudication"
3. Notice shows: "Submitting to the validator set..."
4. Then: "Transaction submitted. Waiting for validators to reach consensus..."
5. After 1-2 minutes: "Consensus reached. Verdict: ELIGIBLE."
6. Application panel updates with verdict + consensus reason

### Test 7 — Attribution Failure

To see a NOT_ELIGIBLE verdict, submit evidence whose visible author does NOT match the registered handle. For example, register as `testuser` but submit a pastebin authored by `someoneelse`. The verdict will be NOT_ELIGIBLE with a reason citing the handle mismatch.

### Notes

- `gl.nondet.web.render` cannot crawl `raw.githubusercontent.com` or `github.com/.../blob/...` — use repository homepages or paste hosts
- If you hit rate limits (`Request is being rate limited`), wait 30-60 minutes
- The adjudication spinner runs for 1-2 minutes while validators reach consensus — this is normal GenLayer behavior, not a bug

---

## Local Development

```bash
git clone https://github.com/nikvn89/AirJudge.git
cd AirJudge
npm install
npm run dev
```

Update `src/lib/config.ts` with your contract address and RPC endpoint.

To deploy a new contract instance, paste `contracts/airjudge.py` into GenLayer Studio and deploy with Full Consensus.
