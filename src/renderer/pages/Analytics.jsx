import React, { useEffect, useState, useRef } from "react";

const CN = {
  yanyu: "言语理解",
  shuliang: "数量关系",
  panduan: "判断推理",
  ziliao: "资料分析",
  changshi: "常识判断",
};

const SPECTRUM = [
  { color: "#6d5efb", bg: "rgba(109,94,251,0.10)", light: "rgba(109,94,251,0.06)" },
  { color: "#1e78ff", bg: "rgba(30,120,255,0.10)",  light: "rgba(30,120,255,0.06)" },
  { color: "#00b894", bg: "rgba(0,184,148,0.10)",   light: "rgba(0,184,148,0.06)" },
  { color: "#f39c12", bg: "rgba(243,156,18,0.10)",  light: "rgba(243,156,18,0.06)" },
  { color: "#e74c3c", bg: "rgba(231,76,60,0.10)",   light: "rgba(231,76,60,0.06)" },
];

// ─── Mini SVG icons ──────────────────────────────────────────────────────────
const Icon = ({ path, size = 14, color = "currentColor", sw = 1.8, extra }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {path}
    {extra}
  </svg>
);

const ICONS = {
  bar:    <><path d="M18 20V10M12 20V4M6 20v-6"/></>,
  target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  pie:    <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></>,
  check:  <><polyline points="20 6 9 17 4 12"/></>,
  cross:  <><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/></>,
  flash:  <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  book:   <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
  chat:   <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>,
  trend:  <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  clock:  <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
};

