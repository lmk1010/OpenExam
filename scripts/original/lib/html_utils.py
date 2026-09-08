import re
from html import unescape

ASSET_RE = re.compile(
    r"openexam-asset://question-assets/([A-Za-z0-9._\-]+)", re.I
)
TAG_RE = re.compile(r"<[^>]+>")


def strip_html(value: str) -> str:
    text = unescape(TAG_RE.sub("", value or ""))
    return re.sub(r"\s+", " ", text).strip()


def find_asset_refs(*chunks: str) -> list[str]:
    refs: list[str] = []
    seen: set[str] = set()
    for chunk in chunks:
        for match in ASSET_RE.finditer(chunk or ""):
            name = match.group(1)
            if name not in seen:
                seen.add(name)
                refs.append(name)
    return refs


def replace_asset_refs(html: str, mapping: dict[str, str]) -> str:
    def repl(match: re.Match[str]) -> str:
        old = match.group(1)
        new = mapping.get(old)
        if not new:
            return match.group(0)
        return f"openexam-asset://question-assets/{new}"

    return ASSET_RE.sub(repl, html or "")
