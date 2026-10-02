"""Load VERIA .metta rules, inject request facts, execute MeTTa, return JSON."""

from __future__ import annotations

from pathlib import Path

from .chain import chain_action_for
from .engine import MeTTaEngine
from .omega import memories_for, remember
from .schemas import ReasonRequest, ReasonResponse

METTA_DIR = Path(__file__).resolve().parents[2] / "metta"
RULE_FILES = [
    "rules.metta",
    "permissions.metta",
    "evidence.metta",
    "violations.metta",
    "reputation.metta",
    "slashing.metta",
    "omega.metta",
    "trust.metta",
    "reasoning.metta",
]


def _load_engine() -> MeTTaEngine:
    engine = MeTTaEngine()
    for name in RULE_FILES:
        engine.load_file(METTA_DIR / name)
    return engine


def _conflicting(req: ReasonRequest) -> bool:
    auth = [e.claimsAuthorized for e in req.evidence if e.claimsAuthorized is not None]
    bad_sig = [e.claimsInvalidSignature for e in req.evidence if e.claimsInvalidSignature is not None]
    if True in auth and True in bad_sig:
        return True
    verified = [e.verified for e in req.evidence]
    if True in verified and False in verified and len(req.evidence) >= 2:
        return True
    return False


def _inject(engine: MeTTaEngine, req: ReasonRequest, omega: dict) -> None:
    agent = req.agent
    request = req.request
    evidence = req.evidence
    verified = [e for e in evidence if e.verified]
    conf = max((e.confidence for e in evidence), default=0.0)
    recipient_known = request.recipientKnown
    if recipient_known is None:
        recipient_known = bool(request.recipient)

    engine.bind("current-identity", agent.identity)
    engine.bind("current-stake", int(agent.stake))
    engine.bind("current-reputation", int(agent.reputation))
    engine.bind("current-successful", int(agent.successful))
    engine.bind("current-failed", int(agent.failed))
    engine.bind("current-violations", int(agent.violations) + int(omega["violationCount"]))
    overlay_limit = omega.get("lastLimit")
    engine.bind(
        "current-limit",
        int(overlay_limit) if overlay_limit not in (None, "") else int(agent.transactionLimit),
    )
    engine.bind("current-request-type", request.type)
    engine.bind("current-amount", int(request.amount))
    engine.bind("current-confidence", int(round(conf * 100)))
    engine.bind("current-evidence-verified", bool(verified))
    engine.bind("current-evidence-missing", len(evidence) == 0)
    engine.bind("current-conflicting", _conflicting(req))
    engine.bind("current-recipient-known", bool(recipient_known))
    engine.bind("current-invalid-signature", bool(agent.invalidSignature) or any(e.claimsInvalidSignature for e in evidence))
    engine.bind("current-suspicious", bool(agent.suspicious))
    engine.bind("current-failed-this", bool(agent.failedThisRequest))
    engine.bind("current-omega-violations", int(omega["violationCount"]))
    engine.bind("current-omega-last-severity", omega["lastSeverity"] or "none")


def _reasons(req: ReasonRequest, values: dict, missing: list[str]) -> list[str]:
    reasons: list[str] = []
    identity = req.agent.identity
    reasons.append(f"Identity is {identity}.")
    if values["violation"] == "unauthorized-transfer":
        reasons.append(
            f"Requested amount {req.request.amount} exceeds authorized limit {req.agent.transactionLimit}."
        )
    if values["violation"] == "identity-mismatch":
        reasons.append("Identity is revoked, so sensitive actions are blocked.")
    if req.agent.stake < 50:
        reasons.append("Stake is below the minimum transfer collateral.")
    if req.request.amount >= 500 and req.agent.stake < 500:
        reasons.append("Stake is insufficient for a high-value transaction.")
    if values["omegaUsed"]:
        reasons.append("Omega memory of prior incidents was included in the reasoning.")
    if values["evidenceStatus"] == "conflicting-evidence":
        reasons.append("Evidence set is contradictory, so punishment is withheld.")
    if values["evidenceStatus"] == "verified-evidence":
        reasons.append(f"Evidence is verified with confidence {values['confidence']:.2f}.")
    if values["evidenceStatus"] == "unverified-evidence":
        reasons.append("Evidence is unverified, so automatic slashing is suppressed.")
    if values["decision"] == "slash":
        reasons.append(f"Policy recommends a {values['slashPercentage']}% slash; the chain layer must execute it.")
    if missing:
        reasons.append("Missing information was identified instead of being ignored.")
    return reasons


