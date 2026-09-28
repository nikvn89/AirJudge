from conftest import (
    WEI,
    create_campaign,
    fund_campaign,
)


def test_foreign_wallet_cannot_use_creator_controls(
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

    direct_vm.sender = direct_alice
    direct_vm.value = WEI
    with direct_vm.expect_revert(
        "only campaign creator can fund campaign"
    ):
        airjudge.fund_campaign(campaign_id)

    direct_vm.value = 0
    with direct_vm.expect_revert(
        "only campaign creator can update campaign"
    ):
        airjudge.set_campaign_active(campaign_id, False)

    direct_vm.sender = direct_owner
    airjudge.set_campaign_active(campaign_id, False)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert(
        "only campaign creator can reclaim pool"
    ):
        airjudge.reclaim_unused_pool(campaign_id)


def test_foreign_wallet_cannot_withdraw_another_applicants_reward(
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
    with direct_vm.expect_revert("application does not exist"):
        airjudge.withdraw(campaign_id)
