#!/usr/bin/env python3
"""Rewrite question analyses with xAI chat (original wording)."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.xai_client import chat  # noqa: E402

SYSTEM = (
    "你是公考行测解析作者。根据题干、选项和正确答案，写一段原创解析。"
    "要求：120-220字；先点考点，再写推理；用「答案：X」收束；"
    "禁止提及培训机构、禁止复制机构解析口吻、禁止写「故正确答案」。"
)


def format_options(options: list[dict]) -> str:
    lines = []
    for opt in options:
        lines.append(f"{opt.get('key')}. {opt.get('text')}")
    return "\n".join(lines)


def rewrite_analysis(question: dict) -> str:
    user = (
        f"题型：{question.get('category')}/{question.get('subCategory') or ''}\n"
        f"题干：{question.get('content')}\n"
        f"选项：\n{format_options(question.get('options') or [])}\n"
        f"正确答案：{question.get('answer')}\n"
        "请写原创解析。"
    )
    return chat(
        [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ]
    )


def rewrite_paper(path: Path, *, start: int = 1, limit: int = 0, sleep_s: float = 0.4) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    questions = payload.get("questions") or []
    done = 0
    for q in questions:
        order = int(q.get("orderNum") or 0)
        if order < start:
            continue
        if limit and done >= limit:
            break
        if q.get("analysisRewritten"):
            continue
        q["analysis"] = rewrite_analysis(q)
        q["analysisHtml"] = None
        q["analysisRewritten"] = True
        done += 1
        print(f"  analysis rewritten q{order}")
        time.sleep(sleep_s)

    payload.setdefault("meta", {})["pipelineStage"] = "analysis_rewritten"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"rewrote {done} analyses in {path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("json", help="in_progress paper json")
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    rewrite_paper(Path(args.json), start=args.start, limit=args.limit)


if __name__ == "__main__":
    main()
