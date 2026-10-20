# Architecture

The immutable campaign criteria and fixed integer reward separate semantic eligibility from deterministic settlement. Tree maps store campaigns, per-wallet applications, canonical evidence latches and pending payouts.

The v2 storage layout is extended by the reservation UTC day. No data migration or in-place upgrade is claimed. A fresh 1.3.1 deployment has empty state.

`available = max(pool - reserved, 0)`. Funding increases pool; reservation increases reserved and pending; withdrawal decreases all three by pending; release decreases only reserved and pending; reclaim sets pool to reserved after closing. Only withdrawal and reclaim emit native transfers.

The frontend writes through the injected wallet without installing a Snap. Same-origin reads use the Vercel RPC rewrite. The adapter pins the deployment profile, checks wallet/chain selection, captures before-state, submits once, checks finalized leader execution, and compares after-state. `src/lib/txVerification.ts` contains the pure tested confirmation rules. `scripts/check-deployment.mjs` captures only whitelisted source/profile/state/transaction evidence.

The UTC date-based claim-window boundary and supported terminal transitions are documented in README and tested at one second before, exactly at and one second after the boundary.