// ─── Compact category progress bar ───────────────────────────────────────────
function CategoryRow({ name, pct, done, total, color, bg, rank }) {
  const rankColors = ["#f39c12","#95a5a6","#cd7f32"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* rank badge */}
      <span style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 800, fontStyle: "italic",
        color: rank < 3 ? rankColors[rank] : "var(--muted)",
      }}>{rank + 1}</span>

      {/* label */}
      <span style={{ fontSize: 12, fontWeight: 500, width: 62, flexShrink: 0, color: "var(--text)" }}>
        {name}
      </span>

      {/* bar */}
      <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,0.05)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
          borderRadius: 10, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)"
        }}/>
      </div>

      {/* right meta */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexShrink: 0, minWidth: 90, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color }}>{pct}%</span>
        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace" }}>{done}/{total}</span>
      </div>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, icon, color, bg, note }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      background: bg, borderRadius: 12, padding: "14px 16px",
      border: `1px solid ${color}22`,
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 16px ${color}18`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: `${color}18`,
          display: "grid", placeItems: "center", color,
        }}>
          <Icon path={icon} size={13} color={color} sw={2} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--text)", fontFamily: "monospace" }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{unit}</span>}
      </div>
      {note && <span style={{ fontSize: 10, color, fontWeight: 500 }}>{note}</span>}
    </div>
  );
}

// ─── Donut mini chart ────────────────────────────────────────────────────────
function DonutRing({ pct, size = 72, stroke = 7, color = "#6d5efb", label }) {
  const R = (size - stroke) / 2;
  const circ = 2 * Math.PI * R;
  const dash = circ * (pct / 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={R} fill="none"
          stroke={`${color}20`} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={R} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)" }}/>
      </svg>
      <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500, marginTop: -2 }}>{label}</span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ icon, title, iconColor = "var(--accent)", action }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      paddingBottom: 10, borderBottom: "1px solid var(--line)", marginBottom: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, background: `${iconColor}14`,
          display: "grid", placeItems: "center", color: iconColor, flexShrink: 0,
        }}>
          <Icon path={icon} size={12} color={iconColor} sw={2} />
        </div>
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--text)" }}>{title}</h3>
      </div>
      {action}
    </div>
  );
}

// ─── Horizontal stacked bar (correct vs wrong) ───────────────────────────────
function StackedBar({ correct, wrong, total }) {
  const pctC = total > 0 ? (correct / total) * 100 : 0;
  const pctW = total > 0 ? (wrong / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", height: 8, borderRadius: 8, overflow: "hidden", gap: 2 }}>
        <div style={{ width: `${pctC}%`, background: "#00b894", borderRadius: "8px 0 0 8px", transition: "width 0.8s ease" }}/>
        <div style={{ width: `${pctW}%`, background: "#e74c3c", borderRadius: "0 8px 8px 0", transition: "width 0.8s ease" }}/>
        <div style={{ flex: 1, background: "rgba(0,0,0,0.06)" }}/>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: "#00b894", flexShrink: 0 }}/>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>正确 <b style={{ color: "var(--text)" }}>{correct}</b></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: "#e74c3c", flexShrink: 0 }}/>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>错误 <b style={{ color: "var(--text)" }}>{wrong}</b></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: "rgba(0,0,0,0.08)", flexShrink: 0 }}/>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>未做 <b style={{ color: "var(--text)" }}>{Math.max(0, total - correct - wrong)}</b></span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [stats, setStats] = useState({
    totalQuestions: 0, totalDone: 0, accuracy: 0,
    wrongCount: 0, correctCount: 0,
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    (async () => {
      if (!window.openexam?.db) return;
      try {
        const [s, c] = await Promise.all([
          window.openexam.db.getPracticeStats(),
          window.openexam.db.getCategoryStats(),
        ]);
        setStats(s);
        setCategories(c);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const totalPossible  = categories.reduce((sum, c) => sum + c.total, 0);
  const totalDone      = categories.reduce((sum, c) => sum + (c.done || 0), 0);
  const completionRate = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  const unanswered     = Math.max(0, totalPossible - stats.correctCount - stats.wrongCount);

  const radarData = categories
    .map((c, i) => ({
      name: CN[c.category] || c.category,
      pct: c.total > 0 ? Math.round(((c.done || 0) / c.total) * 100) : 0,
      total: c.total, done: c.done || 0,
      ...SPECTRUM[i % SPECTRUM.length],
    }))
    .sort((a, b) => b.pct - a.pct);

  /* ──── Card data arrays ──── */
  const summaryCards = [
    { label: "题库总量",   value: totalPossible.toLocaleString(), unit: "道", icon: ICONS.book,  color: "#6d5efb", bg: "rgba(109,94,251,0.06)" },
    { label: "已练习量",   value: totalDone.toLocaleString(),     unit: "道", icon: ICONS.flash, color: "#1e78ff", bg: "rgba(30,120,255,0.06)", note: `完成度 ${completionRate}%` },
    { label: "综合正确率", value: `${stats.accuracy}`,            unit: "%",  icon: ICONS.check, color: "#00b894", bg: "rgba(0,184,148,0.06)", note: `正确 ${stats.correctCount} 道` },
    { label: "待攻克题目", value: stats.wrongCount.toLocaleString(), unit: "道", icon: ICONS.cross, color: "#e74c3c", bg: "rgba(231,76,60,0.06)", note: "错误 / 跳过" },
  ];

  return (
    <section className="main-panel" style={{
      padding: "0 0 0 0",
      display: "flex", flexDirection: "column",
      overflow: "hidden", height: "100%", boxSizing: "border-box",
    }}>
      {/* ── Page Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px 12px 22px", borderBottom: "1px solid var(--line)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>我的 › 分析报告</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #6d5efb 0%, #3b28cc 100%)",
              display: "grid", placeItems: "center", color: "#fff",
              boxShadow: "0 4px 10px rgba(109,94,251,0.22)",
            }}>
              <Icon path={ICONS.bar} size={14} color="#fff" sw={2} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.4px" }}>分析报告</h2>
          </div>
        </div>

        {/* Header stats pills */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "总进度", val: `${completionRate}%`, color: "#6d5efb", bg: "rgba(109,94,251,0.08)" },
            { label: "正确率", val: `${stats.accuracy}%`, color: "#00b894", bg: "rgba(0,184,148,0.08)" },
          ].map(p => (
            <div key={p.label} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: p.bg, borderRadius: 20, padding: "5px 12px",
              border: `1px solid ${p.color}22`,
            }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{p.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: "monospace" }}>{p.val}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 24px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Row 1 — 4 summary stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {summaryCards.map(c => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>

        {/* Row 2 — two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, flex: 1, minHeight: 0 }}>

          {/* LEFT: category mastery */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionHead icon={ICONS.target} title="知识板块掌握度" iconColor="#6d5efb" />

            {radarData.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8, padding: "60px 0", opacity: 0.45 }}>
                <Icon path={ICONS.bar} size={28} color="var(--muted)" sw={1.3} />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>开始练习后将显示各板块掌握情况</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {radarData.map((d, idx) => (
                  <CategoryRow key={d.name} rank={idx} {...d} />
                ))}
              </div>
            )}

            {/* Stacked answer distribution */}
            <div style={{ marginTop: 8 }}>
              <SectionHead icon={ICONS.trend} title="答题分布总览" iconColor="#1e78ff" />
              <div style={{ marginTop: 12 }}>
                <StackedBar
                  correct={stats.correctCount}
                  wrong={stats.wrongCount}
                  total={totalPossible}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: ring charts + AI terminal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Donut trio */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHead icon={ICONS.pie} title="核心指标" iconColor="#f39c12" />
              <div style={{
                display: "flex", justifyContent: "space-around", alignItems: "flex-start",
                padding: "16px 8px 12px",
                background: "rgba(109,94,251,0.03)", borderRadius: 12,
                border: "1px solid var(--line)",
              }}>
                {[
                  { pct: completionRate,   color: "#6d5efb", label: "完成度" },
                  { pct: stats.accuracy,   color: "#00b894", label: "正确率" },
                  { pct: totalPossible > 0 ? Math.round((stats.wrongCount / totalPossible) * 100) : 0,
                    color: "#e74c3c", label: "错误率" },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ position: "relative" }}>
                      <DonutRing pct={r.pct} size={68} stroke={6} color={r.color} label="" />
                      <div style={{
                        position: "absolute", inset: 0, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        paddingBottom: 2,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: r.color, fontFamily: "monospace" }}>{r.pct}%</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SectionHead icon={ICONS.flash} title="答题明细" iconColor="#00b894" />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { label: "正确解答", val: stats.correctCount, unit: "道", color: "#00b894", icon: ICONS.check },
                  { label: "错误 / 跳过", val: stats.wrongCount, unit: "道", color: "#e74c3c", icon: ICONS.cross },
                  { label: "尚未练习", val: unanswered, unit: "道", color: "var(--muted)", icon: ICONS.clock },
                  { label: "总做题量", val: stats.totalDone, unit: "道", color: "var(--accent)", icon: ICONS.trend, bold: true },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 0",
                    borderBottom: i < arr.length - 1 ? "1px dashed var(--line)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ color: row.color, opacity: 0.8, display: "flex" }}>
                        <Icon path={row.icon} size={13} color={row.color} sw={2} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{row.label}</span>
                    </div>
                    <span style={{
                      fontSize: row.bold ? 14 : 13,
                      fontWeight: row.bold ? 700 : 600,
                      color: row.color, fontFamily: "monospace",
                    }}>
                      {row.val.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2, color: "var(--muted)", fontFamily: "sans-serif" }}>{row.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI terminal */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <SectionHead icon={ICONS.chat} title="AI 智能诊断" iconColor="#B53471" />
              <div style={{
                flex: 1, borderRadius: 10, padding: "14px",
                background: "rgba(181,52,113,0.03)",
                border: "1px dashed rgba(109,94,251,0.25)",
                fontSize: 12, color: "var(--muted)", lineHeight: 1.65,
                fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 8,
                backgroundImage: "radial-gradient(rgba(109,94,251,0.08) 1px, transparent 1px)",
                backgroundSize: "34px 34px",
              }}>
                <div>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>[SYSTEM]</span> 智能诊断节点
                </div>
                <div style={{ opacity: 0.7 }}>
                  &gt; 诊断服务未启用。<br/>
                  &gt; 请配置大模型 API Key 后激活。
                </div>
                <div
                  style={{
                    marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 10px", background: "rgba(109,94,251,0.09)",
                    color: "var(--accent)", borderRadius: 6, cursor: "pointer",
                    fontSize: 11, fontFamily: "sans-serif", fontWeight: 500,
                    border: "1px solid rgba(109,94,251,0.15)", transition: "background 0.2s",
                    alignSelf: "flex-start",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(109,94,251,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(109,94,251,0.09)"}
                >
                  <Icon path={<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>} size={11} color="var(--accent)" sw={2} />
                  前往设置 / Settings
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
