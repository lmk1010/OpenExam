#!/usr/bin/env python3
"""Generate replacement images with Grok Imagine for legacy asset refs."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.html_utils import find_asset_refs, replace_asset_refs, strip_html  # noqa: E402
from lib.paths import ASSETS_DIR, LEGACY_ASSETS  # noqa: E402
from lib.xai_client import chat, generate_image  # noqa: E402

PROMPT_SYSTEM = (
    "你是考试配图设计师。根据行测题目信息，写一段英文图像生成 prompt。"
    "要求：描述清晰、无水印、无品牌、无文字 UI；图形推理题用简洁黑白几何图；"
    "数量关系/资料题用示意图或图表；只输出 prompt 本身。"
)


def build_image_prompt(question: dict, legacy_file: str) -> str:
    legacy_path = LEGACY_ASSETS / legacy_file
    hint = ""
    if legacy_path.exists():
        hint = f"Legacy asset filename: {legacy_file}. "
    user = (
        f"{hint}"
        f"Category: {question.get('category')}\n"
        f"Stem: {strip_html(question.get('contentHtml') or question.get('content') or '')}\n"
        f"Options: {[o.get('text') for o in (question.get('options') or [])]}\n"
        f"Answer: {question.get('answer')}\n"
        "Write one image-generation prompt."
    )
    return chat(
        [
            {"role": "system", "content": PROMPT_SYSTEM},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )


def asset_name(question_id: str, legacy_file: str) -> str:
    digest = hashlib.sha1(f"{question_id}:{legacy_file}".encode("utf-8")).hexdigest()[:16]
    return f"oe_{digest}.webp"


def regenerate_images(path: Path, *, start: int = 1, limit: int = 0, sleep_s: float = 0.8) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    mapping: dict[str, str] = payload.setdefault("meta", {}).setdefault("assetMapping", {})
    done = 0

    for q in payload.get("questions") or []:
        order = int(q.get("orderNum") or 0)
        if order < start:
            continue
        refs = find_asset_refs(
            q.get("contentHtml") or "",
            q.get("materialHtml") or "",
            q.get("analysisHtml") or "",
        )
        if not refs:
            continue
        if limit and done >= limit:
            break

        local_map: dict[str, str] = {}
        for legacy in refs:
            if legacy in mapping:
                local_map[legacy] = mapping[legacy]
                continue
            prompt = build_image_prompt(q, legacy)
            raw = generate_image(
                prompt,
                aspect_ratio="4:3" if q.get("category") == "ziliao" else "1:1",
            )
            out_name = asset_name(q["id"], legacy)
            out_path = ASSETS_DIR / out_name
            out_path.write_bytes(raw)
            mapping[legacy] = out_name
            local_map[legacy] = out_name
            print(f"  image q{order} {legacy} -> {out_name}")
            done += 1
            time.sleep(sleep_s)

        if local_map:
            if q.get("contentHtml"):
                q["contentHtml"] = replace_asset_refs(q["contentHtml"], local_map)
            if q.get("materialHtml"):
                q["materialHtml"] = replace_asset_refs(q["materialHtml"], local_map)
            if q.get("analysisHtml"):
                q["analysisHtml"] = replace_asset_refs(q["analysisHtml"], local_map)
            q["imagesRegenerated"] = True

    payload["meta"]["pipelineStage"] = "images_regenerated"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"generated/linked {done} images in {path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("json", help="in_progress paper json")
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    regenerate_images(Path(args.json), start=args.start, limit=args.limit)


if __name__ == "__main__":
    main()
