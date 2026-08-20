# AirJudge — Explorer Readiness Fix Summary

## Scope

Frontend/docs only. The deployed contract is unchanged:

`0x29c49872d34361FdC72C0528f7fCeB97F1eeda95`

## Fixes applied

| Finding | File(s) | Fix |
|---|---|---|
| Stale wallet after MetaMask account switch | `src/App.tsx` | Added `accountsChanged` listener, updates wallet + lookup wallet + proof marker immediately. |
| Proof page required two lines but UI copied only marker | `src/App.tsx`, `src/styles.css` | Added ready-to-publish two-line proof page and `COPY PROOF PAGE`. |
| No StudioNet chain check | `src/lib/genlayer.ts`, `src/App.tsx`, `src/lib/config.ts` | Added chain 61999 detection, switch/add flow, wrong-network banner, and pre-write `ensureStudioChain()`. |
| `[object Object]` / generic wallet errors | `src/lib/errors.ts`, `src/App.tsx`, `src/lib/genlayer.ts` | Added shared nested EIP-1193 error normalizer + raw console logging. |
| Floating SDK dependency | `package.json` | Pinned `genlayer-js` to `1.1.8`. |
| Browser reads hit Studio RPC directly | `src/lib/config.ts`, `vite.config.ts`, `vercel.json` | Added same-origin `/genlayer-rpc` proxy for Vite + Vercel. |
| Reviewer instructions were easy to fail | `README.md`, `TESTING.md`, `EXPLORER_LISTING_DRAFT.md` | Rewrote proof flow; added explicit not-yet-verified regression checklist and demo-campaign listing draft. |

## Checks completed in this patch workspace

- Contract file SHA-256 is identical before/after the patch.
- TypeScript syntax/static structure check passed using local declaration stubs because package installation was unavailable in this environment.
- `genlayer-js` is pinned to `1.1.8` in `package.json`.
- No source use of `String(error)` / `Unexpected error.` remains on the user-visible error path.

## Must still be run locally before Project Explorer submission

1. `npm install`
2. `npm run build` → PASS
3. Wrong-network connect/switch test
4. MetaMask account-switch test → proof marker changes immediately
5. Full proof-page copy + submit + adjudicate + claim flow
6. Redeploy Vercel and repeat reviewer flow on the live URL

Do not replace `<TESTED_DEMO_CAMPAIGN_ID>` in `EXPLORER_LISTING_DRAFT.md` until a real pre-funded campaign has been created and tested exactly as written.
