from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from backend.metta.adapter import reason
from backend.metta.omega import reset_agent
from backend.metta.schemas import AgentIn, EvidenceIn, ReasonRequest, RequestIn

DEMO_ID = "traderbot-01"


def _base_agent(**kwargs) -> AgentIn:
    data = dict(
        id=DEMO_ID,
        identity="verified",
        stake=1000,
        reputation=850,
        successful=100,
        failed=2,
        violations=0,
        transactionLimit=400,
        status="active",
        wallet="0xabc",
    )
    data.update(kwargs)
    return AgentIn(**data)


def _req(agent: AgentIn, amount: int, evidence=None, recipient="wallet-123", persist=False, **kwargs) -> ReasonRequest:
    extra = kwargs.pop("request", {})
    return ReasonRequest(
        agent=agent,
        request=RequestIn(type="transfer", amount=amount, recipient=recipient, **extra),
        evidence=evidence or [],
        persistOmega=persist,
    )


@pytest.fixture(autouse=True)
def clean_omega():
    reset_agent(DEMO_ID)
    reset_agent("agent-b")
    yield
    reset_agent(DEMO_ID)
    reset_agent("agent-b")


def test_verified_valid_transfer_approves():
    out = reason(_req(_base_agent(), 100, [EvidenceIn(id="e1", verified=True, confidence=0.95)], persist=False))
    assert out.decision in {"approve", "approve-with-limit"}
    assert out.violation == "none"
    assert out.slashPercentage == 0


def test_unverified_challenges_or_rejects():
    out = reason(_req(_base_agent(identity="unverified"), 100, persist=False))
    assert out.decision in {"challenge", "reject"}


def test_over_limit_is_unauthorized():
    out = reason(
        _req(
            _base_agent(),
            900,
            [EvidenceIn(id="e1", verified=True, confidence=0.98)],
            persist=False,
        )
    )
    assert out.violation == "unauthorized-transfer"


def test_strong_evidence_slashes_thirty_percent():
    out = reason(
        _req(
            _base_agent(),
            900,
            [EvidenceIn(id="evidence-001", verified=True, confidence=0.98)],
            persist=False,
        )
    )
    assert out.decision == "slash"
    assert out.severity == "high"
    assert out.slashPercentage == 30
    assert out.remainingStake == 700
    assert out.recommendedReputationChange == -240
    assert out.recommendedTransactionLimit == 100


def test_weak_evidence_investigates_instead_of_slash():
    out = reason(
        _req(
            _base_agent(),
            900,
            [EvidenceIn(id="e1", verified=False, confidence=0.4)],
            persist=False,
        )
    )
    assert out.decision == "investigate"
    assert out.slashPercentage == 0


def test_conflicting_evidence_investigates():
    out = reason(
        _req(
            _base_agent(),
            900,
            [
                EvidenceIn(id="a", verified=True, confidence=0.9, claimsAuthorized=True),
                EvidenceIn(id="b", verified=True, confidence=0.9, claimsInvalidSignature=True),
            ],
            persist=False,
        )
    )
    assert out.decision == "investigate"
    assert out.evidenceStatus == "conflicting-evidence"


def test_previous_violation_increases_risk():
    first = reason(
        _req(
            _base_agent(),
            900,
            [EvidenceIn(id="e1", verified=True, confidence=0.98)],
            persist=True,
        )
    )
    assert first.decision == "slash"
    second = reason(
        _req(
            _base_agent(transactionLimit=100, violations=1, stake=700, reputation=610),
            300,
            [EvidenceIn(id="e2", verified=True, confidence=0.95)],
            persist=False,
        )
    )
    assert second.decision in {"reject", "limit", "approve-with-limit"}
    assert second.omegaMemoriesUsed


def test_repeated_violations_progress_penalty():
    reason(
        _req(_base_agent(), 900, [EvidenceIn(id="e1", verified=True, confidence=0.98)], persist=True)
    )
    out = reason(
        _req(
            _base_agent(violations=1, stake=700, transactionLimit=100),
            900,
            [EvidenceIn(id="e2", verified=True, confidence=0.98)],
            persist=False,
        )
    )
    assert out.slashPercentage >= 40 or out.decision == "suspend"


