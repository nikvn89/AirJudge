from conftest import (
    WEI,
    application_key,
    close_campaign,
    create_campaign,
    fund_campaign,
    judge_application,
    submit_application,
)


def _approved_campaign(
    contract,
    vm,
    creator,
    applicant,
    reward=WEI,
    funded=10 * WEI,
):
    campaign_id = create_campaign(
        contract,
        vm,
        creator,
        reward_wei=reward,
    )
    fund_campaign(
        contract,
        vm,
        creator,
        campaign_id,
        funded,
    )
    proof_url, evidence_url = submit_application(
        contract,
        vm,
        applicant,
        campaign_id,
    )
    judge_application(
        contract,
        vm,
        creator,
        applicant,
        campaign_id,
        proof_url,
        evidence_url,
        eligible=True,
    )
    return campaign_id


def test_active_campaign_cannot_reclaim(
    airjudge,
    direct_vm,
    direct_owner,
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
        WEI,
    )
    with direct_vm.expect_revert(
        "close the campaign before reclaiming"
    ):
        airjudge.reclaim_unused_pool(campaign_id)


def test_only_creator_can_reclaim(
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
        WEI,
    )
    close_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
    )
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert(
        "only campaign creator can reclaim pool"
    ):
        airjudge.reclaim_unused_pool(campaign_id)


def test_unknown_campaign_cannot_reclaim(
    airjudge,
    direct_vm,
):
    with direct_vm.expect_revert("campaign does not exist"):
        airjudge.reclaim_unused_pool("missing")


def test_nothing_to_reclaim_when_pool_equals_reserved(
    airjudge,
    direct_vm,
    direct_owner,
):
    campaign_id = create_campaign(
        airjudge,
        direct_vm,
        direct_owner,
    )
    close_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
    )
    with direct_vm.expect_revert("nothing to reclaim"):
        airjudge.reclaim_unused_pool(campaign_id)


def test_reclaim_sets_pool_to_reserved_and_preserves_reserved(
    airjudge,
    direct_vm,
    direct_owner,
    direct_alice,
):
    campaign_id = _approved_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        direct_alice,
    )
    close_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
    )
    pool_before = int(airjudge.campaign_pool_wei[campaign_id])
    reserved_before = int(airjudge.campaign_reserved_wei[campaign_id])

    airjudge.reclaim_unused_pool(campaign_id)

    assert pool_before - reserved_before == 9 * WEI
    assert int(airjudge.campaign_pool_wei[campaign_id]) == reserved_before
    assert int(airjudge.campaign_reserved_wei[campaign_id]) == reserved_before


def test_approved_applicant_withdraws_after_creator_reclaim(
    airjudge,
    direct_vm,
    direct_owner,
    direct_alice,
):
    campaign_id = _approved_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        direct_alice,
    )
    close_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
    )
    airjudge.reclaim_unused_pool(campaign_id)

    key = application_key(airjudge, campaign_id, direct_alice)
    direct_vm.sender = direct_alice
    airjudge.withdraw(campaign_id)

    assert int(airjudge.pending_payouts[key]) == 0
    assert int(airjudge.campaign_pool_wei[campaign_id]) == 0
    assert int(airjudge.campaign_reserved_wei[campaign_id]) == 0
    assert airjudge.application_status[key] == "ELIGIBLE_PAID"


def test_second_reclaim_is_rejected(
    airjudge,
    direct_vm,
    direct_owner,
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
    close_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
    )
    airjudge.reclaim_unused_pool(campaign_id)

    with direct_vm.expect_revert("nothing to reclaim"):
        airjudge.reclaim_unused_pool(campaign_id)


def test_reopened_campaign_cannot_reserve_after_full_reclaim(
    airjudge,
    direct_vm,
    direct_owner,
    direct_alice,
    direct_bob,
):
    campaign_id = _approved_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        direct_alice,
    )
    close_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
    )
    airjudge.reclaim_unused_pool(campaign_id)

    direct_vm.sender = direct_owner
    airjudge.set_campaign_active(campaign_id, True)
    proof_url, evidence_url = submit_application(
        airjudge,
        direct_vm,
        direct_bob,
        campaign_id,
        suffix="bob",
    )
    judge_application(
        airjudge,
        direct_vm,
        direct_owner,
        direct_bob,
        campaign_id,
        proof_url,
        evidence_url,
        eligible=True,
    )
    bob_key = application_key(airjudge, campaign_id, direct_bob)
    assert airjudge.application_status[bob_key] == "ELIGIBLE_UNDERFUNDED"
    assert int(airjudge.campaign_reserved_wei[campaign_id]) == WEI
