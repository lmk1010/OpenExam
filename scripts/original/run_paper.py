#!/usr/bin/env python3
"""End-to-end original paper pipeline."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from export_paper import export_paper  # noqa: E402
from finalize_paper import finalize  # noqa: E402
from grok_images import regenerate_images  # noqa: E402
from lib.paths import IN_PROGRESS_DIR  # noqa: E402
from rewrite_analysis import rewrite_paper  # noqa: E402


def run(cmd: list[str]) -> None:
    print("$", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="OpenExam original seed paper pipeline")
    parser.add_argument("--paper", required=True, help="paper id")
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--limit", type=int, default=0, help="0 = all")
    parser.add_argument("--skip-export", action="store_true")
    parser.add_argument("--skip-analysis", action="store_true")
    parser.add_argument("--skip-images", action="store_true")
    parser.add_argument("--skip-finalize", action="store_true")
    parser.add_argument("--build-seed", action="store_true")
    args = parser.parse_args()

    json_path = IN_PROGRESS_DIR / f"{args.paper}.json"

    if not args.skip_export:
        export_paper(args.paper, json_path)

    if not args.skip_analysis:
        rewrite_paper(json_path, start=args.start, limit=args.limit)

    if not args.skip_images:
        regenerate_images(json_path, start=args.start, limit=args.limit)

    if not args.skip_finalize:
        finalize(json_path)

    if args.build_seed:
        run([sys.executable, str(HERE / "build_original_seed.py")])


if __name__ == "__main__":
    main()
