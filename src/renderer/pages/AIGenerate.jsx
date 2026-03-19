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
    <section className="main-panel module-page" style={{ padding: "0 20px", gap: 20, overflow: "auto" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <div className="breadcrumb" style={{ margin: 0 }}>AI 出卷 &gt; 智能生成</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(109,94,251,0.1)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>AI 智能出卷</h2>
          {!isAIConfigured() && (
            <span style={{ fontSize: 11, color: "#e67e22", marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(230,126,34,0.1)", borderRadius: 20 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              AI 未配置
            </span>
          )}
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 32, flex: 1, minHeight: 0, paddingBottom: 20 }}>
        {/* Config Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingRight: 20, borderRight: "1px solid var(--line)" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600 }}>出卷配置</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Category */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>题目分类</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setConfig({ ...config, category: c.key })}
                    style={{ 
                      fontSize: 11, padding: "4px 12px", borderRadius: 16, cursor: "pointer", transition: "all 0.2s",
                      ...(config.category === c.key ? 
                        { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", boxShadow: "0 2px 8px rgba(109,94,251,0.25)" } : 
                        { background: "transparent", color: "var(--muted)", border: "1px solid var(--line)" }) 
                    }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>难度层级</label>
              <div style={{ display: "flex", gap: 4 }}>
                {DIFFICULTIES.map(d => (
                  <button key={d.value} onClick={() => setConfig({ ...config, difficulty: d.value })}
                    style={{ 
                      fontSize: 11, padding: "4px 0", flex: 1, borderRadius: 6, cursor: "pointer", transition: "all 0.2s",
                      ...(config.difficulty === d.value ? 
                        { background: "var(--surface-soft)", color: "var(--accent)", border: "1px solid var(--accent)", fontWeight: 600 } : 
                        { background: "transparent", color: "var(--muted)", border: "1px solid var(--line)" }) 
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>
                <span>生成题数</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{config.count} 题</span>
              </label>
              <input type="range" min="5" max="50" step="5" value={config.count}
                onChange={e => setConfig({ ...config, count: +e.target.value })}
                style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            {/* Custom Prompt */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>附加要求 (可选)</label>
              <textarea value={config.customPrompt} onChange={e => setConfig({ ...config, customPrompt: e.target.value })}
                placeholder="例如：侧重经济学相关常识、或强调近义词辨析..."
                rows={3}
                style={{ 
                  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", 
                  background: "var(--surface)", color: "var(--text)", fontSize: 11, resize: "none", 
                  fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" 
                }} 
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--line)"}
              />
            </div>
          </div>

          {error && <div style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(231,76,60,0.06)", color: "#c0392b", fontSize: 10, display: "flex", gap: 4, alignItems: "flex-start" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ lineHeight: 1.4 }}>{error}</span>
          </div>}

          <button onClick={handleGenerate} disabled={generating}
            style={{ 
              marginTop: "auto", padding: "10px 0", borderRadius: 6, border: "none", 
              background: generating ? "var(--surface-soft)" : "var(--accent)", 
              color: generating ? "var(--muted)" : "#fff", 
              fontSize: 13, fontWeight: 600, cursor: generating ? "wait" : "pointer", 
              width: "100%", transition: "all 0.2s",
              boxShadow: generating ? "none" : "0 4px 12px rgba(109,94,251,0.2)"
            }}>
            {generating ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                生成中...
              </span>
            ) : "开始生成试卷"}
          </button>
        </div>

        {/* Preview Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600 }}>生成预览</h3>
          
          {generated ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto", paddingRight: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(109,94,251,0.04)", borderRadius: 8, border: "1px solid rgba(109,94,251,0.1)" }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(109,94,251,0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{generated.title}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>共 {generated.count} 道题目 · {generated.time}</div>
                </div>
                <button onClick={handleSave} style={{ 
                  background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--accent)", 
                  fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 4, cursor: "pointer",
                  transition: "all 0.2s"
                }} onMouseOver={e => { e.target.style.background = "var(--accent)"; e.target.style.color = "#fff"; }} onMouseOut={e => { e.target.style.background = "var(--surface)"; e.target.style.color = "var(--accent)"; }}>
                  保存并导入题库
                </button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
                {generated.questions.map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
                    <div style={{ 
                      width: 20, height: 20, borderRadius: "50%", background: "var(--surface-soft)", color: "var(--muted)", 
                      fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>{q.content}</div>
                      <div style={{ padding: "6px 10px", background: "var(--surface-soft)", borderRadius: 6, borderLeft: "3px solid var(--accent)" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", marginRight: 8 }}>参考答案</span>
                        <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>{q.answer}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.5 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-soft)", display: "grid", placeItems: "center", color: "var(--muted)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>在左侧配置参数后点击生成</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
