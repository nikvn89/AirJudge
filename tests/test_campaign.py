from conftest import WEI, create_campaign, fund_campaign


def test_duplicate_campaign_id_is_rejected(
    airjudge,
    direct_vm,
    direct_owner,
):
    create_campaign(airjudge, direct_vm, direct_owner)
    with direct_vm.expect_revert("campaign already exists"):
        create_campaign(airjudge, direct_vm, direct_owner)


def test_creator_controls_campaign_state(
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
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert(
        "only campaign creator can update campaign"
    ):
        airjudge.set_campaign_active(campaign_id, False)

    direct_vm.sender = direct_owner
    airjudge.set_campaign_active(campaign_id, False)
    assert airjudge.campaign_active[campaign_id] is False


def test_funding_is_creator_only_and_nonzero(
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

    direct_vm.sender = direct_alice
    direct_vm.value = WEI
    with direct_vm.expect_revert(
        "only campaign creator can fund campaign"
    ):
        airjudge.fund_campaign(campaign_id)

    direct_vm.sender = direct_owner
    direct_vm.value = 0
    with direct_vm.expect_revert(
        "fund amount must be greater than zero"
    ):
        airjudge.fund_campaign(campaign_id)

    fund_campaign(
        airjudge,
        direct_vm,
        direct_owner,
        campaign_id,
        3 * WEI,
    )
    assert int(airjudge.campaign_pool_wei[campaign_id]) == 3 * WEI
