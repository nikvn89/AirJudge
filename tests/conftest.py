import json
import os
import re
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = Path(
    os.environ.get(
        "AIRJUDGE_CONTRACT_PATH",
        ROOT / "contracts" / "airjudge.py",
    )
)
SDK_VERSION = "v0.2.16"
WEI = 10**18


@pytest.fixture
def airjudge(direct_deploy):
    return direct_deploy(
        str(CONTRACT_PATH),
        sdk_version=SDK_VERSION,
    )


def create_campaign(
    contract,
    vm,
    creator,
    campaign_id="campaign-1",
    reward_wei=WEI,
):
    vm.sender = creator
    vm.value = 0
    contract.create_campaign(
        campaign_id,
        "Campaign One",
        "Evidence must demonstrate a concrete contribution.",
        reward_wei,
    )
    return campaign_id


def fund_campaign(
    contract,
    vm,
    creator,
    campaign_id,
    amount_wei,
):
    vm.sender = creator
    vm.value = amount_wei
    contract.fund_campaign(campaign_id)
    vm.deal(vm._contract_address, int(contract.campaign_pool_wei[campaign_id]))
    vm.value = 0


def submit_application(
    contract,
    vm,
    applicant,
    campaign_id,
    suffix="one",
):
    proof_url = f"https://proof.example/{suffix}"
    evidence_url = f"https://evidence.example/{suffix}"
    vm.sender = applicant
    vm.value = 0
    contract.submit_application(
        campaign_id,
        "This contribution includes concrete public implementation evidence.",
        proof_url,
        evidence_url,
    )
    return proof_url, evidence_url


def judge_application(
    contract,
    vm,
    caller,
    applicant,
    campaign_id,
    proof_url,
    evidence_url,
    eligible=True,
):
    marker = contract._proof_marker(campaign_id, str(applicant))
    vm.clear_mocks()
    vm.mock_web(
        re.escape(proof_url),
        {
            "status": 200,
            "body": f"{marker}\nevidence_url:{evidence_url}",
        },
    )
    vm.mock_web(
        re.escape(evidence_url),
        {
            "status": 200,
            "body": "Public implementation evidence with reproducible results.",
        },
    )
    verdict = "ELIGIBLE" if eligible else "NOT_ELIGIBLE"
    injected_result = json.dumps(
        {
            "verdict": verdict,
            "reason": "Injected Direct Mode verdict.",
        }
    )

    # Direct Mode executes production contract code but does not run validator
    # consensus. Inject the equivalence-principle result at that exact SDK
    # boundary; web reads above still exercise strict_eq with deterministic
    # mocks. No application or settlement logic is copied into the tests.
    instance = object.__getattribute__(contract, "_instance")
    contract_module = sys.modules[type(instance).__module__]
    eq_principle = contract_module.gl.eq_principle
    original_prompt = eq_principle.prompt_non_comparative
    eq_principle.prompt_non_comparative = (
        lambda _get_input, *, task, criteria: injected_result
    )
    try:
        vm.sender = caller
        vm.value = 0
        contract.judge_application(campaign_id, str(applicant))
    finally:
        eq_principle.prompt_non_comparative = original_prompt
        vm.clear_mocks()


def close_campaign(contract, vm, creator, campaign_id):
    vm.sender = creator
    vm.value = 0
    contract.set_campaign_active(campaign_id, False)


def application_key(contract, campaign_id, applicant):
    return contract._application_key(campaign_id, str(applicant))
