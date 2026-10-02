"""CLI / stdio service: python -m backend.metta.service"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT.parent))
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.metta.adapter import reason  # noqa: E402
from backend.metta.omega import memories_for, standings  # noqa: E402
from backend.metta.schemas import ReasonRequest  # noqa: E402


def main() -> None:
    try:
        if len(sys.argv) >= 2 and sys.argv[1] == "memory":
            target = sys.argv[2] if len(sys.argv) >= 3 else ""
            if target in {"all", "*"} or not target:
                sys.stdout.write(json.dumps(standings()))
            else:
                sys.stdout.write(json.dumps(memories_for(target)))
            return
        raw = sys.stdin.read()
        payload = ReasonRequest.model_validate_json(raw)
        result = reason(payload)
        sys.stdout.write(result.model_dump_json())
    except Exception as exc:
        sys.stderr.write(f"{type(exc).__name__}: {exc}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
