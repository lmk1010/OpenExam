import React, { useState, useRef, useEffect } from "react";
import { getAISettings, isAIConfigured } from "../store/aiSettings.js";

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

// ─── Render markdown-like content ────────────────────────────────────────────
function MsgContent({ content }) {
  const lines = content.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        if (!line) return <div key={i} style={{ height: 6 }} />;
        if (line.startsWith("# "))  return <div key={i} style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{line.slice(2)}</div>;
        if (line.startsWith("## ")) return <div key={i} style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{line.slice(3)}</div>;
        if (line.startsWith("> "))  return <div key={i} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 8, color: "var(--muted)", fontSize: 11, marginBottom: 2, fontStyle: "italic" }}>{line.slice(2)}</div>;
        if (line.startsWith("- ") || line.startsWith("• ")) return <div key={i} style={{ display: "flex", gap: 7, marginBottom: 2 }}><span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2, fontSize: 10 }}>▸</span><span>{line.slice(2)}</span></div>;
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)[1];
          return <div key={i} style={{ display: "flex", gap: 7, marginBottom: 2 }}><span style={{ color: "var(--accent)", flexShrink: 0, minWidth: 16, fontSize: 11, fontWeight: 600 }}>{num}.</span><span>{line.replace(/^\d+\. /, "")}</span></div>;
        }
        // inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} style={{ marginBottom: 2 }}>
            {parts.map((p, j) => p.startsWith("**") && p.endsWith("**")
              ? <strong key={j} style={{ fontWeight: 700, color: "var(--text)" }}>{p.slice(2, -2)}</strong>
              : p)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AITeacher() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "你好，我是 AI 学习助手「小开」。\n\n我可以帮你：\n- 讲解各类行测题目\n- 总结知识点与解题技巧\n- 生成同类变式练习题\n- 分析你的薄弱环节\n\n目前暂无正在分析的题目，请直接提问。" }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const endRef                = useRef(null);
  const inputRef              = useRef(null);
  const configured            = isAIConfigured();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async text => {
    if (!text.trim() || loading) return;
    const userMsg    = { role: "user", content: text.trim() };
    const newMsgs    = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    inputRef.current?.focus();

    try {
      const settings = getAISettings();
      if (!configured || !window.openexam?.ai) {
        await new Promise(r => setTimeout(r, 350));
        setMessages(prev => [...prev, { role: "assistant", content: "[System]\nAPI 服务尚未配置，无法访问大模型端点。\n\n> 请前往 **设置 → AI 模型** 进行参数配置。" }]);
        setLoading(false);
        return;
      }
      const history = newMsgs.filter(m => m.role === "user" || m.role === "assistant").slice(-10).map(m => ({ role: m.role, content: m.content }));
      const result  = await window.openexam.ai.chat(settings, history);
      setMessages(prev => [...prev, { role: "assistant", content: result.success ? result.content : `[Error]\n回复失败: ${result.error}\n\n请检查网络与模型配置。` }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `[Exception]\n致命异常: ${e.message || "Unknown"}` }]);
    }
    setLoading(false);
  };

  const msgCount   = messages.filter(m => m.role === "user").length;
  const replyCount = messages.filter(m => m.role === "assistant").length - 1;

  return (
    <section className="main-panel" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", boxSizing: "border-box" }}>

      {/* ── HEADER ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 22px 10px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>我的 › AI 老师</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #B53471 0%, #833471 100%)", display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 3px 9px rgba(181,52,113,0.22)" }}>
              <Ico d={ICONS.chat} size={13} col="#fff" sw={2} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>AI 智能导师</h2>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Status pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 16, background: configured ? "rgba(0,184,148,0.07)" : "rgba(231,76,60,0.07)", border: `1px solid ${configured ? "rgba(0,184,148,0.2)" : "rgba(231,76,60,0.2)"}` }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: configured ? "#00b894" : "#e74c3c", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: configured ? "#00b894" : "#e74c3c" }}>{configured ? "已连接" : "未配置"}</span>
          </div>
          {/* Msg count badge */}
          <div style={{ padding: "4px 11px", borderRadius: 16, background: "rgba(109,94,251,0.06)", border: "1px solid rgba(109,94,251,0.12)", fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>
            {msgCount} 次问答
          </div>
          {/* Clear */}
          <button title="清空对话" onClick={() => setMessages([{ role: "assistant", content: "对话已清空，随时可以开始提问。" }])} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = "var(--surface-soft)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}>
            <Ico d={ICONS.trash} size={12} sw={1.8} />
          </button>
        </div>
      </header>

      {/* ── BODY: left sidebar + right chat ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT SIDEBAR */}
        <aside style={{ width: 200, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Quick prompts */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.5px", marginBottom: 8 }}>快捷指令</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {QUICK_PROMPTS.map(qp => (
                <button key={qp.label} onClick={() => sendMessage(qp.prompt)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--text)", cursor: "pointer", textAlign: "left", transition: "all 0.18s", fontFamily: "inherit" }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "rgba(109,94,251,0.04)"; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface-soft)"; }}>
                  <Ico d={qp.icon} size={12} sw={1.8} />
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context area */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", flex: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.5px", marginBottom: 8 }}>当前题目上下文</div>
            <div style={{ padding: "9px 10px", background: "rgba(109,94,251,0.04)", borderRadius: 8, border: "1px dashed rgba(109,94,251,0.2)", fontSize: 10, color: "var(--muted)", lineHeight: 1.6 }}>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>[空]</span> 暂无题目上下文
              <br/>切换到刷题页面后，将自动注入当前题目。
            </div>
          </div>

          {/* Session stats */}
          <div style={{ padding: "12px 14px", flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.5px", marginBottom: 8 }}>本次会话</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "我的提问", val: msgCount,    col: "var(--accent)" },
                { label: "AI 回复",  val: replyCount,  col: "#00b894" },
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
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)", fontSize: 10, color: "var(--muted)", lineHeight: 1.65 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
              <Ico d={ICONS.tip} size={11} col="var(--muted)" sw={1.8} />
              <span>Shift+Enter 换行<br/>Enter 发送消息</span>
            </div>
          </div>
        </aside>

        {/* RIGHT: chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 10px", display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 10, maxWidth: msg.role === "user" ? "75%" : "92%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>

                {/* Avatar */}
                <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: msg.role === "user" ? "transparent" : "rgba(109,94,251,0.08)", color: msg.role === "user" ? "var(--muted)" : "var(--accent)", border: msg.role === "user" ? "1px solid var(--line)" : "none" }}>
                  <Ico d={msg.role === "assistant" ? ICONS.ai : ICONS.user} size={13} sw={1.8} />
                </div>

                {/* Bubble */}
                <div style={{ background: msg.role === "user" ? "var(--surface-soft)" : "transparent", border: msg.role === "user" ? "1px solid var(--line)" : "none", padding: msg.role === "user" ? "9px 13px" : "1px 0 0", borderRadius: msg.role === "user" ? "12px 2px 12px 12px" : 0, fontSize: 12, lineHeight: 1.75, color: "var(--text)", letterSpacing: "0.1px" }}>
                  <MsgContent content={msg.content} />
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 10, maxWidth: "92%", alignSelf: "flex-start" }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(109,94,251,0.08)", color: "var(--accent)" }}>
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
            <div ref={endRef} />
          </div>

          {/* INPUT AREA */}
          <div style={{ padding: "10px 22px 16px", borderTop: "1px solid var(--line)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "var(--surface-soft)", borderRadius: 12, padding: "8px 10px 8px 14px", border: "1px solid var(--line)", transition: "border-color 0.2s" }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="输入你的问题… (Enter 发送，Shift+Enter 换行)"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, lineHeight: 1.65, color: "var(--text)", resize: "none", padding: 0, maxHeight: 100, minHeight: 32, fontFamily: "inherit" }}
              />
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{ width: 30, height: 30, borderRadius: 8, background: (loading || !input.trim()) ? "var(--line)" : "var(--accent)", color: "#fff", border: "none", display: "grid", placeItems: "center", cursor: (loading || !input.trim()) ? "not-allowed" : "pointer", flexShrink: 0, transition: "background 0.2s", boxShadow: (loading || !input.trim()) ? "none" : "0 2px 8px rgba(109,94,251,0.25)" }}>
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
