import React, { useEffect, useState } from "react";

const CN = { yanyu: "言语理解", shuliang: "数量关系", panduan: "判断推理", ziliao: "资料分析", changshi: "常识判断" };

export default function WrongBook() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      if (!window.openexam?.db) return;
      try { 
        setList(await window.openexam.db.getWrongQuestions()); 
      } catch (e) { 
        console.error(e); 
      }
    })();
  }, []);

  const filtered = list.filter(q => filter === "all" || q.category === filter);
  
  // Calculate stats
  const catCount = {};
  list.forEach(q => { catCount[q.category] = (catCount[q.category] || 0) + 1; });
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayNew = list.filter(q => q.added_at && q.added_at.startsWith(todayStr)).length;
  
  let weakestCat = "暂无";
  let maxWrong = 0;
  Object.entries(catCount).forEach(([k, v]) => {
    if (v > maxWrong) { maxWrong = v; weakestCat = CN[k] || k; }
  });

  return (
    <section className="main-panel" style={{ padding: "0 24px 20px 24px", display: "flex", flexDirection: "column", gap: 0, overflow: "auto", minWidth: 0, height: "100%", boxSizing: "border-box" }}>
      {/* High Density Header */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="breadcrumb" style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>我的 &gt; 错题本</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.5px", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              错题本
            </h2>
          </div>
        </div>
        {/* Compact Stats */}
        <div style={{ display: "flex", gap: 24, paddingRight: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>累计收录</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", fontFamily: "monospace" }}>{list.length} <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400, fontFamily: "sans-serif" }}>道</span></span>
          </div>
          <div style={{ width: 1, height: 24, background: "var(--line)", alignSelf: "center" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>今日新增</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#EE5253", fontFamily: "monospace" }}>+{todayNew} <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400, fontFamily: "sans-serif" }}>道</span></span>
          </div>
          <div style={{ width: 1, height: 24, background: "var(--line)", alignSelf: "center" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>亟待强化</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f39c12", marginTop: 2 }}>{weakestCat}</span>
          </div>
        </div>
      </header>

      {/* Minimalism Tabs */}
      <div style={{ display: "flex", gap: 24, marginTop: 12, flexShrink: 0, paddingBottom: 8 }}>
        <button onClick={() => setFilter("all")}
          style={{ padding: "0 0 8px 0", fontSize: 13, cursor: "pointer", border: "none", background: "transparent", color: filter === "all" ? "var(--text)" : "var(--muted)", fontWeight: filter === "all" ? 600 : 400, position: "relative" }}>
          全部错题
          {filter === "all" && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 2, background: "var(--text)" }} />}
        </button>
        {Object.entries(catCount).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: "0 0 8px 0", fontSize: 13, cursor: "pointer", border: "none", background: "transparent", color: filter === k ? "var(--text)" : "var(--muted)", fontWeight: filter === k ? 600 : 400, position: "relative" }}>
            {CN[k] || k} <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 2 }}>{v}</span>
            {filter === k && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 2, background: "var(--text)" }} />}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, marginTop: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--muted)", minHeight: 200 }}>
            <span style={{ fontSize: 12, border: "1px dashed var(--line)", padding: "12px 24px", borderRadius: 6 }}>无该学科错题记录</span>
          </div>
        ) : (
          <div style={{ overflowY: "auto", flex: 1, paddingRight: 8 }}>
            {filtered.map((q, index) => (
              <div key={q.id} onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                style={{ 
                  borderBottom: "1px solid var(--line)", 
                  padding: "16px 0", 
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 8
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", width: 68, flexShrink: 0, paddingTop: 1, fontWeight: 500 }}>
                    [{CN[q.category] || q.category}]
                  </span>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", overflowWrap: "break-word" }}>
                      {q.content?.length > 120 && expandedId !== q.id ? q.content.slice(0, 120) + "..." : q.content}
                    </div>
                  </div>
                  
                  <span style={{ fontSize: 11, color: "var(--muted)", width: 44, textAlign: "right" }}>
                    {q.added_at?.slice(5, 10).replace('-', '/')}
                  </span>
                </div>
                
                {/* Compact Answer & Status Row */}
                <div style={{ display: "flex", alignItems: "center", gap: 24, marginLeft: 80, fontSize: 12, color: "var(--muted)" }}>
                  <span>错答: <strong style={{ color: "#EE5253", fontWeight: 600 }}>{q.user_answer}</strong></span>
                  <span>正答: <strong style={{ color: "#27ae60", fontWeight: 600 }}>{q.correct_answer}</strong></span>
                  
                  {q.analysis && (
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent)", display: "flex", alignItems: "center", gap: 2 }}>
                      {expandedId === q.id ? "收起解析" : "查看解析"}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedId === q.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  )}
                </div>
                
                {expandedId === q.id && q.analysis && (
                  <div style={{ marginLeft: 80, marginTop: 4, padding: "10px 14px", borderRadius: 6, background: "rgba(0,0,0,0.02)", fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--muted)", marginRight: 8 }}>分析</strong>
                    {q.analysis}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
