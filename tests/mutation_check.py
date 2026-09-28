"""Run the full Direct Mode suite against one-change contract mutants."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "airjudge.py"


@dataclass(frozen=True)
class Mutant:
    name: str
    old: str
    new: str


MUTANTS = [
    Mutant(
        "reclaim_without_creator_gate",
        """        if (\n            sender.lower()\n            != creator.lower()\n        ):\n            raise gl.vm.UserError(\n                \"only campaign creator can reclaim pool\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"only campaign creator can reclaim pool\"\n            )""",
    ),
    Mutant(
        "reclaim_without_inactive_gate",
        """        if self.campaign_active[\n            campaign_id\n        ]:\n            raise gl.vm.UserError(\n                \"close the campaign before reclaiming\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"close the campaign before reclaiming\"\n            )""",
    ),
    Mutant(
        "reclaim_zeroes_reserved_pool",
        """        self.campaign_pool_wei[campaign_id] = (\n            reserved_wei\n        )\n\n        payout = NativePayout(""",
        """        self.campaign_pool_wei[campaign_id] = (\n            u256(0)\n        )\n\n        payout = NativePayout(""",
    ),
    Mutant(
        "reclaim_without_zero_available_gate",
        """        if available_wei == u256(0):\n            raise gl.vm.UserError(\n                \"nothing to reclaim\"\n            )\n\n        self.campaign_pool_wei[campaign_id]""",
        """        if False:\n            raise gl.vm.UserError(\n                \"nothing to reclaim\"\n            )\n\n        self.campaign_pool_wei[campaign_id]""",
    ),
    Mutant(
        "duplicate_campaign_allowed",
        """        if self.campaign_exists.get(\n            campaign_id,\n            False,\n        ):\n            raise gl.vm.UserError(\n                \"campaign already exists\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"campaign already exists\"\n            )""",
    ),
    Mutant(
        "set_active_without_creator_gate",
        """        if (\n            sender.lower()\n            != creator.lower()\n        ):\n            raise gl.vm.UserError(\n                \"only campaign creator can update campaign\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"only campaign creator can update campaign\"\n            )""",
    ),
    Mutant(
        "fund_without_creator_gate",
        """        if (\n            sender.lower()\n            != creator.lower()\n        ):\n            raise gl.vm.UserError(\n                \"only campaign creator can fund campaign\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"only campaign creator can fund campaign\"\n            )""",
    ),
    Mutant(
        "zero_funding_allowed",
        """        if amount == u256(0):\n            raise gl.vm.UserError(\n                \"fund amount must be greater than zero\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"fund amount must be greater than zero\"\n            )""",
    ),
    Mutant(
        "application_allowed_when_closed",
        """        if not self.campaign_active[\n            campaign_id\n        ]:\n            raise gl.vm.UserError(\n                \"campaign is closed\"\n            )\n\n        description = description.strip()""",
        """        if False:\n            raise gl.vm.UserError(\n                \"campaign is closed\"\n            )\n\n        description = description.strip()""",
    ),
    Mutant(
        "duplicate_application_allowed",
        """        if self.application_exists.get(\n            key,\n            False,\n        ):\n            raise gl.vm.UserError(\n                \"application already exists\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"application already exists\"\n            )""",
    ),
    Mutant(
        "reused_evidence_allowed",
        """        if self.evidence_used.get(\n            evidence_key,\n            False,\n        ):\n            raise gl.vm.UserError(\n                \"this evidence has already been \"""",
        """        if False:\n            raise gl.vm.UserError(\n                \"this evidence has already been \"""",
    ),
    Mutant(
        "creator_can_apply",
        """        if (\n            applicant.lower()\n            == creator.lower()\n        ):\n            raise gl.vm.UserError(\n                \"campaign creator cannot apply\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"campaign creator cannot apply\"\n            )""",
    ),
    Mutant(
        "judging_allowed_when_closed",
        """        if not self.campaign_active[\n            campaign_id\n        ]:\n            raise gl.vm.UserError(\n                \"campaign is closed\"\n            )\n\n        key = self._application_key(""",
        """        if False:\n            raise gl.vm.UserError(\n                \"campaign is closed\"\n            )\n\n        key = self._application_key(""",
    ),
    Mutant(
        "application_can_be_judged_twice",
        """        if (\n            self.application_status[key]\n            != \"PENDING\"\n        ):\n            raise gl.vm.UserError(\n                \"application already judged\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"application already judged\"\n            )""",
    ),
    Mutant(
        "proof_verification_inverted",
        """        if not proof_verified:\n\n            self.application_status[""",
        """        if proof_verified:\n\n            self.application_status[""",
    ),
    Mutant(
        "reward_capacity_comparison_inverted",
        """        if available_wei >= reward_wei:\n\n            self.campaign_reserved_wei[""",
        """        if available_wei < reward_wei:\n\n            self.campaign_reserved_wei[""",
    ),
    Mutant(
        "reserved_not_incremented",
        """                reserved_wei\n                + reward_wei\n            )\n\n            self.pending_payouts[""",
        """                reserved_wei\n                + u256(0)\n            )\n\n            self.pending_payouts[""",
    ),
    Mutant(
        "pending_payout_not_recorded",
        """            self.pending_payouts[\n                key\n            ] = reward_wei""",
        """            self.pending_payouts[\n                key\n            ] = u256(0)""",
    ),
    Mutant(
        "withdraw_without_zero_pending_gate",
        """        if amount_wei == u256(0):\n            raise gl.vm.UserError(\n                \"nothing to withdraw\"\n            )""",
        """        if False:\n            raise gl.vm.UserError(\n                \"nothing to withdraw\"\n            )""",
    ),
    Mutant(
        "withdraw_does_not_clear_pending",
        """        self.pending_payouts[\n            key\n        ] = u256(0)""",
        """        self.pending_payouts[\n            key\n        ] = amount_wei""",
    ),
    Mutant(
        "withdraw_does_not_release_reserved",
        """            reserved_wei\n            - amount_wei\n        )\n\n        self.campaign_pool_wei[""",
        """            reserved_wei\n            - u256(0)\n        )\n\n        self.campaign_pool_wei[""",
    ),
    Mutant(
        "withdraw_does_not_reduce_pool",
        """            pool_wei\n            - amount_wei\n        )\n\n        self.application_status[""",
        """            pool_wei\n            - u256(0)\n        )\n\n        self.application_status[""",
    ),
]


