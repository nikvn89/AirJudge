"""Reject malformed semantic output without altering an application or treasury."""
import json
import pytest
from conftest import WEI, create_campaign, fund_campaign, submit_application, judge_application

INVALID_RESULTS = [
    "not json", "null", "[]", "true", "42",
    '{"verdict":"ELIGIBLE"}',
    '{"verdict":"ELIGIBLE","reason":""}',
    '{"verdict":"ELIGIBLE","reason":"   "}',
    '{"verdict":"ELIGIBLE","reason":true}',
    '{"verdict":"ELIGIBLE","reason":[]}',
    '{"verdict":"eligible","reason":"wrong case"}',
    '{"verdict":"UNCERTAIN","reason":"uncertain"}',
    '{"verdict":"ELIGIBLE","reason":"ok","extra":1}',
    '{"verdict":"NOT_ELIGIBLE","verdict":"ELIGIBLE","reason":"duplicate"}',
    'prefix {"verdict":"ELIGIBLE","reason":"wrapped"} suffix',
    '{"verdict":"ELIGIBLE","reason":"trailing comma",}',
    json.dumps({"verdict":"ELIGIBLE","reason":"x" * 241}),
    '[["verdict","ELIGIBLE"],["reason","array pretending to be an object"]]',
]

@pytest.mark.parametrize("raw", INVALID_RESULTS)
def test_malformed_verdict_rolls_back_before_any_commit(airjudge,direct_vm,direct_owner,direct_alice,raw):
    c, vm, owner, alice = airjudge,direct_vm,direct_owner,direct_alice
    cid=create_campaign(c,vm,owner)
    fund_campaign(c,vm,owner,cid,2*WEI)
    proof,evidence=submit_application(c,vm,alice,cid)
    before=(c.get_campaign_pool_status(cid),c.get_application_status(cid,str(alice)),
            c.get_pending_payout(cid,str(alice)),c.get_application_reason(cid,str(alice)),
            c.get_reviewed_snapshot(cid,str(alice)),c.get_payout_window(cid,str(alice)))
    with vm.expect_revert("invalid semantic result"):
        judge_application(c,vm,owner,alice,cid,proof,evidence,raw_result=raw)
    after=(c.get_campaign_pool_status(cid),c.get_application_status(cid,str(alice)),
           c.get_pending_payout(cid,str(alice)),c.get_application_reason(cid,str(alice)),
           c.get_reviewed_snapshot(cid,str(alice)),c.get_payout_window(cid,str(alice)))
    assert after == before

@pytest.mark.parametrize("offset,allowed", [(-1,False),(0,True),(1,True)])
def test_release_exact_utc_boundary(airjudge,direct_vm,direct_owner,direct_alice,direct_bob,offset,allowed):
    import datetime as dt
    from test_v13_settlement import warp
    c,vm,owner,alice,bob=airjudge,direct_vm,direct_owner,direct_alice,direct_bob
    warp(vm,"2026-10-20T23:59:59Z")
    cid=create_campaign(c,vm,owner)
    fund_campaign(c,vm,owner,cid,WEI)
    proof,evidence=submit_application(c,vm,alice,cid)
    judge_application(c,vm,owner,alice,cid,proof,evidence)
    boundary=dt.datetime(2026,11,19,tzinfo=dt.timezone.utc)+dt.timedelta(seconds=offset)
    warp(vm,boundary.isoformat().replace("+00:00","Z"))
    before=c.get_campaign_pool_status(cid)
    vm.sender=bob
    if not allowed:
        with vm.expect_revert("claim window is still open"):
            c.release_expired_reservation(cid,str(alice))
        assert c.get_campaign_pool_status(cid)==before
        assert c.get_application_status(cid,str(alice))=="ELIGIBLE_RESERVED"
    else:
        c.release_expired_reservation(cid,str(alice))
        assert c.get_application_status(cid,str(alice))=="ELIGIBLE_EXPIRED"
        assert json.loads(c.get_campaign_pool_status(cid))=={"pool_wei":str(WEI),"reserved_wei":"0","available_wei":str(WEI)}
        with vm.expect_revert("no reserved reward to release"):
            c.release_expired_reservation(cid,str(alice))
        vm.sender=alice
        with vm.expect_revert("nothing to withdraw"):
            c.withdraw(cid)

@pytest.mark.parametrize("where", ["proof", "evidence", "model"])
def test_provider_failure_preserves_pending_application(airjudge,direct_vm,direct_owner,direct_alice,where):
    import sys
    c,vm,owner,alice=airjudge,direct_vm,direct_owner,direct_alice
    cid=create_campaign(c,vm,owner)
    fund_campaign(c,vm,owner,cid,WEI)
    proof,evidence=submit_application(c,vm,alice,cid)
    instance=object.__getattribute__(c,"_instance")
    sdk=sys.modules[type(instance).__module__].gl
    original_web=sdk.nondet.web.render
    original_prompt=sdk.eq_principle.prompt_non_comparative
    marker=c._proof_marker(cid,str(alice))
    def render(url,**kwargs):
        if (where=="proof" and url==proof) or (where=="evidence" and url==evidence):
            raise RuntimeError("provider unavailable")
        return marker+"\nevidence_url:"+evidence if url==proof else "Concrete implementation evidence"
    def prompt(*args,**kwargs):
        raise RuntimeError("provider unavailable")
    before=(c.get_campaign_pool_status(cid),c.get_application_status(cid,str(alice)),c.get_pending_payout(cid,str(alice)),c.get_reviewed_snapshot(cid,str(alice)))
    sdk.nondet.web.render=render
    sdk.eq_principle.prompt_non_comparative=prompt
    try:
        vm.sender=owner
        reason="provider unavailable" if where=="model" else where+" fetch unavailable"
        with vm.expect_revert(reason):
            c.judge_application(cid,str(alice))
    finally:
        sdk.nondet.web.render=original_web
        sdk.eq_principle.prompt_non_comparative=original_prompt
    after=(c.get_campaign_pool_status(cid),c.get_application_status(cid,str(alice)),c.get_pending_payout(cid,str(alice)),c.get_reviewed_snapshot(cid,str(alice)))
    assert after==before
