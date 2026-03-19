import React, { useState, useEffect } from "react";

// ─── Icon helper ──────────────────────────────────────────────────────────────
const Ico = ({ d, size = 14, col = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const ICONS = {
  trophy:  <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>,
  streak:  <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  check:   <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  clock:   <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  target:  <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  star:    <><path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/></>,
  book:    <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
  chart:   <><path d="M18 20V10M12 20V4M6 20v-6"/></>,
  growth:  <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
  correct: <><polyline points="20 6 9 17 4 12"/></>,
  wrong:   <><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/></>,
  days:    <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  ai:      <><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z"/></>,
  first:   <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  speed:   <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  hundred: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
};

const ACH_ICONS = {
  first:   ICONS.first,
  hundred: ICONS.hundred,
  streak7: ICONS.streak,
  perfect: ICONS.check,
  speed:   ICONS.speed,
  master:  ICONS.trophy,
};

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
  "rgba(109,94,251,0.05)",
  "rgba(109,94,251,0.18)",
  "rgba(109,94,251,0.38)",
  "rgba(109,94,251,0.62)",
  "var(--accent)",
][lvl] || "rgba(109,94,251,0.05)";

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GrowthCenter() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyGoal]           = useState(50);

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

  const todayPct    = dailyGoal > 0 ? Math.min(100, Math.round((d.today.total / dailyGoal) * 100)) : 0;
  const unlockedCnt = d.achievements.filter(a => a.unlocked).length;
  const studyDays   = d.heatmap.filter(h => h.count > 0).length;
  const expPct      = d.maxExp > 0 ? Math.round((d.exp / d.maxExp) * 100) : 0;
  const todayAccuracy = d.today.total > 0 ? Math.round((d.today.correct / d.today.total) * 100) : null;

  const overallGoals = [
    { label: "入门 · 50题",   target: 50,  current: d.practiceStats.totalDone },
    { label: "进阶 · 200题",  target: 200, current: d.practiceStats.totalDone },
    { label: "熟练 · 500题",  target: 500, current: d.practiceStats.totalDone },
    { label: "专家 · 1000题", target: 1000,current: d.practiceStats.totalDone },
  ];

  return (
    <section className="main-panel" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", boxSizing: "border-box" }}>

      {/* ── PAGE HEADER ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 22px 11px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>我的 › 成长中心</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, var(--accent) 0%, #3b28cc 100%)", display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 3px 9px rgba(109,94,251,0.22)" }}>
              <Ico d={ICONS.growth} size={13} col="#fff" sw={2} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>我的成长</h2>
          </div>
        </div>

        {/* Header pills */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "连续签到", val: `${d.streak}天`, color: d.streak >= 7 ? "#f39c12" : "var(--accent)", bg: d.streak >= 7 ? "rgba(243,156,18,0.08)" : "rgba(109,94,251,0.07)" },
            { label: "今日目标", val: `${todayPct}%`, color: todayPct >= 100 ? "#00b894" : "var(--accent)", bg: todayPct >= 100 ? "rgba(0,184,148,0.08)" : "rgba(109,94,251,0.07)" },
            { label: "正确率",   val: `${d.practiceStats.accuracy}%`, color: d.practiceStats.accuracy >= 80 ? "#00b894" : d.practiceStats.accuracy >= 60 ? "#f39c12" : "var(--text)", bg: "rgba(0,0,0,0.03)" },
          ].map(p => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, background: p.bg, borderRadius: 16, padding: "4px 11px", border: `1px solid ${p.color}1a` }}>
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px 18px", background: "rgba(109,94,251,0.04)", borderRadius: 12, border: "1px solid rgba(109,94,251,0.1)", marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent) 0%, #3b28cc 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 800, boxShadow: "0 4px 14px rgba(109,94,251,0.3)" }}>
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
              <div style={{ height: 4, borderRadius: 4, background: "rgba(109,94,251,0.12)", overflow: "hidden" }}>
                <div style={{ width: `${expPct}%`, height: "100%", background: "var(--accent)", borderRadius: 4, transition: "width 0.8s ease" }} />
              </div>
            </div>
          </div>

          {/* Today's data */}
          <div style={{ marginBottom: 16 }}>
            <SectionHead icon={ICONS.clock} title="今日数据" color="#1e78ff" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 8 }}>
              {[
                { label: "做题量", val: d.today.total, unit: "道", icon: ICONS.book,    color: "var(--accent)" },
                { label: "正确率", val: todayAccuracy !== null ? todayAccuracy + "%" : "--", unit: "", icon: ICONS.correct, color: "#00b894" },
                { label: "学习时长", val: d.today.duration, unit: "分钟", icon: ICONS.clock,  color: "#f39c12" },
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
                <span style={{ color: todayPct >= 100 ? "#00b894" : "var(--accent)", fontWeight: 600 }}>
                  {d.today.total}/{dailyGoal}
                  {todayPct >= 100 && " ✓"}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                <div style={{ width: `${todayPct}%`, height: "100%", borderRadius: 4, background: todayPct >= 100 ? "#00b894" : "var(--accent)", transition: "width 0.8s ease" }} />
              </div>
            </div>
          </div>

          {/* Cumulative stats */}
          <div style={{ marginBottom: 16 }}>
            <SectionHead icon={ICONS.chart} title="累计数据" color="#00b894" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {[
                { label: "累计做题", val: d.practiceStats.totalDone, color: "var(--accent)", icon: ICONS.book },
                { label: "正确解答", val: d.practiceStats.correctCount || 0, color: "#00b894", icon: ICONS.correct },
                { label: "错误累计", val: d.practiceStats.wrongCount  || 0, color: "#e74c3c", icon: ICONS.wrong },
                { label: "学习天数", val: studyDays, color: "#f39c12", icon: ICONS.days },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "9px 10px", background: `${item.color}09`, borderRadius: 9, border: `1px solid ${item.color}18` }}>
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
          <div style={{ background: "rgba(109,94,251,0.04)", border: "1px dashed rgba(109,94,251,0.2)", borderRadius: 10, padding: "11px 12px" }}>
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
                <SectionHead icon={ICONS.days} title="学习日历" color="#1e78ff"
                  right={<span style={{ fontSize: 10, color: "var(--muted)" }}>近 90 天</span>} />
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: 3 }}>
                    {(d.heatmap.length > 0 ? d.heatmap.slice(0, 91) : Array(91).fill({ date: "", count: 0, level: 0 })).map((cell, idx) => (
                      <div key={idx} title={cell.date ? `${cell.date}: ${cell.count} 题` : ""}
                        style={{ aspectRatio: "1", borderRadius: 3, background: heatBg(cell.level), cursor: cell.count > 0 ? "pointer" : "default", transition: "transform 0.1s" }}
                        onMouseEnter={e => { if (cell.count > 0) e.currentTarget.style.transform = "scale(1.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--muted)", marginTop: 8, justifyContent: "flex-end" }}>
                    <span>少</span>
                    {[0,1,2,3,4].map(l => <div key={l} style={{ width: 8, height: 8, borderRadius: 2, background: heatBg(l) }} />)}
                    <span>多</span>
                  </div>
                </div>
              </div>

              {/* Stage goals */}
              <div>
                <SectionHead icon={ICONS.target} title="阶段目标" color="#f39c12" />
                <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 10 }}>
                  {overallGoals.map(goal => {
                    const pct  = goal.current >= goal.target ? 100 : goal.current > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
                    const done = goal.current >= goal.target;
                    return (
                      <div key={goal.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, fontSize: 11 }}>
                          <span style={{ color: done ? "var(--accent)" : "var(--text)", fontWeight: done ? 600 : 400 }}>{goal.label}</span>
                          <span style={{ color: done ? "#00b894" : "var(--muted)", fontWeight: done ? 700 : 400, fontFamily: "monospace", fontSize: 10 }}>
                            {done ? "✓ 完成" : `${pct}%`}
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 4, background: "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: done ? "#00b894" : "var(--accent)", borderRadius: 4, transition: "width 0.8s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* col 2 — achievements */}
            <div>
              <SectionHead icon={ICONS.trophy} title="成就展柜" color="#f39c12"
                right={<span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>{unlockedCnt}/{d.achievements.length} 已解锁</span>} />
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 8 }}>
                {d.achievements.map((ach, i, arr) => (
                  <div key={ach.id} style={{
                    display: "flex", gap: 10, alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                    opacity: ach.unlocked ? 1 : 0.38,
                    transition: "opacity 0.3s",
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: ach.unlocked ? "rgba(109,94,251,0.1)" : "var(--surface-soft)",
                      color: ach.unlocked ? "var(--accent)" : "var(--muted)",
                      display: "grid", placeItems: "center",
                      boxShadow: ach.unlocked ? "0 2px 8px rgba(109,94,251,0.12)" : "none",
                    }}>
                      <Ico d={ACH_ICONS[ach.id] || ICONS.first} size={15} col={ach.unlocked ? "var(--accent)" : "var(--muted)"} sw={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{ach.name}</span>
                        {ach.unlocked && (
                          <span style={{ fontSize: 9, color: "#00b894", background: "rgba(0,184,148,0.1)", padding: "1px 5px", borderRadius: 3, fontWeight: 600, flexShrink: 0 }}>已解锁</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>{ach.desc}</div>
                    </div>
                  </div>
                ))}
                {d.achievements.length === 0 && (
                  <div style={{ padding: "30px 0", textAlign: "center", color: "var(--muted)", fontSize: 11, opacity: 0.5 }}>
                    完成练习后成就将自动解锁
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </section>
  );
}
