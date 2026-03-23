import React, { useState, useEffect } from "react";
import { ICONS, Ico, getAchievementTierStyle } from "../components/AchievementVisuals.jsx";
import AchievementTile, { AchievementRing } from "../components/AchievementTile.jsx";
import AchievementDialog from "../components/AchievementDialog.jsx";
import { normalizeAchievements } from "../utils/achievementUtils.js";

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHead = ({ icon, title, color = "var(--accent)", right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 9, borderBottom: "1px solid var(--line)", marginBottom: 2 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 20, height: 20, borderRadius: 5, background: `${color}18`, display: "grid", placeItems: "center" }}>
        <Ico d={icon} size={11} col={color} sw={2} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{title}</span>
    </div>
    {right}
  </div>
);

// ─── Heatmap cell colors ──────────────────────────────────────────────────────
const heatBg = lvl => [
  "var(--heatmap-level-0)",
  "var(--heatmap-level-1)",
  "var(--heatmap-level-2)",
  "var(--heatmap-level-3)",
  "var(--heatmap-level-4)",
][lvl] || "var(--heatmap-level-0)";

const formatHeatmapDate = (value) => {
  if (!value) return "最近 90 天";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const getHeatmapSummary = (cell) => {
  if (!cell?.date) {
    return {
      label: "最近 90 天",
      detail: "悬浮到方块上查看每天的学习情况",
      badge: "暂无数据",
      badgeColor: "var(--muted)",
      badgeBg: "var(--neutral-soft-bg)",
    };
  }

  if (cell.count > 0) {
    return {
      label: formatHeatmapDate(cell.date),
      detail: `当天完成 ${cell.count} 题 · ${cell.sessions || 0} 次练习`,
      badge: "已学习",
      badgeColor: "var(--success)",
      badgeBg: "var(--success-soft)",
    };
  }

  return {
    label: formatHeatmapDate(cell.date),
    detail: "当天暂无练习记录",
    badge: "未学习",
    badgeColor: "var(--muted)",
    badgeBg: "var(--neutral-soft-bg)",
  };
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GrowthCenter({ onOpenAchievements }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyGoal] = useState(50);
  const [hoveredHeatmapCell, setHoveredHeatmapCell] = useState(null);
  const [selectedAchievementId, setSelectedAchievementId] = useState(null);
  const [detailAchievementId, setDetailAchievementId] = useState(null);

  useEffect(() => {
    (async () => {
      if (!window.openexam?.db) { setLoading(false); return; }
      try { setData(await window.openexam.db.getGrowthData()); }
      catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <section className="main-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <span style={{ fontSize: 11 }}>加载成长数据…</span>
      </div>
    </section>
  );

  const d = data || { streak: 0, today: { total: 0, correct: 0, duration: 0 }, heatmap: [], achievements: [], practiceStats: { accuracy: 0, totalDone: 0, correctCount: 0, wrongCount: 0 }, totalMinutes: 0, level: 1, exp: 0, maxExp: 100, levelTitle: "新手学员" };
  const achievements = normalizeAchievements(d.achievements, d);

  const todayPct    = dailyGoal > 0 ? Math.min(100, Math.round((d.today.total / dailyGoal) * 100)) : 0;
  const unlockedCnt = achievements.filter(a => a.unlocked).length;
  const studyDays   = d.heatmap.filter(h => h.count > 0).length;
  const expPct      = d.maxExp > 0 ? Math.round((d.exp / d.maxExp) * 100) : 0;
  const todayAccuracy = d.today.total > 0 ? Math.round((d.today.correct / d.today.total) * 100) : null;

  const overallGoals = [
    { label: "入门 · 50题", target: 50, current: d.practiceStats.totalDone },
    { label: "进阶 · 200题", target: 200, current: d.practiceStats.totalDone },
    { label: "熟练 · 500题", target: 500, current: d.practiceStats.totalDone },
    { label: "专家 · 1000题", target: 1000, current: d.practiceStats.totalDone },
  ];

  const fallbackHeatmapCell = d.heatmap[d.heatmap.length - 1] || { date: "", count: 0, sessions: 0, level: 0 };
  const activeHeatmapCell = hoveredHeatmapCell?.date ? hoveredHeatmapCell : fallbackHeatmapCell;
  const heatmapSummary = getHeatmapSummary(activeHeatmapCell);
  const achievementPreviewCount = 6;
  const visibleAchievements = achievements.slice(0, achievementPreviewCount);
  const remainingAchievements = Math.max(0, achievements.length - achievementPreviewCount);
  const selectedAchievement = achievements.find(a => a.id === selectedAchievementId)
    || achievements.find(a => a.unlocked)
    || achievements[0]
    || null;
  const detailAchievement = achievements.find(a => a.id === detailAchievementId) || null;

  return (
    <section className="main-panel" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", boxSizing: "border-box" }}>

      {/* ── PAGE HEADER ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 22px 11px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>我的 › 成长中心</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)", display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 4px 12px rgba(15,23,42,0.12)" }}>
              <Ico d={ICONS.growth} size={13} col="#fff" sw={2} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>我的成长</h2>
          </div>
        </div>

        {/* Header pills */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "连续签到", val: `${d.streak}天`, color: d.streak >= 7 ? "var(--warning)" : "var(--accent)", bg: d.streak >= 7 ? "var(--warning-soft)" : "var(--accent-soft-bg)", border: d.streak >= 7 ? "var(--warning-border)" : "var(--accent-border-soft)" },
            { label: "今日目标", val: `${todayPct}%`, color: todayPct >= 100 ? "var(--success)" : "var(--accent)", bg: todayPct >= 100 ? "var(--success-soft)" : "var(--accent-soft-bg)", border: todayPct >= 100 ? "var(--success-border)" : "var(--accent-border-soft)" },
            { label: "正确率",   val: `${d.practiceStats.accuracy}%`, color: d.practiceStats.accuracy >= 80 ? "var(--success)" : d.practiceStats.accuracy >= 60 ? "var(--warning)" : "var(--text)", bg: "var(--neutral-soft-bg)", border: d.practiceStats.accuracy >= 80 ? "var(--success-border)" : d.practiceStats.accuracy >= 60 ? "var(--warning-border)" : "rgba(148,163,184,0.18)" },
          ].map(p => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, background: p.bg, borderRadius: 16, padding: "4px 11px", border: `1px solid ${p.border}` }}>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{p.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: p.color, fontFamily: "monospace" }}>{p.val}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── BODY: left sidebar + right panels ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>

        {/* LEFT SIDEBAR — Level, XP, daily stats */}
        <aside style={{ width: 210, flexShrink: 0, borderRight: "1px solid var(--line)", overflow: "auto", padding: "16px 16px 20px" }}>

          {/* Level card */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px 18px", background: "var(--accent-soft-bg)", borderRadius: 12, border: "1px solid var(--accent-border-soft)", marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 800, boxShadow: "0 10px 22px rgba(15,23,42,0.16)" }}>
              {d.level}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Lv.{d.level}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{d.levelTitle}</div>
            </div>
            {/* XP bar */}
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted)", marginBottom: 4 }}>
                <span>EXP</span>
                <span style={{ fontFamily: "monospace" }}>{d.exp}/{d.maxExp}</span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: "var(--accent-soft-bg-strong)", overflow: "hidden" }}>
                <div style={{ width: `${expPct}%`, height: "100%", background: "var(--accent)", borderRadius: 4, transition: "width 0.8s ease" }} />
              </div>
            </div>
          </div>

          {/* Today's data */}
          <div style={{ marginBottom: 16 }}>
            <SectionHead icon={ICONS.clock} title="今日数据" color="var(--info)" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 8 }}>
              {[
                { label: "做题量", val: d.today.total, unit: "道", icon: ICONS.book,    color: "var(--accent)" },
                { label: "正确率", val: todayAccuracy !== null ? todayAccuracy + "%" : "--", unit: "", icon: ICONS.correct, color: "var(--success)" },
                { label: "学习时长", val: d.today.duration, unit: "分钟", icon: ICONS.clock,  color: "var(--warning)" },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px dashed var(--line)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Ico d={row.icon} size={12} col={row.color} sw={2} />
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{row.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: row.color, fontFamily: "monospace" }}>
                    {row.val}<span style={{ fontSize: 9, fontWeight: 400, color: "var(--muted)", fontFamily: "sans-serif", marginLeft: 1 }}>{row.unit}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Today progress bar */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>
                <span>今日目标</span>
                <span style={{ color: todayPct >= 100 ? "var(--success)" : "var(--accent)", fontWeight: 600 }}>
                  {d.today.total}/{dailyGoal}
                  {todayPct >= 100 && " ✓"}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: "var(--neutral-soft-bg)", overflow: "hidden" }}>
                <div style={{ width: `${todayPct}%`, height: "100%", borderRadius: 4, background: todayPct >= 100 ? "var(--success)" : "var(--accent)", transition: "width 0.8s ease" }} />
              </div>
            </div>
          </div>

          {/* Cumulative stats */}
          <div style={{ marginBottom: 16 }}>
            <SectionHead icon={ICONS.chart} title="累计数据" color="var(--success)" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {[
                { label: "累计做题", val: d.practiceStats.totalDone, color: "var(--accent)", bg: "var(--accent-soft-bg)", border: "var(--accent-border-soft)", icon: ICONS.book },
                { label: "正确解答", val: d.practiceStats.correctCount || 0, color: "var(--success)", bg: "var(--success-soft)", border: "var(--success-border)", icon: ICONS.correct },
                { label: "错误累计", val: d.practiceStats.wrongCount  || 0, color: "var(--danger)", bg: "var(--danger-soft)", border: "var(--danger-border)", icon: ICONS.wrong },
                { label: "学习天数", val: studyDays, color: "var(--warning)", bg: "var(--warning-soft)", border: "var(--warning-border)", icon: ICONS.days },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "9px 10px", background: item.bg, borderRadius: 9, border: `1px solid ${item.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Ico d={item.icon} size={11} col={item.color} sw={2} />
                    <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: "monospace", lineHeight: 1 }}>{item.val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI suggestion */}
          <div style={{ background: "var(--accent-soft-bg)", border: "1px dashed var(--accent-border-soft)", borderRadius: 10, padding: "11px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
              <Ico d={ICONS.ai} size={11} col="var(--accent)" sw={2} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>AI 建议</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>
              {d.practiceStats.totalDone > 0
                ? (d.practiceStats.accuracy < 60
                    ? "建议重点复习错题，强化薄弱知识点。"
                    : d.practiceStats.accuracy < 80
                    ? "状态良好，可适当提升练习难度。"
                    : "成绩优秀！建议挑战模拟考试。")
                : "开始刷题后，AI 将自动生成专属提升计划。"}
            </p>
          </div>
        </aside>

        {/* RIGHT: heatmap + achievements + goals */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 22 }}>

            {/* col 1 — heatmap + stage goals */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Heatmap */}
              <div>
                <SectionHead icon={ICONS.days} title="学习日历" color="var(--info)"
                  right={<span style={{ fontSize: 10, color: "var(--muted)" }}>近 90 天</span>} />
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: "linear-gradient(180deg, var(--accent-soft-bg-strong) 0%, var(--accent-soft-bg) 100%)",
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{heatmapSummary.label}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{heatmapSummary.detail}</div>
                    </div>
                    <span style={{
                      flexShrink: 0,
                      fontSize: 10,
                      fontWeight: 600,
                      color: heatmapSummary.badgeColor,
                      background: heatmapSummary.badgeBg,
                      borderRadius: 999,
                      padding: "4px 9px",
                    }}>{heatmapSummary.badge}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(13, minmax(0, 1fr))", gap: 4 }}>
                    {(d.heatmap.length > 0 ? d.heatmap.slice(0, 91) : Array.from({ length: 91 }, () => ({ date: "", count: 0, sessions: 0, level: 0 }))).map((cell, idx) => {
                      const isActive = !!cell.date && activeHeatmapCell?.date === cell.date;
                      return (
                        <div
                          key={idx}
                          title={cell.date ? `${cell.date} · ${cell.count}题 · ${cell.sessions || 0}次练习` : ""}
                          style={{
                            aspectRatio: "1",
                            borderRadius: 4,
                            background: heatBg(cell.level),
                            cursor: "pointer",
                            border: isActive ? "1px solid var(--accent-border-soft)" : "1px solid rgba(148,163,184,0.14)",
                            boxShadow: isActive ? "0 8px 16px rgba(15,23,42,0.14)" : "none",
                            transform: isActive ? "translateY(-1px)" : "none",
                            transition: "all 0.16s ease",
                            position: "relative",
                            overflow: "hidden",
                          }}
                          onMouseEnter={() => setHoveredHeatmapCell(cell)}
                          onMouseLeave={() => setHoveredHeatmapCell(null)}
                        >
                          {cell.count > 0 && (
                            <span style={{
                              position: "absolute",
                              right: 2,
                              bottom: 2,
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: "var(--heatmap-dot-bg)",
                            }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--muted)" }}>
                      <span>少</span>
                      {[0, 1, 2, 3, 4].map(level => (
                        <div key={level} style={{ width: 8, height: 8, borderRadius: 2, background: heatBg(level) }} />
                      ))}
                      <span>多</span>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>悬浮查看当天题量与练习次数</span>
                  </div>
                </div>
              </div>

              {/* Stage goals */}
              <div>
                <SectionHead icon={ICONS.target} title="阶段目标" color="var(--warning)" />
                <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 10 }}>
                  {overallGoals.map(goal => {
                    const pct  = goal.current >= goal.target ? 100 : goal.current > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
                    const done = goal.current >= goal.target;
                    return (
                      <div key={goal.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, fontSize: 11 }}>
                          <span style={{ color: done ? "var(--accent)" : "var(--text)", fontWeight: done ? 600 : 400 }}>{goal.label}</span>
                          <span style={{ color: done ? "var(--success)" : "var(--muted)", fontWeight: done ? 700 : 400, fontFamily: "monospace", fontSize: 10 }}>
                            {done ? "✓ 完成" : `${pct}%`}
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 4, background: "var(--neutral-soft-bg)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: done ? "var(--success)" : "var(--accent)", borderRadius: 4, transition: "width 0.8s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* col 2 — achievements */}
            <div>
              <SectionHead icon={ICONS.trophy} title="成就展柜" color="var(--warning)"
                right={<span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>{unlockedCnt}/{achievements.length} 已解锁</span>} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {selectedAchievement && (
                  <button
                    type="button"
                    onClick={() => setDetailAchievementId(selectedAchievement.id)}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 0 12px",
                      borderBottom: "1px solid rgba(148,163,184,0.14)",
                      width: "100%",
                      background: "transparent",
                      borderTop: "none",
                      borderLeft: "none",
                      borderRight: "none",
                      textAlign: "left",
                      cursor: "pointer",
                    }}>
                    <AchievementRing achievement={selectedAchievement} size={64} compact />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{selectedAchievement.name}</span>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: selectedAchievement.unlocked ? "var(--success)" : "var(--muted)",
                          background: selectedAchievement.unlocked ? "var(--success-soft)" : "var(--neutral-soft-bg)",
                          borderRadius: 999,
                          padding: "2px 6px",
                        }}>{selectedAchievement.unlocked ? "已解锁" : "待解锁"}</span>
                        {selectedAchievement.tier && (() => {
                          const tierStyle = getAchievementTierStyle(selectedAchievement.tier);
                          return (
                            <span style={{ fontSize: 9, color: tierStyle.color, background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, borderRadius: 999, padding: "2px 6px", fontWeight: 700 }}>{tierStyle.label}</span>
                          );
                        })()}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.55, marginTop: 4 }}>{selectedAchievement.desc}</div>
                      <div style={{ fontSize: 10, color: selectedAchievement.unlocked ? "var(--success)" : "var(--accent)", marginTop: 5, fontWeight: 700 }}>{selectedAchievement.progressText}</div>
                    </div>
                  </button>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {visibleAchievements.map((ach) => {
                    const isSelected = selectedAchievement?.id === ach.id;
                    return (
                      <AchievementTile
                        key={ach.id}
                        achievement={ach}
                        compact
                        selected={isSelected}
                        showDetail={false}
                        onClick={() => { setSelectedAchievementId(ach.id); setDetailAchievementId(ach.id); }}
                      />
                    );
                  })}

                  {achievements.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", padding: "30px 0", textAlign: "center", color: "var(--muted)", fontSize: 11, opacity: 0.5 }}>
                      完成练习后成就将自动解锁
                    </div>
                  )}
                </div>

                {remainingAchievements > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenAchievements?.()}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: "1px solid var(--accent-border-soft)",
                      background: "var(--accent-soft-bg)",
                      color: "var(--accent)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    查看全部成就 · 还有 {remainingAchievements} 项
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <AchievementDialog achievement={detailAchievement} onClose={() => setDetailAchievementId(null)} />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </section>
  );
}
