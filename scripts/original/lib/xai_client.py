"""Minimal xAI client (chat + Grok Imagine) using stdlib only."""

from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.request
from typing import Any

DEFAULT_BASE = "https://api.x.ai/v1"
DEFAULT_CHAT_MODEL = os.environ.get("XAI_CHAT_MODEL", "grok-3-mini")
DEFAULT_IMAGE_MODEL = os.environ.get("XAI_IMAGE_MODEL", "grok-imagine-image-2.0")


def _api_key() -> str:
    key = (
        os.environ.get("XAI_API_KEY")
        or os.environ.get("CRS_OAI_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or ""
    ).strip()
    if not key:
        raise RuntimeError(
            "缺少 XAI_API_KEY。请在 shell 或 openexam/.env 中设置 xAI API Key。"
        )
    return key


def _base_url() -> str:
    return (os.environ.get("XAI_BASE_URL") or DEFAULT_BASE).rstrip("/")


def _request(path: str, body: dict[str, Any]) -> dict[str, Any]:
    url = f"{_base_url()}{path}"
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {_api_key()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"xAI HTTP {exc.code}: {detail}") from exc


def chat(messages: list[dict[str, str]], *, model: str | None = None, temperature: float = 0.4) -> str:
    data = _request(
        "/chat/completions",
        {
            "model": model or DEFAULT_CHAT_MODEL,
            "messages": messages,
            "temperature": temperature,
        },
    )
    return str(data["choices"][0]["message"]["content"]).strip()


def generate_image(
    prompt: str,
    *,
    model: str | None = None,
    aspect_ratio: str = "1:1",
    response_format: str = "b64_json",
) -> bytes:
    data = _request(
        "/images/generations",
        {
            "model": model or DEFAULT_IMAGE_MODEL,
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "response_format": response_format,
        },
    )
    item = data["data"][0]
    if "b64_json" in item:
        return base64.b64decode(item["b64_json"])
    if "url" in item:
        with urllib.request.urlopen(item["url"], timeout=120) as resp:
            return resp.read()
    raise RuntimeError("xAI image response missing b64_json/url")
