"""Omega = persistent memory. MeTTa = reasoning. Facts flow one way into MeTTa."""

from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from typing import Any


STORE = Path(__file__).resolve().parent / "data" / "omega.json"
LOCK = Lock()


def _load() -> dict[str, Any]:
    if not STORE.exists():
        return {"agents": {}}
    return json.loads(STORE.read_text(encoding="utf-8"))


def _save(data: dict[str, Any]) -> None:
    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def memories_for(agent_id: str) -> dict[str, Any]:
    with LOCK:
        data = _load()
        record = data.get("agents", {}).get(agent_id.lower(), {})
        events = record.get("events", [])
        violations = [e for e in events if e.get("kind") == "violation"]
        last = violations[-1] if violations else {}
        last_any = events[-1] if events else {}
        return {
            "violationCount": len(violations),
            "lastSeverity": last.get("severity", "none"),
            "lastSlash": last.get("slashAmount", 0),
            "lastDecision": last.get("decision", "none"),
            "lastLimit": last_any.get("recommendedTransactionLimit"),
            "events": events[-12:],
            "summaries": [
                f"{e.get('kind')}: {e.get('decision')} severity={e.get('severity')} slash={e.get('slashAmount', 0)}"
                for e in events[-8:]
            ],
        }


def remember(agent_id: str, event: dict[str, Any]) -> None:
    with LOCK:
        data = _load()
        agents = data.setdefault("agents", {})
        record = agents.setdefault(agent_id.lower(), {"events": []})
        record["events"].append(event)
        _save(data)


def reset_agent(agent_id: str) -> None:
    with LOCK:
        data = _load()
        data.setdefault("agents", {}).pop(agent_id.lower(), None)
        _save(data)


def standings() -> dict[str, Any]:
    """Policy overlay for every agent Omega has seen. Chain state is unchanged."""
    with LOCK:
        data = _load()
        agents: dict[str, Any] = {}
        for agent_id, record in data.get("agents", {}).items():
            events = record.get("events", [])
            violations = [e for e in events if e.get("kind") == "violation"]
            last = events[-1] if events else {}
            last_v = violations[-1] if violations else {}
            agents[agent_id.lower()] = {
                "violationCount": len(violations),
                "lastSeverity": last_v.get("severity", last.get("severity", "none")),
                "lastSlash": last_v.get("slashAmount", last.get("slashAmount", 0)),
                "lastDecision": last.get("decision", "none"),
                "lastLimit": last.get("recommendedTransactionLimit"),
                "remainingStake": last.get("remainingStake"),
                "reputationDelta": sum(int(e.get("recommendedReputationChange") or 0) for e in events),
                "trustScore": last.get("trustScore"),
                "summaries": [
                    f"{e.get('kind')}: {e.get('decision')} severity={e.get('severity')} slash={e.get('slashAmount', 0)}"
                    for e in events[-8:]
                ],
                "events": events[-12:],
            }
        return {"agents": agents}
