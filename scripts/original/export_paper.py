#!/usr/bin/env python3
"""Export one paper from openexam.seed.db into in_progress JSON."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.paths import IN_PROGRESS_DIR, SEED_DB  # noqa: E402


def parse_options(raw: str) -> list[dict[str, str]]:
    try:
        data = json.loads(raw or "[]")
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out: list[dict[str, str]] = []
    for idx, item in enumerate(data):
        key = str(item.get("key") or chr(65 + idx)).upper()
        text = str(item.get("content") or item.get("text") or "").strip()
        out.append({"key": key, "text": text})
    return out


def export_paper(paper_id: str, out_path: Path | None = None) -> Path:
    if not SEED_DB.exists():
        raise FileNotFoundError(f"seed db not found: {SEED_DB}")

    conn = sqlite3.connect(SEED_DB)
    conn.row_factory = sqlite3.Row
    paper = conn.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
    if not paper:
        raise ValueError(f"paper not found: {paper_id}")

    rows = conn.execute(
        """
        SELECT * FROM questions
        WHERE paper_id = ?
        ORDER BY order_num ASC
        """,
        (paper_id,),
    ).fetchall()
    conn.close()

    exam_level = paper["type"] if paper["type"] in {"national", "provincial"} else "national"
    region = "national" if exam_level == "national" else (paper["province"] or "unknown")

    payload = {
        "schemaVersion": 1,
        "paper": {
            "id": paper["id"],
            "title": paper["title"],
            "examKind": "gongwuyuan",
            "examLevel": exam_level,
            "region": region,
            "subject": paper["subject"] or "xingce",
            "year": paper["year"],
            "durationMin": paper["duration"] or 120,
            "source": "original",
            "note": "回忆版真题。解析与配图均为 OpenExam 原创，不含第三方机构标记。",
        },
        "questions": [],
        "meta": {
            "pipelineStage": "exported",
            "legacyAssetRefs": [],
        },
    }

    legacy_refs: set[str] = set()
    for row in rows:
        content_html = row["content_html"] or ""
        material_html = row["material_html"] or ""
        analysis_html = row["analysis_html"] or ""
        for ref in (
            __import__("lib.html_utils", fromlist=["find_asset_refs"]).find_asset_refs(
                content_html, material_html, analysis_html
            )
        ):
            legacy_refs.add(ref)

        payload["questions"].append(
            {
                "id": row["id"],
                "orderNum": row["order_num"],
                "category": row["category"],
                "subCategory": row["sub_category"],
                "difficulty": row["difficulty"] or 2,
                "source": "original",
                "content": row["content"] or "",
                "contentHtml": content_html or None,
                "materialHtml": material_html or None,
                "options": parse_options(row["options"]),
                "answer": row["answer"],
                "analysis": row["analysis"] or "",
                "analysisHtml": analysis_html or None,
                "legacyAnalysis": row["analysis"] or "",
                "legacyAssetRefs": __import__(
                    "lib.html_utils", fromlist=["find_asset_refs"]
                ).find_asset_refs(content_html, material_html, analysis_html),
            }
        )

    payload["meta"]["legacyAssetRefs"] = sorted(legacy_refs)
    out = out_path or (IN_PROGRESS_DIR / f"{paper_id}.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"exported {len(payload['questions'])} questions -> {out}")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--paper", required=True, help="paper id, e.g. paper_oe_19465")
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    out = Path(args.out) if args.out else None
    export_paper(args.paper, out)


if __name__ == "__main__":
    main()
