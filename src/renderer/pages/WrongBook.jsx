import React, { useEffect, useMemo, useState } from "react";
import RichQuestionContent from "../components/RichQuestionContent.jsx";

const CN = { yanyu: "言语理解", shuliang: "数量关系", panduan: "判断推理", ziliao: "资料分析", changshi: "常识判断" };
const FILTERS = [{ key: "due", label: "待复习" }, { key: "all", label: "全部" }, { key: "learning", label: "熟悉中" }, { key: "mastered", label: "已掌握" }];
const STAGES = [
  { name: "新错题", color: "var(--danger)", bg: "var(--danger-soft)" },
  { name: "1天复习", color: "var(--warning)", bg: "var(--warning-soft)" },
  { name: "2天复习", color: "var(--info)", bg: "var(--info-soft)" },
  { name: "4天复习", color: "var(--accent)", bg: "var(--accent-soft-bg)" },
  { name: "7天复习", color: "var(--info)", bg: "var(--info-soft)" },
  { name: "15天巩固", color: "var(--accent)", bg: "var(--accent-soft-bg)" },
  { name: "30天掌握", color: "var(--success)", bg: "var(--success-soft)" },
];
const parseTime = (value) => value ? new Date(String(value).replace(" ", "T") + "Z") : null;
const formatTime = (value, due) => {
  const date = parseTime(value); if (!date) return "立即复习";
  const diff = Math.round((date.getTime() - Date.now()) / 3600000);
  if (due || diff <= 0) return "现在可复习";
  if (diff < 24) return `${diff} 小时后`;
  const days = Math.round(diff / 24); return `${days} 天后`;
};
const formatShort = (value) => {
  const date = parseTime(value); if (!date) return "刚刚";
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
};
const stageMeta = (stage = 0) => STAGES[Math.max(0, Math.min(stage, STAGES.length - 1))];
const sortByUrgency = (a, b) => (Number(b.is_due) - Number(a.is_due)) || ((parseTime(a.next_review_at)?.getTime() || 0) - (parseTime(b.next_review_at)?.getTime() || 0)) || ((parseTime(b.added_at)?.getTime() || 0) - (parseTime(a.added_at)?.getTime() || 0));

const normalizeOptions = (options) => Array.isArray(options) ? options.map((opt) => ({
  key: String(opt?.key || ""),
  content: String(opt?.content || ""),
})).filter((opt) => opt.key) : [];

