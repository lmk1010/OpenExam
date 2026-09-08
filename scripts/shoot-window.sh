#!/usr/bin/env bash
# 截一张桌面端窗口图。
#
#   scripts/shoot-window.sh out.png [窗口名关键词]
#
# 为什么不用 `screencapture -R x,y,w,h`：按矩形截的是**屏幕**那块区域，
# 前面压着的任何窗口都会一起进去。这台机器上开着后台面板、别的终端，
# 拍出来的图里带着不该给外人看的东西 —— 我已经误拍过两次。
# `screencapture -l<窗口ID>` 只拍那一个窗口，压着也不影响。
set -euo pipefail
out="${1:?用法: shoot-window.sh out.png [窗口名关键词]}"
needle="${2:-OpenExam}"
here="$(cd "$(dirname "$0")" && pwd)"
wid="$(swift "$here/window-id.swift" "$needle" | head -1 | cut -f1)"
[ -n "$wid" ] || { echo "没找到窗口：$needle" >&2; exit 1; }
screencapture -x -o -l"$wid" "$out"
echo "→ $out"
