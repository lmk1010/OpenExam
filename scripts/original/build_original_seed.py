#!/usr/bin/env python3
"""Build openexam.seed.db from completed original JSON papers."""

from __future__ import annotations

import argparse
import gzip
import json
import shutil
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.html_utils import find_asset_refs  # noqa: E402
from lib.paths import ASSETS_DIR, COMPLETED_DIR, DATA, LEGACY_ASSETS, SEED_DB, SEED_GZ  # noqa: E402


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS papers (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          year INTEGER NOT NULL,
          type TEXT NOT NULL,
          subject TEXT NOT NULL,
          province TEXT,
          question_count INTEGER DEFAULT 0,
          duration INTEGER DEFAULT 120,
          difficulty INTEGER DEFAULT 3,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY,
          paper_id TEXT NOT NULL,
          order_num INTEGER NOT NULL,
          type TEXT DEFAULT 'single',
          category TEXT,
          sub_category TEXT,
          content TEXT NOT NULL,
          content_html TEXT,
          material_html TEXT,
          material_group_id TEXT,
          options TEXT NOT NULL,
          answer TEXT NOT NULL,
          analysis TEXT,
          analysis_html TEXT,
          difficulty INTEGER DEFAULT 2,
          tags TEXT,
          quality_flag TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (paper_id) REFERENCES papers(id)
        );
        CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
        """
    )


def copy_assets(payload: dict) -> None:
    LEGACY_ASSETS.mkdir(parents=True, exist_ok=True)
    mapping = (payload.get("meta") or {}).get("assetMapping") or {}
    for new_name in mapping.values():
        src = ASSETS_DIR / new_name
        dst = LEGACY_ASSETS / new_name
        if src.exists() and not dst.exists():
            shutil.copy2(src, dst)


def import_paper(conn: sqlite3.Connection, payload: dict) -> tuple[int, int]:
    paper = payload["paper"]
    exam_level = paper.get("examLevel") or "national"
    paper_type = exam_level if exam_level in {"national", "provincial"} else "provincial"
    province = None if paper_type == "national" else paper.get("region")
    questions = payload.get("questions") or []

    conn.execute(
        """
        INSERT OR REPLACE INTO papers
        (id, title, year, type, subject, province, question_count, duration, difficulty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            paper["id"],
            paper["title"],
            int(paper.get("year") or 2026),
            paper_type,
            paper.get("subject") or "xingce",
            province,
            len(questions),
            int(paper.get("durationMin") or 120),
            3,
        ),
    )

    for q in questions:
        options = [
            {"key": o.get("key"), "content": o.get("text") or o.get("content") or ""}
            for o in (q.get("options") or [])
        ]
        content_html = q.get("contentHtml")
        material_html = q.get("materialHtml")
        analysis_html = q.get("analysisHtml")
        for ref in find_asset_refs(content_html or "", material_html or "", analysis_html or ""):
            if not (LEGACY_ASSETS / ref).exists() and (ASSETS_DIR / ref).exists():
                shutil.copy2(ASSETS_DIR / ref, LEGACY_ASSETS / ref)

        conn.execute(
            """
            INSERT OR REPLACE INTO questions
            (id, paper_id, order_num, type, category, sub_category,
             content, content_html, material_html, material_group_id,
             options, answer, analysis, analysis_html, difficulty, tags, quality_flag)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                q["id"],
                paper["id"],
                int(q.get("orderNum") or 0),
                "single",
                q.get("category"),
                q.get("subCategory"),
                q.get("content") or "",
                content_html,
                material_html,
                q.get("materialGroupId"),
                json.dumps(options, ensure_ascii=False),
                q.get("answer"),
                q.get("analysis") or "",
                analysis_html,
                int(q.get("difficulty") or 2),
                q.get("source") or "original",
                None,
            ),
        )

    copy_assets(payload)
    return 1, len(questions)


def build_seed(*, fresh: bool = False, include_legacy: bool = False) -> None:
    if fresh and SEED_DB.exists():
        for suffix in ("", "-wal", "-shm"):
            path = Path(str(SEED_DB) + suffix)
            if path.exists():
                path.unlink()

    conn = sqlite3.connect(SEED_DB)
    ensure_schema(conn)

    if fresh:
        conn.execute("DELETE FROM questions")
        conn.execute("DELETE FROM papers")

    total_papers = 0
    total_questions = 0
    files = sorted(COMPLETED_DIR.glob("paper_oe_*.json"))
    if not files:
        raise FileNotFoundError(f"no completed papers in {COMPLETED_DIR}")

    for file in files:
        payload = json.loads(file.read_text(encoding="utf-8"))
        p, q = import_paper(conn, payload)
        total_papers += p
        total_questions += q
        print(f"  imported {file.name}: {q} questions")

    conn.commit()
    conn.execute("VACUUM")
    conn.close()

    with open(SEED_DB, "rb") as src, gzip.open(SEED_GZ, "wb", compresslevel=9) as dst:
        shutil.copyfileobj(src, dst)

    print(f"seed built: {total_papers} papers, {total_questions} questions")
    print(f"  db  -> {SEED_DB}")
    print(f"  gz  -> {SEED_GZ}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fresh", action="store_true", help="replace entire seed db")
    args = parser.parse_args()
    build_seed(fresh=args.fresh)


if __name__ == "__main__":
    main()
