# Contract test boundary

The suite loads `contracts/airjudge.py` itself through pinned genlayer-test 0.29.2 and SDK v0.2.16. Web content and model labels are controlled. No treasury implementation is copied into test doubles. It proves host Direct Mode behavior, not live validator accuracy or native transfer delivery. See [TESTING.md](../TESTING.md) for executed counts and pending gates.

Tests cover campaign/auth/application/judging/payout/reclaim, v1.3 date-based release and late reservation, URL identity and strict semantic schema/provider failure. `frontend/settlement.test.mjs` checks the production receipt and postcondition module with Node's test runner. `mutation_check.py` runs the actual contract suite against one-change mutants; collection failures do not count as killed.
