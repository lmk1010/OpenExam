#!/usr/bin/env python3
"""Move finished paper JSON into completed/ and update ledger."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.paths import COMPLETED_DIR, IN_PROGRESS_DIR, LEDGER_PATH  # noqa: E402


def finalize(path: Path) -> Path:
    payload = json.loads(path.read_text(encoding="utf-8"))
    paper_id = payload["paper"]["id"]
    for q in payload.get("questions") or []:
        q.pop("legacyAnalysis", None)
        q.pop("legacyAssetRefs", None)

    payload.setdefault("meta", {})["pipelineStage"] = "completed"
    payload["meta"]["completedAt"] = datetime.now(timezone.utc).isoformat()

    COMPLETED_DIR.mkdir(parents=True, exist_ok=True)
    out = COMPLETED_DIR / f"{paper_id}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if path.resolve() != out.resolve() and path.exists():
        path.unlink()

    ledger = {}
    if LEDGER_PATH.exists():
        ledger = json.loads(LEDGER_PATH.read_text(encoding="utf-8"))
    ledger[paper_id] = {
        "title": payload["paper"]["title"],
        "questions": len(payload.get("questions") or []),
        "completedAt": payload["meta"]["completedAt"],
        "file": out.name,
    }
    LEDGER_PATH.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"finalized -> {out}")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("json", help="in_progress paper json")
    args = parser.parse_args()
    finalize(Path(args.json))


if __name__ == "__main__":
    main()
