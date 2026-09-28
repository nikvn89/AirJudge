from conftest import (
    application_key,
    create_campaign,
    submit_application,
)


def test_application_requires_active_campaign(
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
    direct_vm.sender = direct_owner
    airjudge.set_campaign_active(campaign_id, False)

    with direct_vm.expect_revert("campaign is closed"):
        submit_application(
            airjudge,
            direct_vm,
            direct_alice,
            campaign_id,
        )


def test_one_application_per_campaign_and_wallet(
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

    with direct_vm.expect_revert("application already exists"):
        submit_application(
            airjudge,
            direct_vm,
            direct_alice,
            campaign_id,
            suffix="second",
        )


def test_evidence_reuse_is_blocked_and_marker_is_wallet_bound(
    airjudge,
    direct_vm,
    direct_owner,
    direct_alice,
    direct_bob,
):
    campaign_id = create_campaign(
        airjudge,
        direct_vm,
        direct_owner,
    )
    _, evidence_url = submit_application(
        airjudge,
        direct_vm,
        direct_alice,
        campaign_id,
    )

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert(
        "this evidence has already been submitted"
    ):
        airjudge.submit_application(
            campaign_id,
            "A second sufficiently long contribution description.",
            "https://proof.example/bob",
            evidence_url,
        )

    key = application_key(
        airjudge,
        campaign_id,
        direct_alice,
    )
    assert airjudge.application_proof_marker[key] == (
        f"AIRJUDGE_PROOF:{campaign_id}:{str(direct_alice).lower()}"
    )


def test_campaign_creator_cannot_apply(
    airjudge,
    direct_vm,
    direct_owner,
):
    campaign_id = create_campaign(
        airjudge,
        direct_vm,
        direct_owner,
    )
    with direct_vm.expect_revert("campaign creator cannot apply"):
        submit_application(
            airjudge,
            direct_vm,
            direct_owner,
            campaign_id,
        )
