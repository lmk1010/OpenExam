import React, { useState, useRef, useEffect } from "react";
import { getAISettings, isAIConfigured } from "../store/aiSettings.js";
import CustomSelect from "../components/CustomSelect.jsx";

// ─── Icon ─────────────────────────────────────────────────────────────────────
const Ico = ({ d, size = 14, col = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const ICONS = {
  ai:     <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z"/>,
  user:   <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  send:   <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  chat:   <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>,
  flash:  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  book:   <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
  star:   <path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/>,
  tip:    <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  trash:  <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
};

// ─── Quick prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: "讲解此题",   prompt: "请详细讲解这道题的解题思路",           icon: ICONS.book   },
  { label: "举一反三",   prompt: "请针对这道题生成3道类似的变式题",       icon: ICONS.flash  },
  { label: "知识点梳理", prompt: "请总结这道题涉及的相关知识点",          icon: ICONS.star   },
  { label: "通用技巧",   prompt: "请教我解这类题目的通用解题技巧与方法",  icon: ICONS.tip    },
];

const DEFAULT_ASSISTANT_MESSAGE = "你好，我是 AI 学习助手「小开」。\n\n我可以帮你：\n- 讲解各类行测题目\n- 总结知识点与解题技巧\n- 生成同类变式练习题\n- 分析你的薄弱环节\n\n目前暂无正在分析的题目，请直接提问。";
const AI_SESSION_KEY = "openexam_ai_active_session";
const QUESTION_CONTEXT_KEY = "openexam_question_context";
const CAT_LABELS = {
  yanyu: "言语理解",
  shuliang: "数量关系",
  panduan: "判断推理",
  ziliao: "资料分析",
  changshi: "常识判断",
};

function normalizeMessages(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const mapped = list
    .filter((row) => row && (row.role === "assistant" || row.role === "user"))
    .map((row) => ({ role: row.role, content: String(row.content || "") }))
    .filter((row) => row.content.trim());
  return mapped.length ? mapped : [{ role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE }];
}

function readQuestionContext() {
  try {
    const raw = localStorage.getItem(QUESTION_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function buildQuestionContextPrompt(context) {
  if (!context) return "";
  const options = Array.isArray(context.options)
    ? context.options.map((opt) => `${opt.key}. ${opt.content}`).join("\n")
    : "";

  return [
    "[当前题目上下文]",
    `试卷: ${context.paperTitle || "未知试卷"}`,
    `题号: 第${context.index || "?"}题 / 共${context.total || "?"}题`,
    `分类: ${context.category || "未分类"} ${context.subCategory || ""}`.trim(),
    `题干: ${context.content || ""}`,
    options ? `选项:\n${options}` : "选项: 无",
    `我的答案: ${context.userAnswer || "未作答"}`,
    `参考答案: ${context.answer || "未知"}`,
    context.analysis ? `解析: ${context.analysis}` : "解析: 暂无",
  ].join("\n");
}

function normalizeQuestionOptions(options) {
  if (Array.isArray(options)) return options;
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

// ─── Render markdown-like content ────────────────────────────────────────────
function MsgContent({ content }) {
  const renderInline = (text) => {
    const chunks = String(text || "").split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return chunks.map((chunk, i) => {
      if (!chunk) return null;
      if (chunk.startsWith("`") && chunk.endsWith("`")) {
        return <code key={i} style={{ background: "var(--accent-soft-bg)", color: "var(--accent)", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>{chunk.slice(1, -1)}</code>;
      }
      if (chunk.startsWith("**") && chunk.endsWith("**")) {
        return <strong key={i} style={{ fontWeight: 700, color: "var(--text)" }}>{chunk.slice(2, -2)}</strong>;
      }
      if (chunk.startsWith("*") && chunk.endsWith("*")) {
        return <em key={i} style={{ fontStyle: "italic", color: "var(--text)" }}>{chunk.slice(1, -1)}</em>;
      }
      return <React.Fragment key={i}>{chunk}</React.Fragment>;
    });
  };

  const lines = content.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        if (!line) return <div key={i} style={{ height: 6 }} />;
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const size = Math.max(12, 16 - level);
          const weight = level <= 2 ? 700 : 600;
          return <div key={i} style={{ fontSize: size, fontWeight: weight, color: "var(--text)", marginBottom: 4 }}>{renderInline(headingMatch[2])}</div>;
        }
        if (line.startsWith("> ")) {
          return <div key={i} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 8, color: "var(--muted)", fontSize: 11, marginBottom: 2, fontStyle: "italic" }}>{renderInline(line.slice(2))}</div>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <div key={i} style={{ display: "flex", gap: 7, marginBottom: 2 }}><span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2, fontSize: 10 }}>▸</span><span>{renderInline(line.slice(2))}</span></div>;
        }
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)[1];
          return <div key={i} style={{ display: "flex", gap: 7, marginBottom: 2 }}><span style={{ color: "var(--accent)", flexShrink: 0, minWidth: 16, fontSize: 11, fontWeight: 600 }}>{num}.</span><span>{renderInline(line.replace(/^\d+\. /, ""))}</span></div>;
        }
        return <div key={i} style={{ marginBottom: 2 }}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AITeacher() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE }
  ]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [questionContext, setQuestionContext] = useState(null);
  const [wrongQuestions, setWrongQuestions] = useState([]);
  const [papers, setPapers] = useState([]);
  const [paperQuestions, setPaperQuestions] = useState([]);
  const [selectedWrongId, setSelectedWrongId] = useState("");
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [selectedPaperQuestionId, setSelectedPaperQuestionId] = useState("");
  const [injectHint, setInjectHint] = useState("");
  const messageViewportRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  const prevMessageCountRef = useRef(messages.length);
  const autoFollowRef = useRef(true);
  const scrollRafRef = useRef(0);
  const streamRequestRef = useRef("");
  const configured = isAIConfigured();
  const db = window.openexam?.db;

  const isNearBottom = (el, threshold = 80) => {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  const scrollToBottom = (behavior = "auto") => {
    const el = messageViewportRef.current;
    if (!el) return;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  };

  useEffect(() => {
    messagesRef.current = messages;
    const nextCount = messages.length;
    const isNewBubble = nextCount > prevMessageCountRef.current;
    prevMessageCountRef.current = nextCount;
    if (!autoFollowRef.current) return;
    scrollToBottom(isNewBubble ? "smooth" : "auto");
  }, [messages]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  useEffect(() => {
    const loadContext = () => setQuestionContext(readQuestionContext());
    loadContext();
    window.addEventListener("focus", loadContext);
    return () => window.removeEventListener("focus", loadContext);
  }, []);

  useEffect(() => {
    return () => {
      const requestId = streamRequestRef.current;
      if (requestId && window.openexam?.ai?.chatStreamCancel) {
        window.openexam.ai.chatStreamCancel(requestId).catch(() => {});
      }
    };
  }, []);

  const applyManualContext = (rawQuestion, source) => {
    if (!rawQuestion) return;
    const options = normalizeQuestionOptions(rawQuestion.options);
    const payload = {
      questionId: rawQuestion.question_id || rawQuestion.id || "",
      paperTitle: rawQuestion.paper_title || rawQuestion.paperTitle || "手动注入",
      index: rawQuestion.order_num || rawQuestion.index || "?",
      total: rawQuestion.total || "?",
      category: rawQuestion.category || "",
      subCategory: rawQuestion.sub_category || rawQuestion.subCategory || "",
      content: rawQuestion.content || "",
      options,
      answer: rawQuestion.answer || rawQuestion.correct_answer || "",
      analysis: rawQuestion.analysis || "",
      userAnswer: rawQuestion.user_answer || "",
      source: source || "manual",
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(QUESTION_CONTEXT_KEY, JSON.stringify(payload));
    setQuestionContext(payload);
    setInjectHint(`已注入：${source === "wrong" ? "错题" : "题库题目"}上下文`);
    setTimeout(() => setInjectHint(""), 1600);
  };

  useEffect(() => {
    let closed = false;
    const loadInjectData = async () => {
      if (!db) return;
      try {
        const [wrongRows, paperRows] = await Promise.all([
          db.getWrongQuestions?.() || [],
          db.getPapers?.() || [],
        ]);
        if (closed) return;
        setWrongQuestions(Array.isArray(wrongRows) ? wrongRows : []);
        const nextPapers = Array.isArray(paperRows) ? paperRows : [];
        setPapers(nextPapers);
        if (nextPapers.length && !selectedPaperId) {
          setSelectedPaperId(nextPapers[0].id);
        }
      } catch (error) {
        console.error("加载上下文注入数据失败:", error);
      }
    };
    loadInjectData();
    return () => { closed = true; };
  }, [db]);

  useEffect(() => {
    if (!wrongQuestions.length) {
      setSelectedWrongId("");
      return;
    }
    if (!selectedWrongId || !wrongQuestions.some((row) => row.id === selectedWrongId)) {
      setSelectedWrongId(wrongQuestions[0].id);
    }
  }, [wrongQuestions, selectedWrongId]);

  useEffect(() => {
    let closed = false;
    const loadPaperQuestions = async () => {
      if (!selectedPaperId || !db?.getQuestions) {
        setPaperQuestions([]);
        setSelectedPaperQuestionId("");
        return;
      }
      try {
        const rows = await db.getQuestions(selectedPaperId);
        if (closed) return;
        const list = Array.isArray(rows) ? rows : [];
        setPaperQuestions(list);
        setSelectedPaperQuestionId(list[0]?.id || "");
      } catch (error) {
        if (!closed) {
          setPaperQuestions([]);
          setSelectedPaperQuestionId("");
        }
      }
    };
    loadPaperQuestions();
    return () => { closed = true; };
  }, [db, selectedPaperId]);

  const refreshSessions = async (preferredId = "") => {
    if (!db?.getAIChatSessions) return [];
    const rows = await db.getAIChatSessions(100);
    const list = Array.isArray(rows) ? rows : [];
    setSessions(list);
    if (preferredId && list.some((item) => item.id === preferredId)) {
      setActiveSessionId(preferredId);
    }
    return list;
  };

  const createSession = async (title = "新会话") => {
    if (!db?.createAIChatSession) return null;
    const settings = getAISettings() || {};
    const row = await db.createAIChatSession({
      title: String(title || "新会话").trim() || "新会话",
      provider: settings.aiProvider || null,
      model: settings.model || null,
    });
    return row && row.id ? row : null;
  };

  useEffect(() => {
    let closed = false;
    const bootstrap = async () => {
      if (!db?.getAIChatSessions || !db?.createAIChatSession) {
        setBooting(false);
        return;
      }
      setBooting(true);
      try {
        let rows = await db.getAIChatSessions(100);
        let list = Array.isArray(rows) ? rows : [];
        let sessionId = localStorage.getItem(AI_SESSION_KEY) || "";
        if (!list.length) {
          const created = await createSession("新会话");
          if (created) list = [created];
        }
        if (!sessionId || !list.some((item) => item.id === sessionId)) {
          sessionId = list[0]?.id || "";
        }
        if (closed) return;
        setSessions(list);
        setActiveSessionId(sessionId);
        if (sessionId) localStorage.setItem(AI_SESSION_KEY, sessionId);
      } catch (error) {
        if (!closed) {
          setMessages([{ role: "assistant", content: `[Error]\n会话初始化失败: ${error.message || "Unknown"}` }]);
        }
      } finally {
        if (!closed) setBooting(false);
      }
    };
    bootstrap();
    return () => { closed = true; };
  }, []);

  useEffect(() => {
    if (!activeSessionId || !db?.getAIChatMessages) return;
    let closed = false;
    const loadMessages = async () => {
      try {
        const rows = await db.getAIChatMessages(activeSessionId, 500);
        if (closed) return;
        autoFollowRef.current = true;
        setMessages(normalizeMessages(rows));
        localStorage.setItem(AI_SESSION_KEY, activeSessionId);
      } catch (error) {
        if (!closed) {
          setMessages([{ role: "assistant", content: `[Error]\n读取历史消息失败: ${error.message || "Unknown"}` }]);
        }
      }
    };
    loadMessages();
    return () => { closed = true; };
  }, [activeSessionId]);

  const createNewSession = async () => {
    if (loading) return;
    const created = await createSession("新会话");
    if (!created?.id) return;
    await refreshSessions(created.id);
    setMessages([{ role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE }]);
    localStorage.setItem(AI_SESSION_KEY, created.id);
  };

  const renameCurrentSession = async () => {
    if (!activeSessionId || !db?.renameAIChatSession) return;
    const current = sessions.find((item) => item.id === activeSessionId);
    const baseTitle = current?.title || "新会话";
    const nextTitle = window.prompt("请输入会话标题", baseTitle);
    if (!nextTitle) return;
    const title = nextTitle.trim();
    if (!title || title === baseTitle) return;
    await db.renameAIChatSession(activeSessionId, title);
    await refreshSessions(activeSessionId);
  };

  const deleteSession = async (sessionId) => {
    if (!sessionId || loading || !db?.deleteAIChatSession) return;
    if (!window.confirm("确定删除该会话及全部消息？")) return;
    await db.deleteAIChatSession(sessionId);
    let list = await refreshSessions();
    if (!list.length) {
      const created = await createSession("新会话");
      if (created?.id) {
        list = await refreshSessions(created.id);
      }
    }
    if (!list.length) {
      setMessages([{ role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE }]);
      setActiveSessionId("");
      return;
    }
    if (activeSessionId === sessionId || !list.some((item) => item.id === activeSessionId)) {
      setActiveSessionId(list[0].id);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading || !activeSessionId) return;
    if (streamRequestRef.current && window.openexam?.ai?.chatStreamCancel) {
      await window.openexam.ai.chatStreamCancel(streamRequestRef.current).catch(() => {});
      streamRequestRef.current = "";
    }
    autoFollowRef.current = true;
    const userText = text.trim();
    const baseMessages = messagesRef.current.filter((m) => m.role === "user" || m.role === "assistant");
    const userMsg = { role: "user", content: userText };
    const nextMessages = [...baseMessages, userMsg];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setInput("");
    setLoading(true);
    inputRef.current?.focus();

    const persist = async (role, content) => {
      if (!db?.addAIChatMessage) return;
      try {
        await db.addAIChatMessage({ sessionId: activeSessionId, role, content });
      } catch (error) {
        console.error("[AIChat] 持久化失败:", error);
      }
    };

    try {
      await persist("user", userText);
      if (baseMessages.filter((m) => m.role === "user").length === 0 && db?.renameAIChatSession) {
        const firstTitle = userText.replace(/\s+/g, " ").slice(0, 18);
        if (firstTitle) await db.renameAIChatSession(activeSessionId, firstTitle);
      }
      const settings = getAISettings();
      let assistantText = "";
      if (!configured || !window.openexam?.ai) {
        await new Promise((r) => setTimeout(r, 350));
        assistantText = "[System]\nAPI 服务尚未配置，无法访问大模型端点。\n\n> 请前往 **设置 → AI 模型** 进行参数配置。";
      } else {
        const aiApi = window.openexam.ai;
        const history = nextMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
        const ctxPrompt = buildQuestionContextPrompt(questionContext);
        if (ctxPrompt && history.length > 0 && history[history.length - 1].role === "user") {
          history[history.length - 1] = {
            ...history[history.length - 1],
            content: `${ctxPrompt}\n\n[用户问题]\n${userText}`,
          };
        }

        if (aiApi?.chatStreamStart && aiApi?.onChatStreamEvent) {
          const requestId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          streamRequestRef.current = requestId;
          let streamedText = "";
          const streamPlaceholder = [...nextMessages, { role: "assistant", content: "" }];
          setMessages(streamPlaceholder);
          messagesRef.current = streamPlaceholder;

          assistantText = await new Promise((resolve, reject) => {
            let finished = false;
            const close = (off) => {
              streamRequestRef.current = "";
              if (typeof off === "function") off();
            };
            const off = aiApi.onChatStreamEvent((payload) => {
              if (!payload || payload.requestId !== requestId || finished) return;
              if (payload.type === "delta") {
                const delta = String(payload.delta || "");
                if (!delta) return;
                streamedText += delta;
                setMessages((prev) => {
                  const next = [...prev];
                  for (let i = next.length - 1; i >= 0; i -= 1) {
                    if (next[i].role === "assistant") {
                      next[i] = { ...next[i], content: streamedText };
                      break;
                    }
                  }
                  messagesRef.current = next;
                  return next;
                });
              }
              if (payload.type === "done") {
                finished = true;
                close(off);
                resolve(String(payload.content || streamedText || "").trim());
              }
              if (payload.type === "error" || payload.type === "cancelled") {
                finished = true;
                close(off);
                reject(new Error(payload.error || (payload.type === "cancelled" ? "请求已取消" : "流式回复失败")));
              }
            });

            aiApi.chatStreamStart(settings, history, requestId)
              .then((ret) => {
                if (!ret?.success && !finished) {
                  finished = true;
                  close(off);
                  reject(new Error(ret?.error || "启动流式失败"));
                }
              })
              .catch((error) => {
                if (finished) return;
                finished = true;
                close(off);
                reject(error);
              });
          });

          assistantText = assistantText || streamedText;
          if (!assistantText) {
            assistantText = "[Empty]\n模型返回了空内容，请更换模型或稍后重试。";
          }
          setMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i -= 1) {
              if (next[i].role === "assistant") {
                next[i] = { ...next[i], content: assistantText };
                break;
              }
            }
            messagesRef.current = next;
            return next;
          });
        } else {
          const result = await aiApi.chat(settings, history);
          assistantText = result?.success
            ? String(result.content || "").trim()
            : `[Error]\n回复失败: ${result?.error || "Unknown"}\n\n请检查网络与模型配置。`;
          if (!assistantText) assistantText = "[Empty]\n模型返回了空内容，请更换模型或稍后重试。";
        }
      }

      const hasStreamingAssistant = messagesRef.current.length > nextMessages.length;
      if (!hasStreamingAssistant) {
        const assistantMsg = { role: "assistant", content: assistantText };
        const merged = [...nextMessages, assistantMsg];
        setMessages(merged);
        messagesRef.current = merged;
      }
      await persist("assistant", assistantText);
    } catch (e) {
      const errText = `[Exception]\n致命异常: ${e.message || "Unknown"}`;
      const current = [...messagesRef.current];
      if (current.length && current[current.length - 1]?.role === "assistant" && !String(current[current.length - 1]?.content || "").trim()) {
        current[current.length - 1] = { ...current[current.length - 1], content: errText };
      } else {
        current.push({ role: "assistant", content: errText });
      }
      const merged = current;
      setMessages(merged);
      messagesRef.current = merged;
      await persist("assistant", errText);
    } finally {
      await refreshSessions(activeSessionId);
      setLoading(false);
    }
  };

  const msgCount = messages.filter((m) => m.role === "user").length;
  const replyCount = messages.filter((m) => m.role === "assistant").length;
  const activeSession = sessions.find((item) => item.id === activeSessionId) || null;
  const wrongOptions = wrongQuestions.slice(0, 200).map((row, idx) => ({
    value: row.id,
    label: `${idx + 1}. ${(row.content || "").replace(/\s+/g, " ").slice(0, 28) || "无题干"}`,
  }));
  const paperOptions = papers.map((row) => ({
    value: row.id,
    label: `${row.title || "未命名试卷"}`,
  }));
  const paperQuestionOptions = paperQuestions.slice(0, 300).map((row, idx) => ({
    value: row.id,
    label: `${idx + 1}. ${(row.content || "").replace(/\s+/g, " ").slice(0, 26) || "无题干"}`,
  }));

  return (
    <section className="main-panel" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", boxSizing: "border-box" }}>

      {/* ── HEADER ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 22px 10px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>我的 › AI 老师</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)", display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 8px 18px rgba(15,23,42,0.08)" }}>
              <Ico d={ICONS.chat} size={13} col="#fff" sw={2} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>AI 智能导师</h2>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Status pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 16, background: configured ? "var(--success-soft)" : "var(--danger-soft)", border: `1px solid ${configured ? "var(--success-border)" : "var(--danger-border)"}` }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: configured ? "var(--success)" : "var(--danger)", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: configured ? "var(--success)" : "var(--danger)" }}>{configured ? "已连接" : "未配置"}</span>
          </div>
          {/* Msg count badge */}
          <div style={{ padding: "4px 11px", borderRadius: 16, background: "var(--accent-soft-bg)", border: "1px solid var(--accent-border-soft)", fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>
            {msgCount} 次问答
          </div>
          <button onClick={createNewSession} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-soft)", color: "var(--text)", fontSize: 11, cursor: "pointer" }}>
            新建会话
          </button>
          <button title="重命名当前会话" onClick={renameCurrentSession} disabled={!activeSessionId} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--line)", background: "transparent", color: !activeSessionId ? "var(--line)" : "var(--muted)", cursor: !activeSessionId ? "not-allowed" : "pointer", display: "grid", placeItems: "center", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = "var(--surface-soft)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}>
            <Ico d={ICONS.settings} size={12} sw={1.8} />
          </button>
          <button title="删除当前会话" onClick={() => deleteSession(activeSessionId)} disabled={!activeSessionId} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--line)", background: "transparent", color: !activeSessionId ? "var(--line)" : "var(--muted)", cursor: !activeSessionId ? "not-allowed" : "pointer", display: "grid", placeItems: "center", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = "var(--surface-soft)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}>
            <Ico d={ICONS.trash} size={12} sw={1.8} />
          </button>
        </div>
      </header>

      {/* ── BODY: left sidebar + right chat ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT SIDEBAR */}
        <aside style={{ width: 232, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingBottom: 10 }}>

          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.5px", marginBottom: 8 }}>会话列表</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 136, overflowY: "auto" }}>
              {sessions.map((session) => (
                <button key={session.id} onClick={() => setActiveSessionId(session.id)} style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid var(--line)", background: session.id === activeSessionId ? "var(--accent-soft-bg)" : "var(--surface-soft)", color: session.id === activeSessionId ? "var(--accent)" : "var(--text)", textAlign: "left", cursor: "pointer", fontSize: 10, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title || "新会话"}</div>
                  <div style={{ color: "var(--muted)" }}>{session.message_count || 0} 条消息</div>
                </button>
              ))}
              {!sessions.length && (
                <div style={{ fontSize: 10, color: "var(--muted)", padding: "6px 2px" }}>暂无会话，点击上方“新建会话”。</div>
              )}
            </div>
          </div>

          {/* Quick prompts */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.5px", marginBottom: 8 }}>快捷指令</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {QUICK_PROMPTS.map((qp) => (
                <button key={qp.label} onClick={() => sendMessage(qp.prompt)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--text)", cursor: "pointer", textAlign: "left", transition: "all 0.18s", fontFamily: "inherit" }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-soft-bg)"; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface-soft)"; }}>
                  <Ico d={qp.icon} size={12} sw={1.8} />
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.5px" }}>手动注入上下文</div>

            <div style={{ fontSize: 10, color: "var(--muted)" }}>从错题本选择</div>
            <CustomSelect
              value={selectedWrongId || (wrongOptions[0]?.value || "")}
              onChange={setSelectedWrongId}
              options={wrongOptions.length ? wrongOptions : [{ value: "", label: "暂无错题" }]}
              disabled={!wrongOptions.length}
              minWidth={180}
            />
            <button
              onClick={() => {
                const selected = wrongQuestions.find((row) => row.id === (selectedWrongId || wrongOptions[0]?.value));
                applyManualContext({ ...(selected || {}), index: "错题", total: wrongQuestions.length }, "wrong");
              }}
              disabled={!wrongOptions.length}
              style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-soft)", color: "var(--text)", cursor: wrongOptions.length ? "pointer" : "not-allowed", fontSize: 11 }}
            >
              注入错题上下文
            </button>

            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>从题库选择题目</div>
            <CustomSelect
              value={selectedPaperId || (paperOptions[0]?.value || "")}
              onChange={setSelectedPaperId}
              options={paperOptions.length ? paperOptions : [{ value: "", label: "暂无试卷" }]}
              disabled={!paperOptions.length}
              minWidth={180}
            />
            <CustomSelect
              value={selectedPaperQuestionId || (paperQuestionOptions[0]?.value || "")}
              onChange={setSelectedPaperQuestionId}
              options={paperQuestionOptions.length ? paperQuestionOptions : [{ value: "", label: "暂无题目" }]}
              disabled={!paperQuestionOptions.length}
              minWidth={180}
            />
            <button
              onClick={() => {
                const selected = paperQuestions.find((row) => row.id === (selectedPaperQuestionId || paperQuestionOptions[0]?.value));
                const paper = papers.find((row) => row.id === selectedPaperId);
                applyManualContext({
                  ...(selected || {}),
                  paper_title: paper?.title || "题库题目",
                  index: selected?.order_num || "?",
                  total: paperQuestions.length || "?",
                }, "paper");
              }}
              disabled={!paperQuestionOptions.length}
              style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-soft)", color: "var(--text)", cursor: paperQuestionOptions.length ? "pointer" : "not-allowed", fontSize: 11 }}
            >
              注入题库上下文
            </button>
            {injectHint ? <div style={{ fontSize: 10, color: "var(--accent)" }}>{injectHint}</div> : null}
          </div>

          {/* Context area */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", flex: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.5px", marginBottom: 8 }}>当前题目上下文</div>
            {questionContext ? (
              <div style={{ padding: "9px 10px", background: "var(--accent-soft-bg)", borderRadius: 8, border: "1px solid var(--accent-border-soft)", fontSize: 10, color: "var(--muted)", lineHeight: 1.6 }}>
                <div style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>
                  [已注入{questionContext.source === "wrong" ? "·错题" : questionContext.source === "paper" ? "·题库" : ""}] 第{questionContext.index || "?"}题 / 共{questionContext.total || "?"}题
                </div>
                <div style={{ color: "var(--text)", marginBottom: 3 }}>{questionContext.content?.slice(0, 52) || "题干缺失"}{questionContext.content?.length > 52 ? "..." : ""}</div>
                <div>分类: {CAT_LABELS[questionContext.category] || questionContext.category || "未分类"}</div>
                <div>我的答案: {questionContext.userAnswer || "未作答"}</div>
                <div>参考答案: {questionContext.answer || "未知"}</div>
              </div>
            ) : (
              <div style={{ padding: "9px 10px", background: "var(--accent-soft-bg)", borderRadius: 8, border: "1px dashed var(--accent-border-soft)", fontSize: 10, color: "var(--muted)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>[空]</span> 暂无题目上下文
                <br/>完成答题后会自动注入最近一道题。
              </div>
            )}
          </div>

          {/* Session stats */}
          <div style={{ padding: "12px 14px", flex: "0 0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.5px", marginBottom: 8 }}>本次会话</div>
            <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {activeSession?.title || (booting ? "加载中..." : "未选择会话")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "我的提问", val: msgCount,    col: "var(--accent)" },
                { label: "AI 回复",  val: replyCount,  col: "var(--success)" },
                { label: "总轮次",   val: Math.max(msgCount, replyCount), col: "var(--muted)" },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < arr.length - 1 ? "1px dashed var(--line)" : "none" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: row.col, fontFamily: "monospace" }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--text)", lineHeight: 1.65 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
              <Ico d={ICONS.tip} size={11} col="var(--text)" sw={1.8} />
              <span>Shift+Enter 换行<br/>Enter 发送消息</span>
            </div>
          </div>
        </aside>

        {/* RIGHT: chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Messages */}
          <div
            ref={messageViewportRef}
            onScroll={(e) => {
              autoFollowRef.current = isNearBottom(e.currentTarget);
            }}
            style={{ flex: 1, overflowY: "auto", padding: "20px 22px 10px", display: "flex", flexDirection: "column", gap: 20 }}
          >
            {booting ? (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>会话加载中...</div>
            ) : !activeSessionId ? (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>暂无可用会话，请先新建会话。</div>
            ) : messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 10, maxWidth: msg.role === "user" ? "75%" : "92%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: msg.role === "user" ? "transparent" : "var(--accent-soft-bg)", color: msg.role === "user" ? "var(--muted)" : "var(--accent)", border: msg.role === "user" ? "1px solid var(--line)" : "none" }}>
                  <Ico d={msg.role === "assistant" ? ICONS.ai : ICONS.user} size={13} sw={1.8} />
                </div>
                <div style={{ background: msg.role === "user" ? "var(--surface-soft)" : "transparent", border: msg.role === "user" ? "1px solid var(--line)" : "none", padding: msg.role === "user" ? "9px 13px" : "1px 0 0", borderRadius: msg.role === "user" ? "12px 2px 12px 12px" : 0, fontSize: 12, lineHeight: 1.75, color: "var(--text)", letterSpacing: "0.1px" }}>
                  <MsgContent content={msg.content} />
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && activeSessionId && (
              <div style={{ display: "flex", gap: 10, maxWidth: "92%", alignSelf: "flex-start" }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: "var(--accent-soft-bg)", color: "var(--accent)" }}>
                  <Ico d={ICONS.ai} size={13} sw={1.8} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 0", fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                  正在思考
                  <span style={{ display: "inline-flex", gap: 3 }}>
                    {[0,1,2].map(k => (
                      <span key={k} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", opacity: 0.6, animation: `dotBounce 1.2s ${k * 0.2}s ease-in-out infinite` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* INPUT AREA */}
          <div style={{ padding: "10px 22px 16px", borderTop: "1px solid var(--line)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "var(--surface-soft)", borderRadius: 12, padding: "8px 10px 8px 14px", border: "1px solid var(--line)", transition: "border-color 0.2s" }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} disabled={booting || !activeSessionId || loading}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={booting ? "会话加载中..." : (!activeSessionId ? "请先新建会话" : "输入你的问题… (Enter 发送，Shift+Enter 换行)")}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, lineHeight: 1.65, color: "var(--text)", resize: "none", padding: 0, maxHeight: 100, minHeight: 32, fontFamily: "inherit" }}
              />
              <button onClick={() => sendMessage(input)} disabled={booting || !activeSessionId || loading || !input.trim()} style={{ width: 30, height: 30, borderRadius: 8, background: (booting || !activeSessionId || loading || !input.trim()) ? "var(--line)" : "var(--accent)", color: "#fff", border: "none", display: "grid", placeItems: "center", cursor: (booting || !activeSessionId || loading || !input.trim()) ? "not-allowed" : "pointer", flexShrink: 0, transition: "background 0.2s", boxShadow: (booting || !activeSessionId || loading || !input.trim()) ? "none" : "0 8px 18px rgba(15,23,42,0.08)" }}>
                <Ico d={ICONS.send} size={13} col="#fff" sw={2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      ` }} />
    </section>
  );
}