def mutate(source: str, mutant: Mutant) -> str:
    count = source.count(mutant.old)
    if count != 1:
        raise RuntimeError(
            f"{mutant.name}: expected one mutation target, found {count}"
        )
    return source.replace(mutant.old, mutant.new, 1)


def run_suite(contract_path: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["AIRJUDGE_CONTRACT_PATH"] = str(contract_path)
    return subprocess.run(
        [sys.executable, "-m", "pytest", "tests", "-q"],
        cwd=ROOT,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def main() -> int:
    source = CONTRACT.read_text(encoding="utf-8")
    killed: list[str] = []
    survived: list[str] = []

    baseline = run_suite(CONTRACT)
    if baseline.returncode != 0:
        print("BASELINE FAILED")
        print(baseline.stdout)
        return 2

    with tempfile.TemporaryDirectory(prefix="airjudge-mutants-") as tmp:
        tmp_dir = Path(tmp)
        for index, mutant in enumerate(MUTANTS, start=1):
            mutant_path = tmp_dir / f"mutant_{index:02d}.py"
            mutant_path.write_text(mutate(source, mutant), encoding="utf-8")
            result = run_suite(mutant_path)
            if result.returncode == 0:
                survived.append(mutant.name)
                outcome = "SURVIVED"
            else:
                killed.append(mutant.name)
                outcome = "KILLED"
            print(f"[{index:02d}/{len(MUTANTS):02d}] {outcome}: {mutant.name}")

    print(
        f"Mutation score: {len(killed)}/{len(MUTANTS)} killed "
        f"({100 * len(killed) / len(MUTANTS):.1f}%)"
    )
    if survived:
        print("Survivors:")
        for name in survived:
            print(f"- {name}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
