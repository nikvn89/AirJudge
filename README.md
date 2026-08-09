# AirJudge

**Decentralized contribution eligibility adjudication on GenLayer.**

AirJudge is a full dApp for projects that want to reward meaningful contributors without reducing contribution quality to transaction counts, points, or a centralized reviewer.

A campaign creator writes eligibility criteria in natural language. Contributors submit a claim and public evidence. GenLayer AI validators inspect the evidence and resolve the application to an onchain verdict:

- `ELIGIBLE`
- `NOT_ELIGIBLE`

## Why this exists

Traditional airdrop and reward systems are good at deterministic rules:

- wallet has at least N transactions
- volume is above X
- user interacted before snapshot Y

They are weak at qualitative rules:

- "created a meaningful educational contribution"
- "submitted original technical work"
- "produced a relevant and substantive community resource"

Those decisions normally require a centralized team. AirJudge moves the ambiguous part into GenLayer's decentralized AI adjudication.

## Product Flow

1. **Create campaign** — project defines a campaign ID, name and natural-language eligibility criteria.
2. **Submit contribution** — applicant sends a short claim and one public evidence URL.
3. **Inspect application** — the application is stored onchain as `PENDING`.
4. **Run adjudication** — GenLayer renders the evidence and AI validators evaluate it against the campaign criteria.
5. **Consensus verdict** — state becomes `ELIGIBLE` or `NOT_ELIGIBLE`.
6. **Read result** — anyone can inspect the final verdict and consensus reason.

## Live Intelligent Contract

Studionet contract:

`0x7bf078785CB95Ac52FdcDaCf80b4Cc839e129C22`

Explorer:

`https://explorer-studio.genlayer.com/address/0x7bf078785CB95Ac52FdcDaCf80b4Cc839e129C22`

The contract was tested onchain in both directions:

- relevant GenLayer evidence → `ELIGIBLE`
- unrelated evidence → `NOT_ELIGIBLE`

The negative test reached accepted consensus even with one validator disagreeing, demonstrating multi-validator adjudication rather than a single-model decision.

## Tech Stack

- Vite
- React
- TypeScript
- `genlayer-js`
- `viem`
- GenLayer Studionet
- Vercel

## Run locally

```bash
npm install
npm run dev
```

Optional `.env`:

```bash
cp .env.example .env
```

```env
VITE_CONTRACT_ADDRESS=0x7bf078785CB95Ac52FdcDaCf80b4Cc839e129C22
```

## Build

```bash
npm run build
```

## Deploy to Vercel

Import the repository into Vercel.

Build settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

The included `vercel.json` adds SPA rewrites.

## GenLayer Integration

The frontend follows the Studionet browser-wallet pattern:

```ts
import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const chain = {
  ...studionet,
  rpcUrls: {
    default: {
      http: ['https://studio.genlayer.com/api'],
    },
  },
}
```

Wallet addresses are normalized with `getAddress()` from `viem`.

Writes use:

```ts
client.writeContract(...)
client.waitForTransactionReceipt(...)
```

Reads use:

```ts
client.readContract({
  stateStatus: 'accepted',
  ...
})
```

## Contract Architecture

The dApp uses a deliberately narrow adjudication engine:

```text
campaign criteria
      +
applicant claim
      +
public evidence URL
      ↓
gl.nondet.web.render
      ↓
prompt_non_comparative
      ↓
GenLayer validators
      ↓
ELIGIBLE / NOT_ELIGIBLE
      ↓
onchain state
```

The applicant description is explicitly treated as an **untrusted claim**. Evidence must support the claim.

## Repository

```text
airjudge-project/
├── contracts/
│   └── airjudge.py
├── src/
│   ├── components/
│   ├── lib/
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── .env.example
├── package.json
├── vercel.json
└── README.md
```

## Project vs Intelligent Contract Submission

This repository is the **Project/dApp submission**.

The reusable contract primitive can be submitted separately as an Intelligent Contract. This project adds the actual product flow and user experience around that adjudication primitive.

## Current MVP constraints

- One public evidence URL per application.
- Campaign discovery is ID-based; recent IDs are cached locally in the browser for convenience.
- No token distribution is performed by the dApp yet.
- No appeal UI yet.
- Public URLs must be renderable by GenLayer web access.

These constraints keep the product focused on the core GenLayer value: decentralized judgment of qualitative contribution eligibility.

## License

MIT