export default function WrongBook({ onRedo }) {
  const [list, setList] = useState([]), [loading, setLoading] = useState(true), [filter, setFilter] = useState("due"), [expandedId, setExpandedId] = useState(null), [busyId, setBusyId] = useState(""), [error, setError] = useState("");
  const loadList = async () => {
    if (!window.openexam?.db?.getWrongQuestions) return setLoading(false);
    setLoading(true); setError("");
    try { const rows = await window.openexam.db.getWrongQuestions(); setList((rows || []).sort(sortByUrgency)); }
    catch (e) { setError(e.message || "错题读取失败"); }
    setLoading(false);
  };
  useEffect(() => { loadList(); }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10); const catCount = {};
    list.forEach((item) => { catCount[item.category] = (catCount[item.category] || 0) + 1; });
    const weakest = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
    return { due: list.filter((item) => item.is_due).length, today: list.filter((item) => String(item.added_at || "").startsWith(today)).length, mastered: list.filter((item) => (item.review_stage || 0) >= STAGES.length - 1 && !item.is_due).length, weakest: weakest ? CN[weakest[0]] || weakest[0] : "暂无" };
  }, [list]);

  const filtered = useMemo(() => list.filter((item) => filter === "all" || (filter === "due" && item.is_due) || (filter === "learning" && !item.is_due && (item.review_stage || 0) < STAGES.length - 1) || (filter === "mastered" && !item.is_due && (item.review_stage || 0) >= STAGES.length - 1)).sort(sortByUrgency), [list, filter]);
  const focusDue = () => { setFilter("due"); const first = list.find((item) => item.is_due); if (first) setExpandedId(first.id); };
  const startRedo = () => {
    if (typeof onRedo !== "function") return;
    const source = filtered.length ? filtered : list;
    const seen = new Set();
    const questions = source.map((item, index) => {
      const id = String(item.question_id || item.id || `wrong_redo_${index}`);
      if (seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        type: item.type || "single",
        category: item.category || "",
        sub_category: item.sub_category || "",
        content: item.content || "",
        content_html: item.content_html || "",
        options: normalizeOptions(item.options),
        answer: item.answer || item.correct_answer || "",
        analysis: item.analysis || "",
        analysis_html: item.analysis_html || "",
        paper_id: item.paper_id || null,
      };
    }).filter((item) => item && item.content && item.answer && item.options.length > 0);

    if (!questions.length) {
      setError("当前筛选下没有可重做的完整题目");
      return;
    }
    onRedo(questions, { filter, count: questions.length });
  };
  const updateReview = async (item, outcome) => {
    if (!window.openexam?.db?.reviewWrongQuestion) return;
    const key = `${item.id}:${outcome}`; setBusyId(key); setError("");
    try {
      const updated = await window.openexam.db.reviewWrongQuestion({ questionId: item.question_id, outcome });
      setList((prev) => prev.map((row) => row.id === updated.id ? updated : row).sort(sortByUrgency)); setExpandedId(updated.id);
    } catch (e) { setError(e.message || "复习状态更新失败"); }
    setBusyId("");
  };

  return <section className="main-panel" style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%", boxSizing: "border-box" }}>
    <header style={{ padding: "16px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="breadcrumb" style={{ margin: 0 }}>我的 &gt; 错题本</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 14 }}>
        <div style={{ padding: 18, borderRadius: 22, background: "linear-gradient(135deg, var(--accent), var(--accent-strong))", color: "#fff", boxShadow: "0 18px 40px var(--accent-soft-bg-strong)" }}>
          <div style={{ fontSize: 12, opacity: 0.78, marginBottom: 10 }}>今日复习台</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px" }}>{stats.due}<span style={{ fontSize: 14, fontWeight: 600, marginLeft: 6, opacity: 0.85 }}>道待复习</span></div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, opacity: 0.92 }}>优先清掉到期错题，再把新错题推进到下一阶段，节奏会更稳。</div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={focusDue} style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "var(--surface-elevated)", color: "var(--accent)", fontWeight: 700, cursor: "pointer" }}>开始今日复习</button>
            <button onClick={loadList} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>刷新队列</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[{ label: "今日新增", value: `+${stats.today}`, tone: "var(--danger)" }, { label: "已掌握", value: stats.mastered, tone: "var(--success)" }, { label: "累计错题", value: list.length, tone: "var(--accent)" }, { label: "薄弱板块", value: stats.weakest, tone: "var(--warning)" }].map((card) => <div key={card.label} style={{ padding: "14px 16px", borderRadius: 18, background: "var(--surface-soft)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8, justifyContent: "space-between" }}><span style={{ fontSize: 11, color: "var(--muted)" }}>{card.label}</span><span style={{ fontSize: typeof card.value === "number" ? 24 : 16, fontWeight: 800, color: card.tone, letterSpacing: "-0.4px" }}>{card.value}</span></div>)}
        </div>
      </div>
    </header>

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{FILTERS.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} style={{ padding: "8px 14px", borderRadius: 999, border: filter === item.key ? "1px solid var(--accent-border-soft)" : "1px solid var(--line)", background: filter === item.key ? "var(--accent-soft-bg)" : "var(--surface)", color: filter === item.key ? "var(--accent)" : "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{item.label}</button>)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>按复习紧急度排序 · {filtered.length} 道</div>
        <button onClick={startRedo} disabled={!list.length} style={{ padding: "8px 14px", borderRadius: 12, border: "1px solid var(--accent-border-soft)", background: "var(--accent-soft-bg)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: list.length ? "pointer" : "not-allowed", opacity: list.length ? 1 : 0.55 }}>
          按当前筛选重做
        </button>
      </div>
    </div>
    {error && <div style={{ padding: "11px 14px", borderRadius: 14, border: "1px solid var(--danger-border)", background: "var(--danger-soft)", color: "var(--danger)", fontSize: 12 }}>{error}</div>}
    {loading ? <div style={{ padding: "80px 0", textAlign: "center", color: "var(--muted)" }}>错题加载中…</div> : filtered.length === 0 ? <div style={{ padding: "90px 0", textAlign: "center", color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: 20 }}>当前筛选下暂无错题，状态很棒。</div> : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{filtered.map((item) => {
      const meta = stageMeta(item.review_stage), open = expandedId === item.id, busyRemember = busyId === `${item.id}:remembered`, busyAgain = busyId === `${item.id}:again`;
      return <article key={item.id} style={{ borderRadius: 20, border: item.is_due ? "1px solid var(--accent-border-soft)" : "1px solid var(--line)", background: item.is_due ? "linear-gradient(180deg, var(--accent-soft-bg), var(--surface))" : "var(--surface)", boxShadow: item.is_due ? "0 14px 30px rgba(15, 23, 42, 0.06)" : "none", overflow: "hidden" }}>
        <button onClick={() => setExpandedId(open ? null : item.id)} style={{ width: "100%", padding: 0, border: "none", background: "transparent", textAlign: "left", cursor: "pointer" }}>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--neutral-soft-bg)", color: "var(--text)", fontSize: 11, fontWeight: 700 }}>{CN[item.category] || item.category || "综合"}</span><span style={{ padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700 }}>{meta.name}</span><span style={{ padding: "4px 10px", borderRadius: 999, background: item.is_due ? "var(--accent-soft-bg)" : "var(--neutral-soft-bg)", color: item.is_due ? "var(--accent)" : "var(--muted)", fontSize: 11, fontWeight: 700 }}>{item.is_due ? "待处理" : formatTime(item.next_review_at, item.is_due)}</span><span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{item.paper_title || "未关联试卷"}</span></div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text)", fontWeight: 600 }}>
              {open ? <RichQuestionContent value={item.content_html || item.content} /> : (!item.content || item.content.length <= 110 ? item.content : `${item.content.slice(0, 110)}...`)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, fontSize: 12 }}><div><div style={{ color: "var(--muted)", marginBottom: 4 }}>你的答案</div><div style={{ color: "var(--danger)", fontWeight: 700 }}>{item.user_answer || "未作答"}</div></div><div><div style={{ color: "var(--muted)", marginBottom: 4 }}>正确答案</div><div style={{ color: "var(--success)", fontWeight: 700 }}>{item.correct_answer || item.answer || "-"}</div></div><div><div style={{ color: "var(--muted)", marginBottom: 4 }}>复习次数</div><div style={{ color: "var(--text)", fontWeight: 700 }}>{item.review_count || 0} 次</div></div><div><div style={{ color: "var(--muted)", marginBottom: 4 }}>加入时间</div><div style={{ color: "var(--text)", fontWeight: 700 }}>{formatShort(item.added_at)}</div></div></div>
          </div>
        </button>
        {open && <div style={{ borderTop: "1px solid var(--line)", padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {Array.isArray(item.options) && item.options.length > 0 && <div style={{ display: "grid", gap: 8, marginTop: 16 }}>{item.options.map((opt) => <div key={opt.key} style={{ padding: "11px 12px", borderRadius: 12, border: `1px solid ${opt.key === (item.answer || item.correct_answer) ? "var(--success-border)" : opt.key === item.user_answer ? "var(--danger-border)" : "var(--line)"}`, background: opt.key === (item.answer || item.correct_answer) ? "var(--success-soft)" : opt.key === item.user_answer ? "var(--danger-soft)" : "var(--surface-soft)", fontSize: 12, lineHeight: 1.6, color: "var(--text)" }}><strong style={{ marginRight: 8 }}>{opt.key}.</strong><RichQuestionContent value={opt.content} className="rich-question-option" style={{ display: "inline-block", verticalAlign: "top", width: "calc(100% - 28px)" }} /></div>)}</div>}
          {(item.analysis_html || item.analysis) && <div style={{ padding: "14px 15px", borderRadius: 14, background: "var(--surface-soft)", border: "1px solid var(--line)", fontSize: 12, lineHeight: 1.8, color: "var(--text)" }}><div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>解析</div><RichQuestionContent value={item.analysis_html || item.analysis} className="rich-question-analysis" /></div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div style={{ fontSize: 12, color: "var(--muted)" }}>上次复习 {item.last_review ? formatShort(item.last_review) : "尚未开始"} · 下次 {formatTime(item.next_review_at, item.is_due)}</div><div style={{ display: "flex", gap: 10 }}><button onClick={() => updateReview(item, "again")} disabled={busyAgain || !!busyId} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--danger-border)", background: "var(--danger-soft)", color: "var(--danger)", fontWeight: 700, cursor: busyId ? "wait" : "pointer" }}>{busyAgain ? "处理中..." : "继续复习"}</button><button onClick={() => updateReview(item, "remembered")} disabled={busyRemember || !!busyId} style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, cursor: busyId ? "wait" : "pointer", boxShadow: "0 10px 20px var(--accent-soft-bg-strong)" }}>{busyRemember ? "处理中..." : "记住了，推进阶段"}</button></div></div>
        </div>}
      </article>;
    })}</div>}
  </section>;
}
