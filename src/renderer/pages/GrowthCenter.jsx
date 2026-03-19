import React, { useState } from "react";

const generateHeatmap = () => {
  const days = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), level: i < 7 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 3) });
  }
  return days;
};

const ACHIEVEMENTS = [
  { icon: "target", name: "初次答题", desc: "完成第一道题", unlocked: true },
  { icon: "file", name: "百题斩", desc: "累计完成100道", unlocked: false },
  { icon: "zap", name: "连续7天", desc: "连续打卡7天", unlocked: false },
  { icon: "check", name: "满分达人", desc: "模拟考试满分", unlocked: false },
  { icon: "clock", name: "速度之星", desc: "30秒内答对", unlocked: false },
  { icon: "award", name: "知识大师", desc: "掌握度达80%", unlocked: false },
];

const I = ({ d, size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;

const ICONS = {
  target: <I d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z" />,
  file: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></>,
  zap: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></>,
  check: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></>,
  clock: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></>,
  award: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg></>,
};

export default function GrowthCenter() {
  const [heatmap] = useState(generateHeatmap);
  const exp = 45, maxExp = 100, level = 1;

  return (
    <section className="main-panel module-page" style={{ overflow: "auto", gap: 10 }}>
      <div className="breadcrumb">我的 &gt; 成长中心</div>
      <div className="brand-row">
        <div className="brand-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <h2>我的成长</h2>
      </div>

      {/* Top: Level + 3 Stats in one row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "stretch" }}>
        <div className="info-card" style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: "10px 12px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Lv.{level} <span style={{ fontWeight: 400, fontSize: 11, color: "var(--muted)" }}>新手学员</span></div>
            <div className="progress" style={{ margin: "4px 0 2px" }}><span className="progress-fill" style={{ width: `${(exp / maxExp) * 100}%` }} /></div>
            <div style={{ fontSize: 9, color: "var(--muted)" }}>{exp}/{maxExp} EXP</div>
          </div>
          <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 12, textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>0</div>
            <div style={{ fontSize: 8, color: "var(--muted)", marginTop: 2 }}>连续天数</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "今日做题", val: "0", unit: "道", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
            { label: "学习时长", val: "0", unit: "分钟", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
            { label: "正确率", val: "--", unit: "", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
          ].map(s => (
            <div key={s.label} className="info-card" style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: "10px 12px", minWidth: 100 }}>
              <div style={{ color: "var(--accent)", flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 8, color: "var(--muted)", lineHeight: 1, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>{s.val} <span style={{ fontSize: 9, fontWeight: 400, color: "var(--muted)" }}>{s.unit}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Heatmap + Achievements + Today Goal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, flex: 1, minHeight: 0 }}>
        {/* Heatmap */}
        <div className="info-card" style={{ gap: 8, overflow: "hidden" }}>
          <div className="info-header"><h4>学习日历</h4><span style={{ fontSize: 9, color: "var(--muted)" }}>90天</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: 2 }}>
            {heatmap.slice(0, 78).map(d => (
              <div key={d.date} title={d.date}
                style={{
                  aspectRatio: "1", borderRadius: 2,
                  background: d.level === 0 ? "rgba(109,94,251,0.06)" : d.level === 1 ? "rgba(109,94,251,0.2)" :
                    d.level === 2 ? "rgba(109,94,251,0.4)" : d.level === 3 ? "rgba(109,94,251,0.65)" : "var(--accent)",
                }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, fontSize: 8, color: "var(--muted)" }}>
            <span>少</span>
            {[0,1,2,3,4].map(l => <div key={l} style={{ width: 7, height: 7, borderRadius: 1, background: l === 0 ? "rgba(109,94,251,0.06)" : l === 1 ? "rgba(109,94,251,0.2)" : l === 2 ? "rgba(109,94,251,0.4)" : l === 3 ? "rgba(109,94,251,0.65)" : "var(--accent)" }} />)}
            <span>多</span>
          </div>
        </div>

        {/* Achievements */}
        <div className="info-card" style={{ gap: 6 }}>
          <div className="info-header"><h4>成就展柜</h4><span style={{ fontSize: 9, color: "var(--muted)" }}>{ACHIEVEMENTS.filter(a => a.unlocked).length}/{ACHIEVEMENTS.length}</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {ACHIEVEMENTS.map(a => (
              <div key={a.name} style={{
                display: "flex", gap: 8, alignItems: "center",
                padding: "6px 8px", borderRadius: 6,
                background: a.unlocked ? "var(--surface)" : "transparent",
                border: a.unlocked ? "1px solid var(--accent-soft)" : "1px solid var(--line)",
                opacity: a.unlocked ? 1 : 0.3,
              }}>
                <div style={{ color: a.unlocked ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>{ICONS[a.icon]}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>{a.name}</div>
                  <div style={{ fontSize: 8, color: "var(--muted)", marginTop: 1 }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today Goal + AI */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="info-card" style={{ gap: 8, flex: 1 }}>
            <div className="info-header"><h4>今日目标</h4><span className="info-dot" /></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>0</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>/ 50 题</span>
            </div>
            <div className="progress"><span className="progress-fill" style={{ width: "0%" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 6, marginTop: 2 }}>
              <span>学习时长</span><strong style={{ color: "var(--text)" }}>0 分钟</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 6 }}>
              <span>正确率</span><strong style={{ color: "var(--text)" }}>--</strong>
            </div>
          </div>
          <div className="info-card" style={{ gap: 6 }}>
            <div className="info-header"><h4>AI 诊断</h4></div>
            <p style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>配置 AI 服务后可智能分析学习状况，推荐个性化练习计划。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
