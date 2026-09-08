"""Local original-style analysis rewriter (no API)."""

from __future__ import annotations

import json
import re
from html import unescape

CATEGORY_LABEL = {
    "changshi": "常识判断",
    "yanyu": "言语理解",
    "shuliang": "数量关系",
    "panduan": "判断推理",
    "ziliao": "资料分析",
}

BOILERPLATE = [
    r"本题考查[^。！？\n]*[。！？]?",
    r"根据[^。！？\n]*(?:定义|规定|文段|题干)[^。！？\n]*[。！？]?",
    r"第一步[：:][^。！？\n]*[。！？]?",
    r"第二步[：:][^。！？\n]*[。！？]?",
    r"第三步[：:][^。！？\n]*[。！？]?",
    r"逐一分析选项[。！？]?",
    r"对比(?:B、D|择优)[^。！？\n]*[。！？]?",
    r"故选[A-D][。！？]?",
    r"答案[：:][A-D][。！？]?",
    r"解法[一二三][：:][^。！？\n]*[。！？]?",
    r"备注[：:][^。！？\n]*[。！？]?",
    r"经验证[^。！？\n]*[。！？]?",
    r"如下图所示[^。！？\n]*[。！？]?",
    r"小粉笔[^。！？\n]*[。！？]?",
    r"[^。！？\n]*粉笔[^。！？\n]*[。！？]?",
]

SENTENCE_SPLIT = re.compile(r"(?<=[。！？!?])\s*")
TAG_RE = re.compile(r"<[^>]+>")


def strip_html(text: str) -> str:
    return unescape(TAG_RE.sub("", text or "")).strip()


def parse_options(raw: str) -> list[dict[str, str]]:
    try:
        data = json.loads(raw or "[]")
    except json.JSONDecodeError:
        return []
    out: list[dict[str, str]] = []
    for idx, item in enumerate(data):
        key = str(item.get("key") or chr(65 + idx)).upper()
        text = strip_html(str(item.get("content") or item.get("text") or ""))
        out.append({"key": key, "text": text})
    return out


def split_sentences(text: str) -> list[str]:
    parts = [p.strip() for p in SENTENCE_SPLIT.split(text or "") if p.strip()]
    return parts


def clean_legacy(text: str) -> str:
    value = strip_html(text)
    for pattern in BOILERPLATE:
        value = re.sub(pattern, "", value)
    value = re.sub(r"\n{2,}", "\n", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return value.strip()


def pick_sentences(sentences: list[str], answer: str, limit: int = 4) -> list[str]:
    scored: list[tuple[int, str]] = []
    for sent in sentences:
        s = sent.strip()
        if len(s) < 8:
            continue
        score = 0
        if answer and answer in s:
            score += 3
        if any(k in s for k in ("排除", "符合", "因此", "故", "只有", "正确", "错误", "不符", "一致", "规律", "代入", "计算", "可得", "约为", "占", "增长", "比例")):
            score += 2
        if re.search(r"\d", s):
            score += 1
        if s.startswith(("A项", "B项", "C项", "D项", "①", "②", "③", "④")):
            score += 1
        if any(k in s for k in ("本题", "第一步", "第二步", "对比", "择优")):
            score -= 2
        scored.append((score, s))
    scored.sort(key=lambda x: x[0], reverse=True)
    picked: list[str] = []
    seen: set[str] = set()
    for _, sent in scored:
        if sent in seen:
            continue
        picked.append(sent)
        seen.add(sent)
        if len(picked) >= limit:
            break
    if not picked and sentences:
        picked = sentences[: min(3, len(sentences))]
    return picked


def option_hint(options: list[dict[str, str]], answer: str) -> str:
    correct = next((o for o in options if o["key"] == answer), None)
    if not correct or not correct["text"]:
        return ""
    text = correct["text"]
    if len(text) > 48:
        text = text[:48] + "…"
    return f"正确选项为 {answer}（{text}）。"


def rewrite_analysis(
    *,
    category: str,
    sub_category: str | None,
    content: str,
    options_raw: str,
    answer: str,
    legacy: str,
) -> str:
    answer = (answer or "").strip().upper()
    options = parse_options(options_raw)
    label = CATEGORY_LABEL.get(category or "", "行测")
    sub = f"/{sub_category}" if sub_category else ""

    legacy_clean = clean_legacy(legacy)
    sentences = split_sentences(legacy_clean)
    body = pick_sentences(sentences, answer)

    if not body:
        stem = strip_html(content)
        if len(stem) > 80:
            stem = stem[:80] + "…"
        body = [f"题干要求判断「{stem}」"]
        hint = option_hint(options, answer)
        if hint:
            body.append(hint.rstrip("。"))
    else:
        if len("".join(body)) < 40:
            hint = option_hint(options, answer)
            if hint:
                body.append(hint.rstrip("。"))

    intro = f"【{label}{sub}】"
    text = intro + "".join(body)
    if not text.endswith("。"):
        text += "。"
    if f"答案：{answer}" not in text and f"答案:{answer}" not in text:
        text += f"答案：{answer}。"
    text = re.sub(r"。+", "。", text)
    text = re.sub(r"答案：([A-D])。+", rf"答案：\1。", text)
    if len(text) > 420:
        text = text[:400].rstrip("，；") + f"…。答案：{answer}。"
    return text
