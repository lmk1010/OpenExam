import React, { useEffect, useState } from "react";

const CN = { yanyu: "言语理解", shuliang: "数量关系", panduan: "判断推理", ziliao: "资料分析", changshi: "常识判断" };
const COLORS = ["#6d5efb", "#1e78ff", "#00b894", "#f39c12", "#e74c3c"];

export default function Analytics() {
  const [stats, setStats] = useState({ totalQuestions: 0, totalDone: 0, accuracy: 0, wrongCount: 0, correctCount: 0 });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    (async () => {
      if (!window.openexam?.db) return;
      try {
        const [s, c] = await Promise.all([window.openexam.db.getPracticeStats(), window.openexam.db.getCategoryStats()]);
        setStats(s); setCategories(c);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const radarData = categories.map((c, i) => ({
    name: CN[c.category] || c.category,
    pct: c.total > 0 ? Math.round((c.done / c.total) * 100) : 0,
    total: c.total, done: c.done, color: COLORS[i % COLORS.length],
  }));

  return (
    <section className="main-panel module-page" style={{ overflow: "auto" }}>
      <div className="breadcrumb">我的 &gt; 分析报告</div>
      <div className="brand-row">
        <div className="brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
        </div>
        <h2>分析报告</h2>
      </div>

      <div className="bottom-row">
        <div className="info-card" style={{ gap: 12 }}>
          <div className="info-header"><h4>知识点掌握度</h4><span className="info-dot" /></div>
          {radarData.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 12 }}>暂无数据</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {radarData.map(d => (
                <div key={d.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                    <span style={{ fontWeight: 600 }}>{d.name}</span>
                    <span style={{ color: "var(--muted)" }}>{d.done}/{d.total} ({d.pct}%)</span>
                  </div>
                  <div className="progress">
                    <span className="progress-fill" style={{ width: `${d.pct}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="info-card" style={{ gap: 12 }}>
          <div className="info-header"><h4>综合正确率</h4><span className="info-dot" /></div>
          <div className="accuracy-content">
            <div className="donut" style={{ justifyContent: "center" }}>
              <div className="donut-ring" style={{
                background: `conic-gradient(var(--accent) 0deg ${stats.accuracy * 3.6}deg, rgba(109,94,251,0.15) ${stats.accuracy * 3.6}deg 360deg)`,
                width: 120, height: 120,
              }}>
                <div className="donut-inner" style={{ width: 82, height: 82 }}>
                  <span>{stats.accuracy}%</span>
                  <small>正确率</small>
                </div>
              </div>
            </div>
            <div className="active-split" style={{ justifyContent: "center", gap: 20, fontSize: 11 }}>
              <div className="split-item">
                <span className="split-dot" />
                <span className="split-label">正确 {stats.correctCount}</span>
              </div>
              <div className="split-item">
                <span className="split-dot light" />
                <span className="split-label">错误 {stats.wrongCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, background: "var(--surface-soft)", borderRadius: 10, padding: "12px 14px" }}>
        <div className="info-header" style={{ marginBottom: 8 }}><h4>AI 智能诊断</h4><span className="info-dot" /></div>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
          基于做题数据分析学习状况，请在「设置」中配置 AI 服务后可用。
        </p>
      </div>
    </section>
  );
}
