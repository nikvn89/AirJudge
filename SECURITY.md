# Security model

## Trust boundary

AirJudge keeps authorization, campaign lifecycle, reward capacity, reservation, and payout accounting deterministic. Validators only resolve external proof/evidence content and the qualitative eligibility verdict. Applicant claims and rendered evidence are untrusted prompt inputs.

## Tested invariants

- Only the campaign creator can fund, pause, reopen, or reclaim its pool.
- A reservation can be released only after its 30-day claim window, only once, and releasing it changes `reserved` and the applicant's pending payout, never `pool`.
- An underfunded eligible application is reserved only when `available >= reward`.
- Evidence already used in a campaign cannot be reused through a URL variant.
- Reclaim is impossible while a campaign is active.
- Reclaimable value is `max(pool - reserved, 0)`.
- Reclaim sets `pool = reserved` and never writes `campaign_reserved_wei`.
- A reserved applicant can still withdraw after creator reclaim.
- A payout is reserved only when the available pool covers the configured reward.
- Withdrawal clears pending value and reduces both pool and reserved exactly once.
- Across the tested lifecycle, funded value equals reclaimed value plus withdrawn value plus the remaining pool.

The Direct Mode suite exercises these properties against the production contract and kills all 22 defined mutants. The boundary of that evidence is documented in `tests/README.md`.

## Closed in v1.3

- **Reserved rewards had no expiry** (open in v1.2). A reservation now has a 30-day claim window counted from the transaction date that created it; afterwards anyone may release it to the available pool. Releasing never touches the pool, never pays anyone, and never touches another applicant's reservation. Until it is released the applicant can still withdraw. (`test_reservation_cannot_be_released_inside_the_window`, `test_anyone_may_release_on_day_thirty_and_the_pool_is_untouched`, mutants `release_window_off_by_one`, `release_without_window`, `release_keeps_reserved`, `release_keeps_pending_payout`.)
- **One contribution could be paid twice through URL variants.** The replay key now ignores scheme, `www.`, query, fragment, letter case and trailing slashes. (`test_url_variant_of_used_evidence_is_refused`, five variants that each fail on v1.2.)
- **Fence markers in lower case or nested form reached the adjudication input.** Fixed-point, case-insensitive strip. (`test_fence_strip_is_case_insensitive_and_fixed_point`, `test_adjudication_input_carries_no_injected_markers`.)
- **Eligible applicants judged while the pool was short were stuck.** `reserve_underfunded` reserves them once funds exist. (`test_underfunded_application_is_reserved_once_funds_arrive`, `test_expired_reservation_funds_the_next_eligible_contributor`.)

## Known limitations — open

- The claim window is fixed at 30 days for every campaign; it is not configurable per campaign.
- Two distinct URLs that show the same contribution (a pull request and its `/files` tab, a redirect or short link) are still two pieces of evidence. The proof page must bind the exact URL, and each wallet may apply once per campaign, but the canonical identity does not follow redirects.
- Reservation order is first come, first served: when several underfunded applicants wait, whoever triggers `reserve_underfunded` first is reserved first.

External evidence can change or disappear before validators fetch it. AirJudge commits the exact consensus-reviewed snapshot after retrieval, but does not establish universal authorship or detect plagiarism across the web.

## Accepted by design

- One application is allowed per `(campaign, applicant)`.
- One evidence URL is allowed per campaign.
- Closing a campaign stops submission and judging, and is the explicit prerequisite for reclaiming unused pool value.
- Direct Mode cannot observe the native outbound transfer; StudioNet transaction evidence is required for that boundary.
