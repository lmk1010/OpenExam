#!/usr/bin/env python3
"""Rewrite all analyses in openexam.seed.db (local, no API)."""

from __future__ import annotations

import argparse
import gzip
import json
import shutil
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.local_analysis import rewrite_analysis  # noqa: E402
from lib.paths import DATA, SEED_DB, SEED_GZ  # noqa: E402

CHECKPOINT = DATA / "original" / "analysis_checkpoint.json"


def load_checkpoint() -> set[str]:
    if not CHECKPOINT.exists():
        return set()
    data = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    return set(data.get("doneIds") or [])


def save_checkpoint(done_ids: set[str], total: int) -> None:
    CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
    CHECKPOINT.write_text(
        json.dumps(
            {
                "doneIds": sorted(done_ids),
                "count": len(done_ids),
                "total": total,
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def rewrite_seed(*, resume: bool = True, limit: int = 0) -> dict[str, int]:
    conn = sqlite3.connect(SEED_DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT id, category, sub_category, content, options, answer, analysis
        FROM questions
        ORDER BY paper_id, order_num
        """
    ).fetchall()

    done_ids = load_checkpoint() if resume else set()
    stats = {"total": len(rows), "rewritten": 0, "skipped": 0}
    update_sql = """
        UPDATE questions
        SET analysis = ?, analysis_html = NULL
        WHERE id = ?
    """

    batch = 0
    for row in rows:
        qid = row["id"]
        if resume and qid in done_ids:
            stats["skipped"] += 1
            continue
        if limit and stats["rewritten"] >= limit:
            break

        new_analysis = rewrite_analysis(
            category=row["category"] or "",
            sub_category=row["sub_category"],
            content=row["content"] or "",
            options_raw=row["options"] or "[]",
            answer=row["answer"] or "",
            legacy=row["analysis"] or "",
        )
        conn.execute(update_sql, (new_analysis, qid))
        done_ids.add(qid)
        stats["rewritten"] += 1
        batch += 1

        if batch >= 200:
            conn.commit()
            save_checkpoint(done_ids, len(rows))
            batch = 0
            print(f"  progress {len(done_ids)}/{len(rows)}")

    conn.commit()
    conn.execute("VACUUM")
    conn.close()
    save_checkpoint(done_ids, len(rows))

    with open(SEED_DB, "rb") as src, gzip.open(SEED_GZ, "wb", compresslevel=9) as dst:
        shutil.copyfileobj(src, dst)

    return stats


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fresh", action="store_true", help="ignore checkpoint")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    stats = rewrite_seed(resume=not args.fresh, limit=args.limit)
    print(
        json.dumps(
            {**stats, "seedDb": str(SEED_DB), "seedGz": str(SEED_GZ)},
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
