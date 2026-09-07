#!/usr/bin/env python3
"""把 r2-staging/ 里的东西传到 R2（`openexam` 桶）。

以前是手动往 Cloudflare 面板上拖。拖漏一个文件、Content-Type 传错一个，
都得等用户点了下载才发现。这个脚本按清单传，传完当场从公开域名回读校验。

凭据：~/.neox-secrets/openexam-r2.env（只授权 openexam 这一个桶）。
别拿 r2.env 那把 —— 它只授权 neox-downloads，对 openexam 是 AccessDenied。

    python3 scripts/r2-upload.py --list     # 只看要传什么
    python3 scripts/r2-upload.py            # 传 + 校验
    python3 scripts/r2-upload.py --verify   # 只校验线上的
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys

import boto3

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STAGING = os.path.join(ROOT, "r2-staging")
SECRETS = os.path.expanduser("~/.neox-secrets/openexam-r2.env")

# 本地路径 → bucket 里的 key。**只列这次要传的**，别整个目录扫 ——
# r2-staging 里还留着 1.0.1 和桌面端，重传一遍是几百兆的白流量。
UPLOADS = [
    ("android/1.1.0/OpenExam-1.1.0-arm64-v8a.apk", "openexam/android/1.1.0/OpenExam-1.1.0-arm64-v8a.apk"),
    ("android/1.1.0/OpenExam-1.1.0-armeabi-v7a.apk", "openexam/android/1.1.0/OpenExam-1.1.0-armeabi-v7a.apk"),
    ("android/1.1.0/OpenExam-1.1.0-universal.apk", "openexam/android/1.1.0/OpenExam-1.1.0-universal.apk"),
    ("android/1.1.0/manifest.json", "openexam/android/1.1.0/manifest.json"),
    ("android/1.1.0/SHA256SUMS.txt", "openexam/android/1.1.0/SHA256SUMS.txt"),
    ("android/latest.json", "openexam/android/latest.json"),
    ("banks/v1/gongkao-national.zip", "banks/v1/gongkao-national.zip"),
    ("banks/v1/gongkao-province.zip", "banks/v1/gongkao-province.zip"),
    ("banks/v1/manifest.json", "banks/v1/manifest.json"),
]

# 类型得自己指定，别让 SDK 猜。猜错的话浏览器会把 zip 当网页打开，
# 下下来是坏的，而用户只会看到「导入失败」。
TYPES = {
    ".apk": "application/vnd.android.package-archive",
    ".zip": "application/zip",
    ".json": "application/json",
    ".txt": "text/plain; charset=utf-8",
}


def env() -> dict[str, str]:
    out = {}
    for line in open(SECRETS):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            out[k] = v.strip()
    return out


def verify(base: str, key: str, want_size: int, want_sha: str) -> bool:
    url = f"{base}/{key}"
    # 走 curl 不走 urllib：Cloudflare 会把 urllib 的默认 UA 当机器人挡掉，
    # 回来是 403 —— 东西明明传上去了，校验却全红，白查半天。
    #
    # 要重试：几十兆的包从 CDN 拉回来，超时（28）和 HTTP/2 流错误（92）
    # 都会偶发，而且每次挂的文件都不一样。一次失败就报红的话，你会去查
    # 一个根本没坏的文件。--http1.1 也是为了这个 —— HTTP/2 复用在大文件上
    # 更容易断。
    body = ctype = None
    last = ""
    for attempt in range(3):
        try:
            proc = subprocess.run(
                ["curl", "-sS", "--http1.1", "--max-time", "300",
                 "--retry", "2", "-w", "\n%{content_type}", url],
                capture_output=True, check=True,
            )
            raw = proc.stdout
            cut = raw.rfind(b"\n")
            body, ctype = raw[:cut], raw[cut + 1:].decode().strip()
            break
        except subprocess.CalledProcessError as e:
            last = f"curl 退出码 {e.returncode}"
    if body is None:
        print(f"  ✗ {key}: 三次都取不回来（{last}）")
        return False

    ok = True
    if len(body) != want_size:
        print(f"  ✗ {key}: 大小 {len(body)} ≠ 本地 {want_size}")
        ok = False
    elif hashlib.sha256(body).hexdigest() != want_sha:
        print(f"  ✗ {key}: sha256 对不上")
        ok = False
    # zip 被当成网页返回是最常见的坏法，光看 200 看不出来
    if key.endswith(".zip") and "zip" not in ctype:
        print(f"  ✗ {key}: content-type 是 {ctype!r}，不是 zip")
        ok = False
    if ok:
        print(f"  ✓ {key}  {len(body) / 1024 / 1024:.1f}MB  {ctype}")
    return ok


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""

    items = []
    for rel, key in UPLOADS:
        local = os.path.join(STAGING, rel)
        if not os.path.exists(local):
            print(f"缺文件：{local}", file=sys.stderr)
            return 1
        body = open(local, "rb").read()
        items.append((local, key, len(body), hashlib.sha256(body).hexdigest()))

    if mode == "--list":
        for _, key, size, _ in items:
            print(f"{size / 1024 / 1024:8.1f}MB  {key}")
        return 0

    e = env()

    if mode != "--verify":
        s3 = boto3.client(
            "s3",
            endpoint_url=e["R2_ENDPOINT"],
            aws_access_key_id=e["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=e["R2_SECRET_ACCESS_KEY"],
            region_name="auto",
        )
        for local, key, size, _ in items:
            ctype = TYPES.get(os.path.splitext(local)[1].lower(), "application/octet-stream")
            print(f"↑ {key}  {size / 1024 / 1024:.1f}MB  {ctype}")
            s3.upload_file(local, e["R2_BUCKET"], key,
                           ExtraArgs={"ContentType": ctype})

    print("\n从公开域名回读校验：")
    bad = sum(0 if verify(e["R2_PUBLIC_BASE"], k, s, h) else 1 for _, k, s, h in items)
    print("\n全部通过。" if not bad else f"\n{bad} 个有问题。")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
