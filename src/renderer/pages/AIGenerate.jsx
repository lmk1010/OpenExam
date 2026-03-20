import React, { useEffect, useRef, useState } from "react";
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
const PROGRESS_PHASES = [
  { min: 0, max: 8, text: "校验配置" },
  { min: 8, max: 18, text: "组装出卷参数" },
  { min: 18, max: 76, text: "调用模型生成题目" },
  { min: 76, max: 90, text: "结构化整理题目" },
  { min: 90, max: 99, text: "质量检查与收尾" },
];
const LONG_WAIT_MS = 20000;

function getPhaseLabel(progress) {
  const current = PROGRESS_PHASES.find((phase) => progress >= phase.min && progress < phase.max);
  return current?.text || "处理中";
}

function normalizeErrorMessage(error, fallback = "生成失败，请稍后重试。") {
  const raw = String(error?.message || error || "").trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out")) return "生成超时，请检查网络或减少题量后重试。";
  if (lower.includes("abort") || raw.includes("取消")) return "任务已取消，请重新发起生成。";
  if (raw.length > 120) return `${raw.slice(0, 120)}...`;
  return raw;
}

export default function AIGenerate({ onStartExam }) {
  const [config, setConfig] = useState({ category: "yanyu", difficulty: 3, count: 10, customPrompt: "" });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [phaseText, setPhaseText] = useState("等待生成");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [feedback, setFeedback] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPapers, setHistoryPapers] = useState([]);
  const progressTimerRef = useRef(null);
  const startedAtRef = useRef(0);
  const generationTokenRef = useRef(0);
  const longWaitWarnedRef = useRef(false);

  const stopProgressTicker = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const finishWithError = (message, phase = "生成失败", feedbackType = "error") => {
    stopProgressTicker();
    setProgress(100);
    setPhaseText(phase);
    setElapsedMs(Date.now() - startedAtRef.current);
    setError(message);
    pushFeedback(feedbackType, message);
    setGenerating(false);
  };

  const pushFeedback = (type, text) => {
    const item = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      text,
      time: new Date().toLocaleTimeString(),
    };
    setFeedback((prev) => [item, ...prev].slice(0, 8));
  };

  useEffect(() => {
    return () => stopProgressTicker();
  }, []);

  const handleGenerate = async () => {
    const token = generationTokenRef.current + 1;
    generationTokenRef.current = token;
    longWaitWarnedRef.current = false;
    setError(null);
    if (!isAIConfigured() || !window.openexam?.ai) {
      const msg = "请先在「设置」中配置 AI 服务。";
      setError(msg);
      pushFeedback("error", msg);
      return;
    }
    setGenerating(true);
    setProgress(3);
    setPhaseText("校验配置");
    setElapsedMs(0);
    setGenerated(null);
    startedAtRef.current = Date.now();
    pushFeedback("info", "开始生成试卷。");
    stopProgressTicker();
    progressTimerRef.current = setInterval(() => {
      if (generationTokenRef.current !== token) {
        stopProgressTicker();
        return;
      }
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= LONG_WAIT_MS && !longWaitWarnedRef.current) {
        longWaitWarnedRef.current = true;
        pushFeedback("warning", "等待时间较长，可点击“取消生成”并调整参数后重试。");
      }
      setProgress((prev) => {
        const next = Math.min(98, prev + (prev < 25 ? 1.8 : prev < 60 ? 1.2 : prev < 90 ? 0.7 : 0.18));
        setPhaseText(next >= 95 ? "等待模型最终返回" : getPhaseLabel(next));
        return next;
      });
    }, 280);

    try {
      const settings = getAISettings();
      pushFeedback("info", `参数已提交：${config.count} 题 / ${CATEGORIES.find(c => c.key === config.category)?.name || config.category}`);
      const result = await window.openexam.ai.generatePaper(settings, config);
      if (generationTokenRef.current !== token) return;
      if (result.success && result.questions?.length) {
        stopProgressTicker();
        setProgress(100);
        setPhaseText("生成完成");
        setElapsedMs(Date.now() - startedAtRef.current);
        pushFeedback("success", `生成成功，共 ${result.questions.length} 道题。${result.debugId ? ` [${result.debugId}]` : ""}`);
        setGenerated({ questions: result.questions, title: `${CATEGORIES.find(c => c.key === config.category)?.name} · ${DIFFICULTIES.find(d => d.value === config.difficulty)?.label}`, count: result.questions.length, time: new Date().toLocaleString() });
      } else {
        const msg = normalizeErrorMessage(result.error || "AI 未返回有效题目。");
        const wrapped = `${msg}${result?.debugId ? ` [${result.debugId}]` : ""}`;
        finishWithError(wrapped, "生成失败", "error");
      }
    } catch (e) {
      if (generationTokenRef.current !== token) return;
      const msg = normalizeErrorMessage(e);
      const wrapped = `${msg}${e?.debugId ? ` [${e.debugId}]` : ""}`;
      finishWithError(wrapped, "生成失败", "error");
      return;
    }
    if (generationTokenRef.current === token) {
      setGenerating(false);
    }
  };

  const handleCancelGenerate = () => {
    if (!generating) return;
    generationTokenRef.current += 1;
    finishWithError("已取消本次生成，请调整参数后重试。", "已取消", "warning");
  };

  const handleSave = async () => {
    if (!generated?.questions?.length || !window.openexam?.db) return;
    try {
      const r = await window.openexam.db.importPaper({ title: generated.title, year: new Date().getFullYear() }, generated.questions);
      pushFeedback("success", `已导入题库：${r.questionCount} 道题。`);
      if (showHistory) {
        await loadHistoryPapers();
      }
      alert(`已保存 ${r.questionCount} 道题`);
    } catch (e) {
      pushFeedback("error", `保存失败：${e.message || "未知错误"}`);
      alert("保存失败: " + e.message);
    }
  };

  const loadHistoryPapers = async () => {
    if (!window.openexam?.db?.getImportedPapers) {
      setHistoryError("当前环境不支持历史试卷读取。");
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const rows = await window.openexam.db.getImportedPapers();
      const list = Array.isArray(rows) ? rows : [];
      setHistoryPapers(list);
      if (!list.length) {
        setHistoryError("暂无历史试卷，请先生成并保存。");
      }
    } catch (e) {
      setHistoryError(e.message || "读取历史试卷失败");
      setHistoryPapers([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) {
      await loadHistoryPapers();
    }
  };

  const handleStartHistoryPaper = async (paperId) => {
    if (!paperId || !onStartExam) return;
    try {
      await onStartExam(paperId);
    } catch (e) {
      setHistoryError(e.message || "启动试卷失败");
    }
  };

  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const elapsedText = `${Math.floor(elapsedSec / 60)}分${String(elapsedSec % 60).padStart(2, "0")}秒`;

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

          {!generating ? (
            <button onClick={handleGenerate}
              style={{ 
                marginTop: "auto", padding: "10px 0", borderRadius: 6, border: "none",
                background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                width: "100%", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(109,94,251,0.2)"
              }}>
              开始生成试卷
            </button>
          ) : (
            <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 92px", gap: 8 }}>
              <button disabled
                style={{ padding: "10px 0", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface-soft)", color: "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "wait" }}>
                生成中... {Math.round(progress)}%
              </button>
              <button onClick={handleCancelGenerate}
                style={{ padding: "10px 0", borderRadius: 6, border: "1px solid rgba(231,76,60,0.45)", background: "rgba(231,76,60,0.08)", color: "#c0392b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                取消生成
              </button>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600 }}>生成预览</h3>
            <button
              onClick={handleToggleHistory}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: showHistory ? "rgba(109,94,251,0.1)" : "var(--surface)",
                color: showHistory ? "var(--accent)" : "var(--text)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              历史试卷
            </button>
          </div>

          {(generating || progress > 0 || feedback.length > 0) && (
            <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-soft)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                  生成进度 · {Math.round(progress)}%
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {phaseText} · {elapsedText}
                </div>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: "100%", borderRadius: 999, background: generating ? "linear-gradient(90deg, #6d5efb, #4f7cff)" : (error ? "#e74c3c" : "#00b894"), transition: "width 0.25s ease" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 112, overflowY: "auto", paddingRight: 2 }}>
                {feedback.length ? feedback.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10 }}>
                    <span style={{ color: item.type === "error" ? "#c0392b" : item.type === "success" ? "#00b894" : item.type === "warning" ? "#e67e22" : "var(--text)", lineHeight: 1.5 }}>{item.text}</span>
                    <span style={{ color: "var(--muted)", flexShrink: 0 }}>{item.time}</span>
                  </div>
                )) : (
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>等待开始...</div>
                )}
              </div>
            </div>
          )}

          {showHistory && (
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>历史试卷（持久化）</div>
                <button onClick={loadHistoryPapers} disabled={historyLoading} style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 11, cursor: historyLoading ? "wait" : "pointer" }}>
                  {historyLoading ? "刷新中..." : "刷新"}
                </button>
              </div>
              {historyError ? (
                <div style={{ fontSize: 11, color: "#c0392b", lineHeight: 1.5 }}>{historyError}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                  {historyPapers.map((paper) => (
                    <div key={paper.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {paper.title || "未命名试卷"}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                          {paper.year || "-"} · {(paper.question_count || 0)} 题 · {paper.created_at?.slice(0, 16).replace("T", " ") || "-"}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartHistoryPaper(paper.id)}
                        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--accent)", background: "rgba(109,94,251,0.08)", color: "var(--accent)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                      >
                        开始答题
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
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
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {q.options.map((opt, idx) => (
                            <div key={`${i}_${opt.key || idx}`} style={{ fontSize: 11, color: "var(--muted)", background: "rgba(0,0,0,0.03)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", lineHeight: 1.5 }}>
                              <strong style={{ color: "var(--text)", marginRight: 4 }}>{opt.key || String.fromCharCode(65 + idx)}.</strong>
                              {opt.content}
                            </div>
                          ))}
                        </div>
                      )}
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
