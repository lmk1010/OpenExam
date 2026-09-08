import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "../components/DialogProvider.jsx";
import { NoteEditor } from "./Notes.jsx";

const ESSAY_TYPES = [
  { value: "guina", label: "归纳概括" },
  { value: "duice", label: "提出对策" },
  { value: "fenxi", label: "综合分析" },
  { value: "guanche", label: "贯彻执行" },
  { value: "dazuowen", label: "大作文" },
];

const typeLabel = (v) => ESSAY_TYPES.find((t) => t.value === v)?.label || "归纳概括";

function Icon({ path, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
  );
}
const PlusIcon = <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>;
const BackIcon = <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>;
const TrashIcon = <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>;
const CheckIcon = <polyline points="20 6 9 17 4 12" />;
const CrossIcon = <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>;

function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Essay({ initialPromptId = null }) {
  const dialog = useDialog();
  const [view, setView] = useState("list"); // list | write | result | import
  const [prompts, setPrompts] = useState([]);
  const [filterType, setFilterType] = useState("");
  const [active, setActive] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!window.openexam?.essay) return;
    setLoading(true);
    try {
      const list = await window.openexam.essay.listPrompts(
        filterType ? { essayType: filterType } : {}
      );
      setPrompts(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!initialPromptId) return;
    (async () => {
      const p = await window.openexam.essay.getPrompt(initialPromptId);
      if (p) { setActive(p); setView("write"); }
    })();
  }, [initialPromptId]);

  const startWrite = async (prompt) => {
    setActive(prompt);
    setView("write");
  };

  const removePrompt = async (prompt) => {
    const ok = await dialog.confirm({
      title: "删除题目",
      message: `「${prompt.title}」连同它的作答记录会一起删掉。`,
    });
    if (!ok) return;
    await window.openexam.essay.deletePrompt(prompt.id);
    load();
  };

  if (view === "import") {
    return <EssayImport onCancel={() => setView("list")} onSaved={() => { setView("list"); load(); }} />;
  }

  if (view === "write" && active) {
    return (
      <EssayWriter
        prompt={active}
        onExit={() => { setView("list"); load(); }}
        onGraded={(result) => { setAttempt(result); setView("result"); }}
      />
    );
  }

  if (view === "result" && attempt) {
    return (
      <EssayResult
        attempt={attempt}
        prompt={active}
        onBack={() => { setView("list"); load(); }}
        onRetry={() => setView("write")}
      />
    );
  }

  return (
    <div className="essay-page">
      <header className="essay-head">
        <div>
          <h1>申论</h1>
          <p>一天一道，写完交给 AI 逐条对采分点，看清楚漏在哪。</p>
        </div>
        <button type="button" className="essay-primary" onClick={() => setView("import")}>
          <Icon path={PlusIcon} size={15} />
          <span>录入题目</span>
        </button>
      </header>

      <div className="essay-filters">
        <button type="button" className={`essay-chip${filterType ? "" : " is-active"}`} onClick={() => setFilterType("")}>全部</button>
        {ESSAY_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`essay-chip${filterType === t.value ? " is-active" : ""}`}
            onClick={() => setFilterType(filterType === t.value ? "" : t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="essay-empty">加载中…</div>
      ) : prompts.length === 0 ? (
        <div className="essay-empty">
          <strong>题库里还没有申论题</strong>
          <span>
            题库自带的 161 套卷都是行测客观题，申论要自己录进来。
            拍照或截图交给 AI 识别，也可以直接粘贴材料和题干。
          </span>
          <button type="button" onClick={() => setView("import")}>录入第一道</button>
        </div>
      ) : (
        <ul className="essay-list">
          {prompts.map((p) => (
            <li key={p.id} className="essay-item" onClick={() => startWrite(p)}>
              <div className="essay-item-main">
                <div className="essay-item-title">{p.title}</div>
                <div className="essay-item-meta">
                  <span className="essay-item-type">{typeLabel(p.essayType)}</span>
                  {p.province && <span>{p.province}</span>}
                  {p.year && <span>{p.year} 年</span>}
                  {p.wordLimit ? <span>{p.wordLimit} 字内</span> : null}
                </div>
              </div>
              <div className="essay-item-side">
                {p.attemptCount > 0 ? (
                  <div className="essay-item-score">
                    <em>{p.bestScore ?? "—"}</em>
                    <span>最好成绩 · 练过 {p.attemptCount} 次</span>
                  </div>
                ) : (
                  <span className="essay-item-fresh">没做过</span>
                )}
                <button type="button" className="essay-item-del" onClick={(e) => { e.stopPropagation(); removePrompt(p); }} aria-label="删除">
                  <Icon path={TrashIcon} size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- 录入题目 */

function EssayImport({ onCancel, onSaved }) {
  const dialog = useDialog();
  const [form, setForm] = useState({
    title: "", essayType: "guina", province: "", year: "",
    material: "", requirement: "", wordLimit: "", duration: "",
    referenceAnswer: "", scoringPointsText: "",
  });
  const [recognizing, setRecognizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const patch = (next) => setForm((prev) => ({ ...prev, ...next }));

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const settings = await window.openexam.db.getAISettings();
    if (!settings?.apiKey) {
      dialog.alert({ title: "先配置 AI", message: "图片识别要用到 AI，请先到「系统设置 → AI」里填好 API Key。" });
      return;
    }

    setRecognizing(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await window.openexam.ai.recognizeEssay(settings, base64, file.type || "image/png");
      if (!result?.success) {
        dialog.alert({ title: "识别失败", message: result?.error || "换一张更清晰的图片试试" });
        return;
      }
      const p = result.prompt || {};
      patch({
        title: p.title || form.title,
        essayType: ESSAY_TYPES.some((t) => t.value === p.essayType) ? p.essayType : form.essayType,
        province: p.province || form.province,
        year: p.year || form.year,
        material: p.material || form.material,
        requirement: p.requirement || form.requirement,
        wordLimit: p.wordLimit || form.wordLimit,
      });
    } catch (error) {
      dialog.alert({ title: "识别失败", message: error?.message || "未知错误" });
    } finally {
      setRecognizing(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.material.trim() || !form.requirement.trim()) {
      dialog.alert({ title: "还差点东西", message: "标题、给定材料、作答要求这三样都得填，AI 才批得准。" });
      return;
    }
    setSaving(true);
    try {
      await window.openexam.essay.savePrompt({
        ...form,
        year: Number(form.year) || null,
        wordLimit: Number(form.wordLimit) || null,
        duration: Number(form.duration) || null,
        scoringPoints: form.scoringPointsText
          .split("\n").map((l) => l.trim()).filter(Boolean),
        source: "manual",
      });
      onSaved();
    } catch (error) {
      dialog.alert({ title: "保存失败", message: error?.message || "未知错误" });
      setSaving(false);
    }
  };

  return (
    <div className="essay-page">
      <header className="essay-head">
        <button type="button" className="essay-back" onClick={onCancel}>
          <Icon path={BackIcon} size={15} /><span>返回</span>
        </button>
      </header>

      <div className="essay-form">
        <h2>录入申论题</h2>
        <p className="essay-form-hint">
          材料抄全是关键 —— AI 靠它提炼采分点。有官方参考答案就一并贴上，批改会更准。
        </p>

        <button type="button" className="essay-ocr" disabled={recognizing} onClick={() => fileRef.current?.click()}>
          {recognizing ? "识别中，长材料要等十几秒…" : "上传图片，让 AI 自动填下面的字段"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />

        <div className="essay-form-row">
          <label className="essay-field essay-field-wide">
            <span>标题</span>
            <input value={form.title} placeholder="2025 国考副省级 第一题" onChange={(e) => patch({ title: e.target.value })} />
          </label>
          <label className="essay-field">
            <span>题型</span>
            <select value={form.essayType} onChange={(e) => patch({ essayType: e.target.value })}>
              {ESSAY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <div className="essay-form-row">
          <label className="essay-field"><span>省份</span>
            <input value={form.province} placeholder="国考 / 浙江" onChange={(e) => patch({ province: e.target.value })} />
          </label>
          <label className="essay-field"><span>年份</span>
            <input type="number" value={form.year} placeholder="2025" onChange={(e) => patch({ year: e.target.value })} />
          </label>
          <label className="essay-field"><span>字数上限</span>
            <input type="number" value={form.wordLimit} placeholder="200" onChange={(e) => patch({ wordLimit: e.target.value })} />
          </label>
          <label className="essay-field"><span>建议用时(分)</span>
            <input type="number" value={form.duration} placeholder="25" onChange={(e) => patch({ duration: e.target.value })} />
          </label>
        </div>

        <label className="essay-field"><span>给定材料</span>
          <textarea rows={10} value={form.material} placeholder="材料1……&#10;材料2……" onChange={(e) => patch({ material: e.target.value })} />
        </label>

        <label className="essay-field"><span>作答要求</span>
          <textarea rows={3} value={form.requirement} placeholder="根据给定资料，概括……要求：全面、准确、有条理，不超过 200 字。" onChange={(e) => patch({ requirement: e.target.value })} />
        </label>

        <details className="essay-optional">
          <summary>参考答案与采分点（可选，填了批改更准）</summary>
          <label className="essay-field"><span>参考答案</span>
            <textarea rows={5} value={form.referenceAnswer} onChange={(e) => patch({ referenceAnswer: e.target.value })} />
          </label>
          <label className="essay-field"><span>采分点，一行一个</span>
            <textarea rows={5} value={form.scoringPointsText} placeholder="基层治理成本高&#10;群众参与度低&#10;数字化手段缺位" onChange={(e) => patch({ scoringPointsText: e.target.value })} />
          </label>
        </details>

        <div className="essay-form-actions">
          <button type="button" onClick={onCancel}>取消</button>
          <button type="button" className="is-primary" disabled={saving} onClick={save}>
            {saving ? "保存中…" : "保存题目"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- 作答 */

function EssayWriter({ prompt, onExit, onGraded }) {
  const dialog = useDialog();
  const [answer, setAnswer] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const wordCount = answer.replace(/\s/g, "").length;
  const overLimit = prompt.wordLimit && wordCount > prompt.wordLimit;

  const submit = async () => {
    if (wordCount < 20) {
      dialog.alert({ title: "写得太少", message: "至少写够 20 字再交，不然批不出东西。" });
      return;
    }
    const settings = await window.openexam.db.getAISettings();
    if (!settings?.apiKey) {
      dialog.alert({ title: "先配置 AI", message: "批改要用到 AI，请先到「系统设置 → AI」里填好 API Key。" });
      return;
    }

    setGrading(true);
    try {
      const result = await window.openexam.ai.gradeEssay(settings, {
        essayType: prompt.essayType,
        material: prompt.material,
        requirement: prompt.requirement,
        wordLimit: prompt.wordLimit,
        referenceAnswer: prompt.referenceAnswer,
        scoringPoints: prompt.scoringPoints,
        answer,
      });
      if (!result?.success) {
        dialog.alert({ title: "批改失败", message: result?.error || "稍后重试" });
        return;
      }
      const review = result.review || {};
      const saved = await window.openexam.essay.saveAttempt({
        promptId: prompt.id,
        answer,
        duration: seconds,
        score: review.score,
        maxScore: review.maxScore,
        review,
      });
      onGraded(saved);
    } catch (error) {
      dialog.alert({ title: "批改失败", message: error?.message || "未知错误" });
    } finally {
      setGrading(false);
    }
  };

  const exit = async () => {
    if (wordCount > 0) {
      const ok = await dialog.confirm({ title: "退出作答", message: "还没交卷，写的内容会丢掉。" });
      if (!ok) return;
    }
    onExit();
  };

  return (
    <div className="essay-writer">
      <header className="essay-writer-bar">
        <button type="button" className="essay-back" onClick={exit}>
          <Icon path={BackIcon} size={15} /><span>退出</span>
        </button>
        <div className="essay-writer-title">
          {prompt.title}
          <span className="essay-item-type">{typeLabel(prompt.essayType)}</span>
        </div>
        <div className="essay-writer-timer">{fmtDuration(seconds)}</div>
      </header>

      <div className="essay-writer-body">
        <section className="essay-material">
          <h3>给定材料</h3>
          <div className="essay-material-text">{prompt.material}</div>
        </section>

        <section className="essay-answer">
          <div className="essay-requirement">
            <h3>作答要求</h3>
            <p>{prompt.requirement}</p>
          </div>

          <textarea
            className="essay-answer-area"
            value={answer}
            placeholder="在这里作答。归纳概括先分条，再把每条的核心词提到句首。"
            onChange={(e) => setAnswer(e.target.value)}
          />

          <div className="essay-answer-foot">
            <span className={`essay-wordcount${overLimit ? " is-over" : ""}`}>
              {wordCount}
              {prompt.wordLimit ? ` / ${prompt.wordLimit} 字` : " 字"}
              {overLimit && " · 超了"}
            </span>
            <button type="button" className="essay-primary" disabled={grading} onClick={submit}>
              {grading ? "AI 批改中，约 20 秒…" : "交卷批改"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 批改结果 */

function EssayResult({ attempt, prompt, onBack, onRetry }) {
  const review = attempt.review || {};
  const dimensions = Array.isArray(review.dimensions) ? review.dimensions : [];
  const points = Array.isArray(review.points) ? review.points : [];
  const improvements = Array.isArray(review.improvements) ? review.improvements : [];
  const [noteDraft, setNoteDraft] = useState(null);

  const missed = useMemo(() => points.filter((p) => !p.hit), [points]);
  const hitRate = points.length ? Math.round(((points.length - missed.length) / points.length) * 100) : 0;

  const saveMissedToNote = () => {
    const lines = [
      `# ${prompt?.title || attempt.promptTitle || "申论"} 漏点复盘`,
      "",
      ...missed.map((p) => `- **${p.text}**${p.why ? `\n  原因：${p.why}` : ""}`),
    ];
    setNoteDraft({
      content: lines.join("\n"),
      tags: ["申论", "漏点"],
      sourceType: "essay",
      sourceId: attempt.promptId,
      sourceLabel: prompt?.title || attempt.promptTitle,
    });
  };

  return (
    <div className="essay-page">
      <header className="essay-head">
        <button type="button" className="essay-back" onClick={onBack}>
          <Icon path={BackIcon} size={15} /><span>返回列表</span>
        </button>
        <button type="button" className="essay-primary" onClick={onRetry}>再写一遍</button>
      </header>

      <div className="essay-score-card">
        <div className="essay-score-main">
          <em>{review.score ?? "—"}</em>
          <span>/ {review.maxScore ?? "—"} 分</span>
        </div>
        <div className="essay-score-side">
          <div><strong>{hitRate}%</strong><span>要点覆盖</span></div>
          <div><strong>{attempt.wordCount}</strong><span>字数</span></div>
          <div><strong>{fmtDuration(attempt.duration || 0)}</strong><span>用时</span></div>
        </div>
      </div>

      {review.summary && <p className="essay-summary">{review.summary}</p>}

      {dimensions.length > 0 && (
        <section className="essay-section">
          <h3>分项得分</h3>
          <div className="essay-dims">
            {dimensions.map((d, i) => {
              const pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
              return (
                <div key={i} className="essay-dim">
                  <div className="essay-dim-head">
                    <span>{d.name}</span>
                    <em>{d.score} / {d.max}</em>
                  </div>
                  <div className="essay-dim-bar"><div style={{ width: `${pct}%` }} /></div>
                  {d.comment && <p>{d.comment}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {points.length > 0 && (
        <section className="essay-section">
          <div className="essay-section-head">
            <h3>采分点逐条对照</h3>
            {missed.length > 0 && (
              <button type="button" className="essay-link" onClick={saveMissedToNote}>
                把 {missed.length} 个漏点存成笔记
              </button>
            )}
          </div>
          <ul className="essay-points">
            {points.map((p, i) => (
              <li key={i} className={p.hit ? "is-hit" : "is-miss"}>
                <span className="essay-point-mark">
                  <Icon path={p.hit ? CheckIcon : CrossIcon} size={12} />
                </span>
                <div>
                  <div className="essay-point-text">{p.text}</div>
                  {p.evidence && <div className="essay-point-sub">出处：{p.evidence}</div>}
                  {!p.hit && p.why && <div className="essay-point-why">{p.why}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {improvements.length > 0 && (
        <section className="essay-section">
          <h3>下次注意</h3>
          <ol className="essay-improvements">
            {improvements.map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        </section>
      )}

      <section className="essay-section">
        <h3>你的答案</h3>
        <div className="essay-own-answer">{attempt.answer}</div>
      </section>

      {noteDraft && (
        <NoteEditor
          note={noteDraft}
          onClose={() => setNoteDraft(null)}
          onSaved={() => setNoteDraft(null)}
        />
      )}
    </div>
  );
}
