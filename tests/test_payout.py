from hypothesis import HealthCheck, given, settings, strategies as st

import json

from conftest import (
    WEI,
    close_campaign,
    application_key,
    create_campaign,
    fund_campaign,
    judge_application,
    submit_application,
)


def test_available_clamps_to_zero_if_storage_is_inconsistent(
    airjudge,
    direct_vm,
    direct_owner,
):
    campaign_id = create_campaign(
        airjudge,
        direct_vm,
        direct_owner,
    )
    airjudge.campaign_pool_wei[campaign_id] = 1
    airjudge.campaign_reserved_wei[campaign_id] = 2
    status = json.loads(airjudge.get_campaign_pool_status(campaign_id))
    assert int(status["available_wei"]) == 0


def test_reward_is_not_reserved_beyond_available_pool(
    airjudge,
    direct_vm,
    direct_owner,
    direct_alice,
):
    campaign_id = create_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        reward_wei=2 * WEI,
    )
    fund_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
        WEI,
    )
    proof_url, evidence_url = submit_application(
        airjudge,
        direct_vm,
        direct_alice,
        campaign_id,
    )
    judge_application(
        airjudge,
        direct_vm,
        direct_owner,
        direct_alice,
        campaign_id,
        proof_url,
        evidence_url,
        eligible=True,
    )
    key = application_key(airjudge, campaign_id, direct_alice)
    assert airjudge.application_status[key] == "ELIGIBLE_UNDERFUNDED"
    assert int(airjudge.campaign_reserved_wei[campaign_id]) == 0
    assert int(airjudge.pending_payouts.get(key, 0)) == 0


def test_withdraw_is_one_time_and_requires_pending_value(
    airjudge,
    direct_vm,
    direct_owner,
    direct_alice,
):
    campaign_id = create_campaign(
        airjudge,
        direct_vm,
        direct_owner,
    )
    fund_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
        2 * WEI,
    )
    proof_url, evidence_url = submit_application(
        airjudge,
        direct_vm,
        direct_alice,
        campaign_id,
    )
    judge_application(
        airjudge,
        direct_vm,
        direct_owner,
        direct_alice,
        campaign_id,
        proof_url,
        evidence_url,
        eligible=True,
    )
    key = application_key(airjudge, campaign_id, direct_alice)
    direct_vm.sender = direct_alice
    airjudge.withdraw(campaign_id)
    assert int(airjudge.pending_payouts[key]) == 0
    assert int(airjudge.campaign_reserved_wei[campaign_id]) == 0
    assert int(airjudge.campaign_pool_wei[campaign_id]) == WEI
    assert airjudge.application_status[key] == "ELIGIBLE_PAID"

    with direct_vm.expect_revert("nothing to withdraw"):
        airjudge.withdraw(campaign_id)


@st.composite
def funded_reward_pairs(draw):
    funded = draw(st.integers(min_value=2, max_value=10_000))
    reward = draw(st.integers(min_value=1, max_value=funded - 1))
    return funded, reward


@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
@given(pair=funded_reward_pairs())
def test_accounting_conservation_property(
    pair,
    airjudge,
    direct_vm,
    direct_owner,
    direct_alice,
):
    funded, reward = pair
    snapshot = direct_vm.snapshot()
    try:
        campaign_id = create_campaign(
            airjudge,
            direct_vm,
            direct_owner,
            campaign_id=f"property-{funded}-{reward}",
            reward_wei=reward,
        )
        fund_campaign(
            airjudge,
            direct_vm,
            direct_owner,
            campaign_id,
            funded,
        )
        proof_url, evidence_url = submit_application(
            airjudge,
            direct_vm,
            direct_alice,
            campaign_id,
        )
        judge_application(
            airjudge,
            direct_vm,
            direct_owner,
            direct_alice,
            campaign_id,
            proof_url,
            evidence_url,
            eligible=True,
        )

        reserved_before = int(airjudge.campaign_reserved_wei[campaign_id])
        close_campaign(
            airjudge,
            direct_vm,
            direct_owner,
            campaign_id,
        )
        airjudge.reclaim_unused_pool(campaign_id)
        pool_after_reclaim = int(airjudge.campaign_pool_wei[campaign_id])
        reserved_after_reclaim = int(
            airjudge.campaign_reserved_wei[campaign_id]
        )
        reclaimed = funded - pool_after_reclaim

        direct_vm.sender = direct_alice
        airjudge.withdraw(campaign_id)
        pool_after_withdraw = int(airjudge.campaign_pool_wei[campaign_id])
        reserved_after_withdraw = int(
            airjudge.campaign_reserved_wei[campaign_id]
        )

        assert reserved_before == reward
        assert pool_after_reclaim == reserved_after_reclaim == reward
        assert reserved_after_withdraw == 0
        assert funded == reclaimed + reward + pool_after_withdraw
    finally:
        direct_vm.revert(snapshot)
