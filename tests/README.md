# Direct Mode test boundary

The suite loads `contracts/airjudge.py` itself with `genlayer-test==0.29.2` and pins GenVM SDK `v0.2.16`. No settlement or authorization implementation is copied into test doubles.

Three limits are explicit:

- Direct Mode does not expose the outbound `NativePayout.emit_transfer` message. Tests verify every deterministic effect before that boundary: authorization, pool/reserved/pending arithmetic, and state transitions. A fresh StudioNet runtime matrix must prove actual GEN movement.
- Direct Mode does not reproduce validator consensus. The suite injects the return value at `prompt_non_comparative`, then checks how the production contract handles the verdict. `strict_eq` web results are deterministic mocks.
- Tests never fetch the public web. `gl.nondet.web.render` receives fixed proof and evidence responses from the VM mock layer.

## Coverage

- `test_campaign.py`: creation, lifecycle, funding gates.
- `test_application.py`: active gate, creator exclusion, per-wallet latch, evidence replay, proof marker.
- `test_judging.py`: injected eligible/rejected verdicts, reservation, closed gate, repeat gate.
- `test_payout.py`: available clamp, underfunding, one-time withdrawal, and contract-driven Hypothesis accounting conservation.
- `test_reclaim.py`: all reclaim gates, protected reservation, post-reclaim withdrawal, repeat call, reopening behavior.
- `test_authorization.py`: foreign-wallet controls.
- `test_v13_settlement.py` (v1.3): the transaction-day clock against the calendar, the 30-day claim window and permissionless release, late reservation of underfunded applications, released value funding the next applicant and the creator's reclaim, accounting across all of it, five evidence-URL variants that v1.2 accepted, the fixed-point fence on the real adjudication input, and exact wei strings beyond 2^53.

v1.3 adds 16 mutants (38 in total). The first v1.3 run killed 37/38: a fence mutant (markers removed without a gap, in a single pass) survived because no test combined two markers so that removing one rebuilt the other; `<CLA</EVIDENCE>IM>` was added and the final score is 38/38.

The first v1.2 mutation run killed 20/22. `creator_can_apply` survived because creator exclusion had no dedicated test; `judging_allowed_when_closed` survived because only submission-after-close was covered. Regression tests were added for both. The v1.2 score was 22/22 killed.

Run:

```bash
python3 -m pytest tests/ -q
python3 tests/mutation_check.py
```