def test_successful_behavior_recovers_reputation():
    out = reason(_req(_base_agent(), 80, [EvidenceIn(id="e1", verified=True, confidence=0.9)], persist=False))
    assert out.recommendedReputationChange >= 0


def test_slash_math_1000_to_700():
    out = reason(
        _req(_base_agent(), 900, [EvidenceIn(id="e1", verified=True, confidence=0.98)], persist=False)
    )
    assert out.slashAmount == 300
    assert out.remainingStake == 700


def test_post_slash_limit_decreases():
    out = reason(
        _req(_base_agent(), 900, [EvidenceIn(id="e1", verified=True, confidence=0.98)], persist=False)
    )
    assert out.recommendedTransactionLimit == 100
    assert out.recommendedTransactionLimit < 400


def test_omega_changes_future_decision():
    before = reason(_req(_base_agent(), 300, [EvidenceIn(id="e0", verified=True, confidence=0.95)], persist=False))
    reason(
        _req(_base_agent(), 900, [EvidenceIn(id="e1", verified=True, confidence=0.98)], persist=True)
    )
    after = reason(
        _req(
            _base_agent(transactionLimit=100, stake=700, reputation=610, violations=1),
            300,
            [EvidenceIn(id="e2", verified=True, confidence=0.95)],
            persist=False,
        )
    )
    assert before.decision in {"approve", "approve-with-limit"}
    assert after.decision in {"reject", "challenge", "approve-with-limit", "limit"}
    assert after.decision != "slash" or after.omegaMemoriesUsed


def test_insufficient_stake_rejects_or_limits():
    out = reason(_req(_base_agent(stake=10), 40, persist=False))
    assert out.decision in {"reject", "challenge"}


def test_revoked_identity_rejects():
    out = reason(_req(_base_agent(identity="revoked"), 50, persist=False))
    assert out.decision == "reject"
    assert out.violation == "identity-mismatch"


def test_missing_recipient_challenges():
    out = reason(
        _req(
            _base_agent(),
            100,
            [EvidenceIn(id="e1", verified=True, confidence=0.9)],
            recipient=None,
            persist=False,
        )
    )
    assert out.decision == "challenge"
    assert out.missingInformation


def test_end_to_end_accountability_simulation():
    first = reason(
        _req(_base_agent(), 900, [EvidenceIn(id="evidence-001", verified=True, confidence=0.98)], persist=True)
    )
    assert first.decision == "slash"
    assert first.remainingStake == 700
    second = reason(
        _req(
            _base_agent(stake=700, reputation=610, violations=1, transactionLimit=100),
            300,
            [EvidenceIn(id="e2", verified=True, confidence=0.95)],
            persist=True,
        )
    )
    assert second.decision in {"reject", "approve-with-limit"}
    assert second.omegaMemoriesUsed


def test_repeatability_same_inputs_same_decision():
    for _ in range(8):
        reset_agent(DEMO_ID)
        ok = reason(_req(_base_agent(), 100, [EvidenceIn(id="e1", verified=True, confidence=0.95)], persist=False))
        slash = reason(_req(_base_agent(), 900, [EvidenceIn(id="e1", verified=True, confidence=0.98)], persist=False))
        weak = reason(_req(_base_agent(), 900, [EvidenceIn(id="e1", verified=False, confidence=0.4)], persist=False))
        assert ok.decision in {"approve", "approve-with-limit"}
        assert slash.decision == "slash"
        assert slash.remainingStake == 700
        assert weak.decision == "investigate"


def test_standings_overlay_moves_after_slash():
    from backend.metta.omega import standings

    reset_agent(DEMO_ID)
    reason(_req(_base_agent(), 900, [EvidenceIn(id="e1", verified=True, confidence=0.98)], persist=True))
    row = standings()["agents"][DEMO_ID]
    assert row["lastDecision"] == "slash"
    assert row["reputationDelta"] < 0
    assert row["remainingStake"] == 700
    assert row["violationCount"] == 1

