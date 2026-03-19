import React, { useEffect, useState } from "react";

const CN = { yanyu: "言语理解", shuliang: "数量关系", panduan: "判断推理", ziliao: "资料分析", changshi: "常识判断" };

export default function WrongBook() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      if (!window.openexam?.db) return;
      try { setList(await window.openexam.db.getWrongQuestions()); } catch (e) { console.error(e); }
    })();
  }, []);

  const filtered = list.filter(q => filter === "all" || q.category === filter);
  const catCount = {};
  list.forEach(q => { catCount[q.category] = (catCount[q.category] || 0) + 1; });

  return (
    <section className="main-panel module-page" style={{ overflow: "auto" }}>
      <div className="breadcrumb">我的 &gt; 错题本</div>
      <div className="brand-row">
        <div className="brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/>
          </svg>
        </div>
        <h2>错题本</h2>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>{list.length} 道</span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        <button className="chip" onClick={() => setFilter("all")}
          style={filter === "all" ? { background: "var(--accent)", color: "#fff" } : {}}>全部 ({list.length})</button>
        {Object.entries(catCount).map(([k, v]) => (
          <button key={k} className="chip" onClick={() => setFilter(k)}
            style={filter === k ? { background: "var(--accent)", color: "#fff" } : {}}>{CN[k] || k} ({v})</button>
        ))}
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 16px", color: "var(--muted)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25, marginBottom: 6 }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/>
            </svg>
            <p style={{ fontSize: 12 }}>暂无错题</p>
            <p style={{ fontSize: 10, marginTop: 2 }}>做题过程中的错题会自动收录</p>
          </div>
        ) : filtered.map(q => (
          <div key={q.id} onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            style={{ background: "var(--surface-soft)", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span className="chip" style={{ background: "rgba(109,94,251,0.1)", color: "var(--accent)", fontSize: 10, padding: "2px 6px", flexShrink: 0 }}>
                {CN[q.category] || q.category}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>{q.content?.slice(0, 70)}{q.content?.length > 70 ? "..." : ""}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 10, color: "var(--muted)" }}>
                  <span>我的 <strong style={{ color: "#e74c3c" }}>{q.user_answer}</strong></span>
                  <span>正确 <strong style={{ color: "#27ae60" }}>{q.correct_answer}</strong></span>
                  <span>{q.added_at?.slice(0, 10)}</span>
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: 2, transform: expandedId === q.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            {expandedId === q.id && q.analysis && (
              <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "var(--surface)", fontSize: 11, color: "var(--muted)", lineHeight: 1.65 }}>
                <strong style={{ color: "var(--text)" }}>解析</strong> {q.analysis}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
