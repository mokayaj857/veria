"""Map MeTTa recommendations to AgentRegistry calls. Never send keys into MeTTa."""

from __future__ import annotations

from typing import Any


REGISTRY = "0x2550610275e2D031041Bea1b56326af77314eCFC"


def chain_action_for(decision: str, agent_wallet: str | None, slash_amount: int) -> dict[str, Any]:
    """
    AgentRegistry currently exposes owner-gated slashAgent (fixed 50%) and suspendAgent.
    MeTTa may recommend a different percentage; the application must validate before sending.
    """
    if decision == "slash":
        return {
            "registry": REGISTRY,
            "function": "slashAgent",
            "args": [agent_wallet],
            "note": "Owner transaction. Live contract slashes 50% and burns to 0xdead; MeTTa percentage is the policy recommendation to record.",
            "recommendedSlashAmount": slash_amount,
        }
    if decision == "suspend":
        return {
            "registry": REGISTRY,
            "function": "suspendAgent",
            "args": [agent_wallet],
            "note": "Owner transaction. MeTTa does not hold keys.",
        }
    return {
        "registry": REGISTRY,
        "function": None,
        "args": [],
        "note": "No on-chain mutation. Application may update off-chain Omega/policy state only.",
    }