def reason(payload: ReasonRequest, persist: bool | None = None) -> ReasonResponse:
    omega = memories_for(payload.agent.id)
    engine = _load_engine()
    _inject(engine, payload, omega)
    bundle = engine.run("!(reason-bundle)")
    if not isinstance(bundle, list) or len(bundle) < 14:
        raise RuntimeError(f"MeTTa reason-bundle returned unexpected value: {bundle}")

    decision = str(bundle[1])
    risk = str(bundle[2])
    band = str(bundle[3])
    confidence = float(bundle[4]) / 100.0
    trust = int(bundle[5])
    violation = str(bundle[6])
    severity = str(bundle[7])
    slash_pct = int(bundle[8])
    rep_delta = int(bundle[9])
    new_limit = int(bundle[10])
    permission = str(bundle[11])
    evidence_status = str(bundle[12])
    remaining = int(bundle[13])
    slash_amount = int(bundle[14]) if len(bundle) > 14 else 0

    missing: list[str] = []
    if not payload.request.recipient and payload.request.type == "transfer":
        missing.append("recipient verification")
    if payload.request.recipientKnown is False or (
        payload.request.recipient and payload.request.recipientKnown is None and "unknown" in (payload.request.recipient or "")
    ):
        missing.append("recipient reputation")
    if any(e.type == "transaction-record" for e in payload.evidence) is False:
        missing.append("transaction provenance")
    if evidence_status == "missing-evidence":
        missing.append("independent transaction confirmation")

    values = {
        "decision": decision,
        "slashPercentage": slash_pct,
        "violation": violation,
        "confidence": confidence,
        "evidenceStatus": evidence_status,
        "omegaUsed": bool(omega["summaries"]),
    }
    reasons = _reasons(payload, values, missing)
    explanation = (
        f"Decision: {decision.upper()}\n\n"
        "Reasons:\n" + "\n".join(f"- {line}" for line in reasons) + "\n\n"
        "Missing information:\n"
        + ("\n".join(f"- {item}" for item in missing) if missing else "- none")
        + "\n\nRecommended action:\n"
        + f"- {decision}\n"
        + (f"- Record violation {violation}\n" if violation != "none" else "")
        + (f"- Apply policy-based penalty {slash_pct}%\n" if slash_pct else "")
    )

    result = ReasonResponse(
        decision=decision,
        risk=risk,
        confidence=confidence,
        confidenceBand=band,
        trustScore=trust,
        violation=violation,
        severity=severity,
        slashPercentage=slash_pct,
        slashAmount=slash_amount,
        remainingStake=remaining,
        recommendedReputationChange=rep_delta,
        recommendedTransactionLimit=new_limit,
        permissionState=permission,
        evidenceStatus=evidence_status,
        missingInformation=missing,
        reasons=reasons,
        omegaMemoriesUsed=omega["summaries"],
        chainAction=chain_action_for(decision, payload.agent.wallet, slash_amount),
        explanation=explanation,
    )

    should_persist = payload.persistOmega if persist is None else persist
    if should_persist:
        remember(
            payload.agent.id,
            {
                "kind": "violation" if violation != "none" and decision in {"slash", "penalize", "reject", "suspend"} else "decision",
                "decision": decision,
                "severity": severity,
                "slashAmount": slash_amount,
                "requestAmount": payload.request.amount,
                "violation": violation,
                "recommendedTransactionLimit": new_limit,
                "recommendedReputationChange": rep_delta,
                "remainingStake": remaining,
                "trustScore": trust,
            },
        )
    return result
