#!/usr/bin/env python3
"""Export all papers to in_progress JSON for later Grok image pass."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from export_paper import export_paper  # noqa: E402
from lib.paths import IN_PROGRESS_DIR, SEED_DB  # noqa: E402
import sqlite3  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    conn = sqlite3.connect(SEED_DB)
    ids = [
        r[0]
        for r in conn.execute(
            "SELECT id FROM papers WHERE id LIKE 'paper_oe_%' ORDER BY year DESC, title"
        ).fetchall()
    ]
    conn.close()

    if args.limit:
        ids = ids[: args.limit]

    for paper_id in ids:
        export_paper(paper_id, IN_PROGRESS_DIR / f"{paper_id}.json")

    print(f"exported {len(ids)} papers -> {IN_PROGRESS_DIR}")


if __name__ == "__main__":
    main()
