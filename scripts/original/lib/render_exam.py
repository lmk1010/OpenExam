"""Exact exam tables/diagrams. Style matches the approved Grok preview: white ground, blue-gray headers, crisp black lines."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BLUE = (47, 84, 150)
BLUE_SOFT = (232, 240, 248)
ROW_ALT = (245, 249, 252)
INK = (25, 32, 40)
LINE = (190, 200, 212)
WHITE = (255, 255, 255)


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size=size, index=0)
            except OSError:
                continue
    return ImageFont.load_default()


def save_webp(image: Image.Image, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    rgb = image.convert("RGB")
    rgb.save(dest, "WEBP", quality=92, method=6)
    return dest


def render_table(
    *,
    title: str,
    unit: str,
    headers: list[str],
    rows: list[list[str]],
    bold_rows: set[int] | None = None,
    indent_rows: set[int] | None = None,
    size: tuple[int, int] = (1536, 1152),
) -> Image.Image:
    bold_rows = bold_rows or set()
    indent_rows = indent_rows or set()
    w, h = size
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    title_font = _font(36, True)
    unit_font = _font(22)
    head_font = _font(26, True)
    cell_font = _font(24)
    cell_bold = _font(24, True)

    margin = 48
    draw.text((w // 2, 36), title, fill=INK, font=title_font, anchor="mt")
    draw.text((w - margin, 88), unit, fill=(90, 100, 112), font=unit_font, anchor="rt")

    cols = len(headers)
    table_top = 120
    table_bottom = h - 40
    table_left = margin
    table_right = w - margin
    col_w = (table_right - table_left) / cols
    row_count = len(rows) + 1
    row_h = (table_bottom - table_top) / row_count

    head_box = [table_left, table_top, table_right, table_top + row_h]
    draw.rectangle(head_box, fill=BLUE)
    for i, header in enumerate(headers):
        x = table_left + col_w * i + col_w / 2
        y = table_top + row_h / 2
        draw.text((x, y), header, fill=WHITE, font=head_font, anchor="mm")

    for r, row in enumerate(rows):
        y0 = table_top + row_h * (r + 1)
        y1 = y0 + row_h
        fill = BLUE_SOFT if r in bold_rows else (ROW_ALT if r % 2 == 0 else WHITE)
        draw.rectangle([table_left, y0, table_right, y1], fill=fill)
        font = cell_bold if r in bold_rows else cell_font
        for c, value in enumerate(row):
            x = table_left + col_w * c + (36 if c == 0 else col_w / 2)
            if c == 0 and r in indent_rows:
                x += 28
            anchor = "lm" if c == 0 else "mm"
            draw.text((x, (y0 + y1) / 2), value, fill=INK, font=font, anchor=anchor)

    for i in range(cols + 1):
        x = table_left + col_w * i
        draw.line([(x, table_top), (x, table_bottom)], fill=LINE, width=2)
    for i in range(row_count + 1):
        y = table_top + row_h * i
        draw.line([(table_left, y), (table_right, y)], fill=LINE, width=2)
    return img


def render_trapezoid_oad() -> Image.Image:
    w, h = 1536, 1152
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    font = _font(36, True)

    # AB // CD, AB/CD = OA/OD = 0.6. O closer to A.
    c = (380, 860)
    d = (1160, 860)
    a = (560, 280)
    b = (980, 280)
    # Diagonals AD and BC
    def lerp(p, q, t):
        return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)

    # O divides AD with AO:OD = 0.6:1 => AO/(AO+OD)=0.6/1.6=0.375
    o = lerp(a, d, 0.375)
    draw.line([a, b, d, c, a], fill=INK, width=6)
    draw.line([a, d], fill=INK, width=4)
    draw.line([b, c], fill=INK, width=4)
    r = 8
    for p in (a, b, c, d, o):
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=INK)
    draw.text((a[0] - 28, a[1] - 48), "A", fill=INK, font=font, anchor="mm")
    draw.text((b[0] + 28, b[1] - 48), "B", fill=INK, font=font, anchor="mm")
    draw.text((c[0] - 28, c[1] + 40), "C", fill=INK, font=font, anchor="mm")
    draw.text((d[0] + 28, d[1] + 40), "D", fill=INK, font=font, anchor="mm")
    draw.text((o[0] + 36, o[1] + 8), "O", fill=INK, font=font, anchor="mm")
    return img


def render_bar_chart(
    *,
    title: str,
    unit: str,
    labels: list[str],
    values: list[float],
    y_max: float,
    size: tuple[int, int] = (1536, 1152),
) -> Image.Image:
    w, h = size
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    title_font = _font(32, True)
    axis_font = _font(20)
    val_font = _font(20)
    margin_l, margin_r, margin_t, margin_b = 110, 60, 90, 140
    plot_l, plot_t = margin_l, margin_t
    plot_r, plot_b = w - margin_r, h - margin_b
    draw.text((w // 2, 28), title, fill=INK, font=title_font, anchor="mt")
    draw.text((plot_l - 8, plot_t - 8), unit, fill=(90, 100, 112), font=axis_font, anchor="rb")
    ticks = 4
    for i in range(ticks + 1):
        yv = y_max * i / ticks
        y = plot_b - (plot_b - plot_t) * (yv / y_max)
        draw.line([(plot_l, y), (plot_r, y)], fill=LINE, width=2)
        draw.text((plot_l - 12, y), f"{int(yv)}", fill=INK, font=axis_font, anchor="rm")
    n = len(values)
    gap = 18
    bar_w = (plot_r - plot_l - gap * (n + 1)) / n
    for i, (lab, val) in enumerate(zip(labels, values)):
        x0 = plot_l + gap + i * (bar_w + gap)
        x1 = x0 + bar_w
        bh = (plot_b - plot_t) * (val / y_max)
        y0 = plot_b - bh
        draw.rectangle([x0, y0, x1, plot_b], outline=BLUE, width=4, fill=BLUE_SOFT)
        draw.text(((x0 + x1) / 2, y0 - 8), f"{val:g}", fill=INK, font=val_font, anchor="mb")
        draw.text(((x0 + x1) / 2, plot_b + 18), lab, fill=INK, font=axis_font, anchor="mt")
    draw.line([(plot_l, plot_t), (plot_l, plot_b), (plot_r, plot_b)], fill=INK, width=3)
    return img


def render_venn_subset() -> Image.Image:
    w, h = 1536, 1536
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    font = _font(40, True)
    left = (430, 430, 990, 1100)
    right = (546, 430, 1106, 1100)
    inner = (688, 668, 848, 868)
    draw.ellipse(left, outline=INK, width=7)
    draw.ellipse(right, outline=INK, width=7)
    draw.ellipse(inner, outline=INK, width=7)

    def badge(xy, text):
        x, y = xy
        draw.ellipse([x - 28, y - 28, x + 28, y + 28], outline=INK, width=4, fill=WHITE)
        draw.text((x, y), text, fill=INK, font=font, anchor="mm")

    badge((520, 768), "1")
    badge((1016, 768), "2")
    badge((768, 768), "3")
    return img
