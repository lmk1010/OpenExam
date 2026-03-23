import React, { useEffect, useRef, useState } from "react";
import { getAISettings, isAIConfigured } from "../store/aiSettings.js";
import { buildPaperShareText, copyText } from "../utils/paperShare.js";

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

function getSavedPaperMeta(type) {
  if (type === "ai_practice") {
    return {
      label: "AI 练习",
      action: "开始练习",
      color: "#059669",
      background: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.18)",
    };
  }
  return {
    label: "AI 试卷",
    action: "开始答题",
    color: "var(--accent)",
    background: "rgba(109,94,251,0.1)",
    border: "rgba(109,94,251,0.16)",
  };
}

export default function AIGenerate({ onOpenPaper }) {
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
  const [saveTitle, setSaveTitle] = useState("");
  const [lastSavedPaper, setLastSavedPaper] = useState(null);
  const [editingPaperId, setEditingPaperId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [actionBusy, setActionBusy] = useState("");
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

  useEffect(() => {
    if (generated?.title) {
      setSaveTitle(generated.title);
    }
  }, [generated?.title]);

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
    setLastSavedPaper(null);
    setEditingPaperId("");
    setEditingTitle("");
    setPendingDeleteId("");
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

  const getGeneratedPaperPayload = (titleOverride = saveTitle) => ({
    paper: {
      title: String(titleOverride || generated?.title || "AI 智能试卷").trim() || "AI 智能试卷",
      year: new Date().getFullYear(),
      duration: Math.max(20, (generated?.count || 0) * 2),
      type: "ai_exam",
      subject: "xingce",
      question_count: generated?.count || 0,
      difficulty: config.difficulty,
    },
    questions: generated?.questions || [],
  });

  const handleSave = async (targetType) => {
    if (!generated?.questions?.length || !window.openexam?.db?.saveAIPaper) return;
    const title = String(saveTitle || generated?.title || "").trim();
    if (!title) {
      pushFeedback("warning", "请先填写保存名称。");
      return;
    }
    setActionBusy(`save:${targetType}`);
    try {
      const r = await window.openexam.db.saveAIPaper({
        title,
        year: new Date().getFullYear(),
        difficulty: config.difficulty,
        duration: Math.max(targetType === "ai_practice" ? 15 : 20, (generated?.count || 0) * 2),
        type: targetType,
      }, generated.questions);
      const savedPaper = {
        id: r.paperId,
        title: r.title || title,
        type: r.type || targetType,
        question_count: r.questionCount || generated.questions.length,
        year: new Date().getFullYear(),
      };
      setLastSavedPaper(savedPaper);
      setEditingPaperId("");
      setEditingTitle("");
      setPendingDeleteId("");
      setShowHistory(true);
      await loadHistoryPapers();
      pushFeedback("success", `${targetType === "ai_practice" ? "已保存自定义练习" : "已保存自定义试卷"}：${r.questionCount} 道题。`);
    } catch (e) {
      pushFeedback("error", `保存失败：${e.message || "未知错误"}`);
    } finally {
      setActionBusy("");
    }
  };

  const handleExportGeneratedPdf = async () => {
    if (!generated?.questions?.length || !window.openexam?.paper?.exportPdf) return;
    setActionBusy("pdf");
    try {
      const result = await window.openexam.paper.exportPdf(getGeneratedPaperPayload());
      if (result?.success) pushFeedback("success", `PDF 已导出：${result.filePath}`);
    } catch (error) {
      pushFeedback("error", error.message || "PDF 导出失败");
    } finally {
      setActionBusy("");
    }
  };

  const handleShareGenerated = async () => {
    if (!generated?.questions?.length) return;
    setActionBusy("share");
    try {
      await copyText(buildPaperShareText(getGeneratedPaperPayload()));
      pushFeedback("success", "分享文案已复制，可直接发送。");
    } catch (error) {
      pushFeedback("error", error.message || "复制分享文案失败");
    } finally {
      setActionBusy("");
    }
  };

  const loadHistoryPapers = async () => {
    if (!window.openexam?.db?.getSavedAIPapers) {
      setHistoryError("当前环境不支持 AI 保存内容读取。");
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const rows = await window.openexam.db.getSavedAIPapers();
      const list = Array.isArray(rows) ? rows : [];
      setHistoryPapers(list);
      if (!list.length) {
        setHistoryError("暂无已保存内容，请先生成后点击保存。");
      }
    } catch (e) {
      setHistoryError(e.message || "读取已保存内容失败");
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

  const handleStartHistoryPaper = async (paper) => {
    if (!paper?.id || !onOpenPaper) return;
    try {
      await onOpenPaper(paper);
    } catch (e) {
      setHistoryError(e.message || "启动内容失败");
    }
  };

  const handleBeginRenamePaper = (paper) => {
    setPendingDeleteId("");
    setEditingPaperId(paper?.id || "");
    setEditingTitle(String(paper?.title || ""));
  };

  const handleCancelRenamePaper = () => {
    setEditingPaperId("");
    setEditingTitle("");
  };

  const handleConfirmRenamePaper = async (paperId) => {
    const title = String(editingTitle || "").trim();
    if (!paperId || !window.openexam?.db?.renameSavedPaper) return;
    if (!title) {
      pushFeedback("warning", "名称不能为空。");
      return;
    }
    setActionBusy(`rename:${paperId}`);
    try {
      const updated = await window.openexam.db.renameSavedPaper(paperId, title);
      setHistoryPapers((prev) => prev.map((paper) => (paper.id === paperId ? { ...paper, title: updated.title } : paper)));
      setLastSavedPaper((prev) => (prev?.id === paperId ? { ...prev, title: updated.title } : prev));
      setEditingPaperId("");
      setEditingTitle("");
      pushFeedback("success", `已重命名：${updated.title}`);
    } catch (e) {
      pushFeedback("error", `重命名失败：${e.message || "未知错误"}`);
    } finally {
      setActionBusy("");
    }
  };

  const handleAskDeletePaper = (paperId) => {
    setEditingPaperId("");
    setEditingTitle("");
    setPendingDeleteId((prev) => (prev === paperId ? "" : paperId));
  };

  const handleDeletePaper = async (paper) => {
    if (!paper?.id || !window.openexam?.db?.deleteSavedPaper) return;
    setActionBusy(`delete:${paper.id}`);
    try {
      const removed = await window.openexam.db.deleteSavedPaper(paper.id);
      if (lastSavedPaper?.id === paper.id) {
        setLastSavedPaper(null);
      }
      setPendingDeleteId("");
      await loadHistoryPapers();
      pushFeedback("success", `已删除：${removed.title}`);
    } catch (e) {
      pushFeedback("error", `删除失败：${e.message || "未知错误"}`);
    } finally {
      setActionBusy("");
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
              已保存
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

          {lastSavedPaper && (
            <div style={{ border: "1px solid rgba(16,185,129,0.16)", borderRadius: 12, background: "linear-gradient(180deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#047857" }}>已持久化保存</div>
                <div style={{ fontSize: 11, color: "var(--text)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lastSavedPaper.title} · {lastSavedPaper.type === "ai_practice" ? "AI 练习" : "AI 试卷"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => handleStartHistoryPaper(lastSavedPaper)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.22)", background: "#fff", color: "#047857", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  立即使用
                </button>
                <button onClick={() => setShowHistory((prev) => !prev)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.14)", background: "rgba(255,255,255,0.72)", color: "#047857", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {showHistory ? "收起列表" : "查看已保存"}
                </button>
              </div>
            </div>
          )}

          {showHistory && (
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>已保存试卷 / 练习{historyPapers.length ? `（${historyPapers.length}）` : ""}</div>
                <button onClick={loadHistoryPapers} disabled={historyLoading} style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 11, cursor: historyLoading ? "wait" : "pointer" }}>
                  {historyLoading ? "刷新中..." : "刷新"}
                </button>
              </div>
              {historyError ? (
                <div style={{ fontSize: 11, color: "#c0392b", lineHeight: 1.5 }}>{historyError}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                  {historyPapers.map((paper) => {
                    const meta = getSavedPaperMeta(paper.type);
                    const isJustSaved = lastSavedPaper?.id === paper.id;
                    const isEditing = editingPaperId === paper.id;
                    const isPendingDelete = pendingDeleteId === paper.id;
                    const isBusy = actionBusy === `rename:${paper.id}` || actionBusy === `delete:${paper.id}`;
                    return (
                    <div key={paper.id} style={{ border: isJustSaved ? `1px solid ${meta.border}` : "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: isJustSaved ? meta.background : "transparent", boxShadow: isJustSaved ? "0 6px 18px rgba(15,23,42,0.06)" : "none" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              placeholder="输入新的名称"
                              style={{ width: "100%", padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 12, outline: "none" }}
                            />
                            <div style={{ fontSize: 10, color: "var(--muted)" }}>仅修改保存名称，不影响题目内容。</div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {paper.title || "未命名内容"}
                              </div>
                              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, color: meta.color, background: meta.background, border: `1px solid ${meta.border}` }}>
                                {meta.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                              {paper.year || "-"} · {(paper.question_count || 0)} 题 · {paper.created_at?.slice(0, 16).replace("T", " ") || "-"}
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleConfirmRenamePaper(paper.id)}
                              disabled={isBusy}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(109,94,251,0.18)", background: "rgba(109,94,251,0.08)", color: "var(--accent)", fontSize: 11, cursor: isBusy ? "wait" : "pointer", fontWeight: 600 }}
                            >
                              {actionBusy === `rename:${paper.id}` ? "保存中..." : "保存"}
                            </button>
                            <button
                              onClick={handleCancelRenamePaper}
                              disabled={isBusy}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--muted)", fontSize: 11, cursor: isBusy ? "wait" : "pointer", fontWeight: 600 }}
                            >
                              取消
                            </button>
                          </>
                        ) : isPendingDelete ? (
                          <>
                            <button
                              onClick={() => handleDeletePaper(paper)}
                              disabled={isBusy}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.08)", color: "#b42318", fontSize: 11, cursor: isBusy ? "wait" : "pointer", fontWeight: 600 }}
                            >
                              {actionBusy === `delete:${paper.id}` ? "删除中..." : "确认删除"}
                            </button>
                            <button
                              onClick={() => setPendingDeleteId("")}
                              disabled={isBusy}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--muted)", fontSize: 11, cursor: isBusy ? "wait" : "pointer", fontWeight: 600 }}
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartHistoryPaper(paper)}
                              style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${meta.border}`, background: meta.background, color: meta.color, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                            >
                              {meta.action}
                            </button>
                            <button
                              onClick={() => handleBeginRenamePaper(paper)}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                            >
                              重命名
                            </button>
                            <button
                              onClick={() => handleAskDeletePaper(paper.id)}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.14)", background: "rgba(239,68,68,0.05)", color: "#b42318", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                            >
                              删除
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          )}
          
          {generated ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto", paddingRight: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", background: "linear-gradient(180deg, rgba(109,94,251,0.06), rgba(109,94,251,0.02))", borderRadius: 12, border: "1px solid rgba(109,94,251,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(109,94,251,0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{generated.title}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>共 {generated.count} 道题目 · {generated.time}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="输入保存名称，例如：言语理解冲刺卷"
                      style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 12, outline: "none" }}
                    />
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>点击保存后将持久化到本地，重启应用后仍可在“已保存”中继续使用。</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button onClick={() => handleSave("ai_exam")} disabled={!!actionBusy} style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--accent)", fontSize: 11, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: actionBusy ? "wait" : "pointer", transition: "all 0.2s" }}>
                      {actionBusy === "save:ai_exam" ? "保存中..." : "保存试卷"}
                    </button>
                    <button onClick={() => handleSave("ai_practice")} disabled={!!actionBusy} style={{ background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.18)", fontSize: 11, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: actionBusy ? "wait" : "pointer" }}>
                      {actionBusy === "save:ai_practice" ? "保存中..." : "保存练习"}
                    </button>
                    <button onClick={handleExportGeneratedPdf} disabled={!!actionBusy} style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", fontSize: 11, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: actionBusy ? "wait" : "pointer" }}>
                      {actionBusy === "pdf" ? "导出中..." : "导出 PDF"}
                    </button>
                    <button onClick={handleShareGenerated} disabled={!!actionBusy} style={{ background: "rgba(109,94,251,0.08)", color: "var(--accent)", border: "1px solid rgba(109,94,251,0.16)", fontSize: 11, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: actionBusy ? "wait" : "pointer" }}>
                      {actionBusy === "share" ? "复制中..." : "复制分享"}
                    </button>
                  </div>
                </div>
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
