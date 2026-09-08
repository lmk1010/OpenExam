#!/usr/bin/env python3
"""Copy oe_*.webp into question-assets and rewrite seed HTML refs."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.html_utils import replace_asset_refs  # noqa: E402
from lib.paths import ASSETS_DIR, DATA, LEDGER_PATH, LEGACY_ASSETS, SEED_DB  # noqa: E402

MANIFEST_PATH = DATA / "question-assets-manifest.json"
PREVIEWS = DATA / "original" / "previews"


def asset_name(legacy_file: str) -> str:
    digest = hashlib.sha1(legacy_file.encode("utf-8")).hexdigest()[:16]
    return f"oe_{digest}.webp"


def load_ledger() -> dict:
    if LEDGER_PATH.exists():
        return json.loads(LEDGER_PATH.read_text(encoding="utf-8"))
    return {"assets": {}, "updatedAt": None}


def save_ledger(ledger: dict) -> None:
    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    LEDGER_PATH.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_source(new_name: str) -> Path | None:
    cursor_assets = Path.home() / ".cursor/projects/Users-liumingkang-AI-MK-MKAIOrg/assets"
    png_name = new_name.replace(".webp", ".png")
    # Prefer the newest generated PNG, then previews, then already-copied webp.
    for path in (
        cursor_assets / png_name,
        PREVIEWS / png_name,
        PREVIEWS / new_name,
        ASSETS_DIR / new_name,
    ):
        if path.exists():
            return path
    return None


def to_webp(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.resolve() == dest.resolve() and src.suffix.lower() == ".webp":
        return
    if src.suffix.lower() == ".webp" and src.resolve() != dest.resolve():
        shutil.copy2(src, dest)
        return
    from PIL import Image

    with Image.open(src) as image:
        image.convert("RGB").save(dest, "WEBP", quality=92, method=6)


def apply_mapping(mapping: dict[str, str]) -> dict[str, int]:
    stats = {"copied": 0, "html": 0, "questions": 0}
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    LEGACY_ASSETS.mkdir(parents=True, exist_ok=True)

    for legacy, new_name in mapping.items():
        src = find_source(new_name)
        if not src:
            raise FileNotFoundError(f"missing generated file for {legacy} -> {new_name}")
        dest_new = ASSETS_DIR / new_name
        dest_legacy = LEGACY_ASSETS / new_name
        to_webp(src, dest_new)
        shutil.copy2(dest_new, dest_legacy)
        stats["copied"] += 1

    conn = sqlite3.connect(SEED_DB)
    rows = conn.execute(
        "SELECT id, content_html, material_html, analysis_html, options FROM questions"
    ).fetchall()
    for qid, content_html, material_html, analysis_html, options in rows:
        new_content = replace_asset_refs(content_html or "", mapping)
        new_material = replace_asset_refs(material_html or "", mapping)
        new_analysis = replace_asset_refs(analysis_html or "", mapping)
        new_options = replace_asset_refs(options or "", mapping)
        if (
            new_content == (content_html or "")
            and new_material == (material_html or "")
            and new_analysis == (analysis_html or "")
            and new_options == (options or "")
        ):
            continue
        conn.execute(
            """
            UPDATE questions
            SET content_html = ?, material_html = ?, analysis_html = ?, options = ?
            WHERE id = ?
            """,
            (new_content or None, new_material or None, new_analysis or None, new_options, qid),
        )
        stats["questions"] += 1
        stats["html"] += 1
    conn.commit()
    conn.close()

    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        for legacy, new_name in mapping.items():
            dest = LEGACY_ASSETS / new_name
            manifest[new_name] = {
                "file": new_name,
                "contentType": "image/webp",
                "size": dest.stat().st_size if dest.exists() else 0,
                "replaces": legacy,
            }
        MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    ledger = load_ledger()
    for legacy, new_name in mapping.items():
        ledger.setdefault("assets", {})[legacy] = {"file": new_name, "status": "applied"}
    save_ledger(ledger)
    return stats


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", action="append", default=[], help="legacy filename")
    args = parser.parse_args()
    mapping = {legacy: asset_name(legacy) for legacy in args.legacy}
    if not mapping:
        raise SystemExit("pass --legacy FILE for each generated asset")
    stats = apply_mapping(mapping)
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
