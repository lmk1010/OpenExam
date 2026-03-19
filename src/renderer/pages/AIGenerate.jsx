import React, { useState } from "react";
import { getAISettings, isAIConfigured } from "../store/aiSettings.js";

const CATEGORIES = [
  { key: "yanyu", name: "言语理解" }, { key: "shuliang", name: "数量关系" },
  { key: "panduan", name: "判断推理" }, { key: "ziliao", name: "资料分析" },
  { key: "changshi", name: "常识判断" },
];
const DIFFICULTIES = [
  { value: 1, label: "入门" }, { value: 2, label: "简单" }, { value: 3, label: "中等" },
  { value: 4, label: "较难" }, { value: 5, label: "困难" },
];

export default function AIGenerate() {
  const [config, setConfig] = useState({ category: "yanyu", difficulty: 3, count: 10, customPrompt: "" });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setError(null);
    if (!isAIConfigured() || !window.openexam?.ai) { setError("请先在「设置」中配置 AI 服务。"); return; }
    setGenerating(true);
    try {
      const settings = getAISettings();
      const result = await window.openexam.ai.generatePaper(settings, config);
      if (result.success && result.questions?.length) {
        setGenerated({ questions: result.questions, title: `${CATEGORIES.find(c => c.key === config.category)?.name} · ${DIFFICULTIES.find(d => d.value === config.difficulty)?.label}`, count: result.questions.length, time: new Date().toLocaleString() });
      } else { setError(result.error || "AI 未返回有效题目。"); }
    } catch (e) { setError(e.message || "出卷失败"); }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!generated?.questions?.length || !window.openexam?.db) return;
    try {
      const r = await window.openexam.db.importPaper({ title: generated.title, year: new Date().getFullYear() }, generated.questions);
      alert(`已保存 ${r.questionCount} 道题`);
    } catch (e) { alert("保存失败: " + e.message); }
  };

  return (
    <section className="main-panel module-page" style={{ overflow: "auto", gap: 10 }}>
      <div className="breadcrumb">AI 出卷 &gt; 智能生成</div>
      <div className="brand-row">
        <div className="brand-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
        </div>
        <h2>AI 智能出卷</h2>
        {!isAIConfigured() && (
          <span style={{ fontSize: 10, color: "#e67e22", marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            AI 未配置
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 10, flex: 1, minHeight: 0 }}>
        {/* Config — fixed narrow width */}
        <div className="info-card" style={{ gap: 12, overflow: "auto" }}>
          <div className="info-header"><h4>出卷配置</h4></div>

          <div>
            <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>分类</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <button key={c.key} className="chip" onClick={() => setConfig({ ...config, category: c.key })}
                  style={{ fontSize: 10, padding: "3px 8px", ...(config.category === c.key ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : { border: "1px solid var(--line)" }) }}>{c.name}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>难度</label>
            <div style={{ display: "flex", gap: 4 }}>
              {DIFFICULTIES.map(d => (
                <button key={d.value} className="chip" onClick={() => setConfig({ ...config, difficulty: d.value })}
                  style={{ fontSize: 10, padding: "3px 8px", flex: 1, ...(config.difficulty === d.value ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : { border: "1px solid var(--line)" }) }}>{d.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>
              <span>题数</span><strong style={{ color: "var(--text)" }}>{config.count}</strong>
            </label>
            <input type="range" min="5" max="50" step="5" value={config.count}
              onChange={e => setConfig({ ...config, count: +e.target.value })}
              style={{ width: "100%", accentColor: "var(--accent)" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>自定义要求</label>
            <textarea value={config.customPrompt} onChange={e => setConfig({ ...config, customPrompt: e.target.value })}
              placeholder="如：注重近义词辨析..."
              rows={2}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 11, resize: "none", fontFamily: "inherit", outline: "none" }} />
          </div>

          {error && <div style={{ padding: "5px 8px", borderRadius: 4, background: "rgba(231,76,60,0.06)", color: "#c0392b", fontSize: 10 }}>{error}</div>}

          <button onClick={handleGenerate} disabled={generating}
            style={{ padding: "8px 0", borderRadius: 6, border: "none", background: generating ? "var(--line)" : "var(--accent)", color: generating ? "var(--muted)" : "#fff", fontSize: 12, fontWeight: 600, cursor: generating ? "wait" : "pointer", width: "100%" }}>
            {generating ? "生成中..." : "开始生成"}
          </button>
        </div>

        {/* Preview — fills remaining width */}
        <div className="info-card" style={{ gap: 8, overflow: "auto" }}>
          <div className="info-header"><h4>生成预览</h4></div>
          {generated ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(109,94,251,0.05)", borderRadius: 6, marginBottom: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{generated.title}</span>
                <span style={{ fontSize: 9, color: "var(--muted)" }}>{generated.count}题</span>
                <button className="chip" onClick={handleSave} style={{ background: "var(--accent)", color: "#fff", fontSize: 9, padding: "2px 8px" }}>保存</button>
              </div>
              {generated.questions.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline", padding: "5px 0", borderBottom: "1px solid var(--line)", fontSize: 11, lineHeight: 1.5 }}>
                  <span style={{ color: "var(--muted)", fontSize: 9, width: 18, textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.content}</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: 10, flexShrink: 0 }}>{q.answer}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0.3 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>配置参数后点击生成</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
