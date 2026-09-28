from conftest import (
    WEI,
    application_key,
    create_campaign,
    fund_campaign,
    judge_application,
    submit_application,
)


def test_approved_verdict_reserves_exact_reward(
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
        5 * WEI,
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
    assert airjudge.application_status[key] == "ELIGIBLE_RESERVED"
    assert int(airjudge.pending_payouts[key]) == 2 * WEI
    assert int(airjudge.campaign_reserved_wei[campaign_id]) == 2 * WEI


def test_rejected_verdict_changes_state_without_reserving(
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
        5 * WEI,
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
        eligible=False,
    )
    key = application_key(airjudge, campaign_id, direct_alice)
    assert airjudge.application_status[key] == "NOT_ELIGIBLE"
    assert int(airjudge.campaign_reserved_wei[campaign_id]) == 0


def test_application_cannot_be_judged_twice(
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
        eligible=False,
    )
    with direct_vm.expect_revert("application already judged"):
        airjudge.judge_application(campaign_id, str(direct_alice))


def test_application_cannot_be_judged_after_campaign_closes(
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
    submit_application(
        airjudge,
        direct_vm,
        direct_alice,
        campaign_id,
    )
    direct_vm.sender = direct_owner
    airjudge.set_campaign_active(campaign_id, False)

    with direct_vm.expect_revert("campaign is closed"):
        airjudge.judge_application(campaign_id, str(direct_alice))
