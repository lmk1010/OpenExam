import React, { useState, useRef, useEffect } from "react";
import { getAISettings, isAIConfigured } from "../store/aiSettings.js";

const QUICK_PROMPTS = [
  { label: "讲解此题", prompt: "请详细讲解这道题的解题思路" },
  { label: "举一反三", prompt: "请针对这道题生成3道类似的变式题" },
  { label: "知识点", prompt: "请总结这道题涉及的相关知识点" },
  { label: "解题技巧", prompt: "请教我解这类题目的通用技巧" },
];

export default function AITeacher() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "你好，我是 AI 学习助手「小开」。\n\n我可以帮你讲解题目、总结知识点、生成变式题、传授解题技巧。\n\n有什么问题尽管问我。" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const settings = getAISettings();
      if (!isAIConfigured() || !window.openexam?.ai) {
        await new Promise(r => setTimeout(r, 400));
        setMessages(prev => [...prev, { role: "assistant", content: "AI 服务尚未配置。\n\n请前往「设置 → AI 模型」配置后使用。" }]);
        setLoading(false);
        return;
      }
      const chatHistory = newMessages.filter(m => m.role === "user" || m.role === "assistant").slice(-10).map(m => ({ role: m.role, content: m.content }));
      const result = await window.openexam.ai.chat(settings, chatHistory);
      if (result.success) {
        setMessages(prev => [...prev, { role: "assistant", content: result.content }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `回复失败: ${result.error}\n\n请检查 AI 配置。` }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `出了点问题: ${e.message || '未知错误'}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="ai-teacher-page">
      {!isAIConfigured() && (
        <div style={{ padding: "6px 16px", background: "rgba(243,156,18,0.06)", borderBottom: "1px solid var(--line)", fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          AI 未配置 — 请前往设置配置
        </div>
      )}

      <div className="ai-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-chat-msg ${msg.role}`}>
            <div className="ai-chat-avatar">
              {msg.role === "assistant" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z"/><circle cx="8.5" cy="14.5" r="1"/><circle cx="15.5" cy="14.5" r="1"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              )}
            </div>
            <div className="ai-chat-bubble">
              {msg.content.split("\n").map((line, j) => (
                <div key={j} style={{ minHeight: line ? undefined : 6 }}>{line}</div>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-chat-msg assistant">
            <div className="ai-chat-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z"/></svg>
            </div>
            <div className="ai-chat-bubble"><span className="ai-typing">思考中</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="ai-chat-input-area">
        <div className="ai-quick-btns">
          {QUICK_PROMPTS.map(qp => (
            <button key={qp.label} className="chip" onClick={() => sendMessage(qp.prompt)}>{qp.label}</button>
          ))}
        </div>
        <div className="ai-input-row">
          <textarea className="ai-input" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="输入问题... Enter 发送" rows={1} />
          <button className="ai-send-btn" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>发送</button>
        </div>
      </div>
    </div>
  );
}
