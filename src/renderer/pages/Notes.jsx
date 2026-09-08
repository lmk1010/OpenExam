import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "../components/DialogProvider.jsx";

const SOURCE_LABEL = {
  question: "题目",
  vocab: "词语",
  essay: "申论",
  paper: "试卷",
};

function Icon({ path, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
  );
}

const SearchIcon = <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>;
const PlusIcon = <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>;
const PinIcon = <path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />;
const TrashIcon = <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>;

function relTime(iso) {
  if (!iso) return "";
  const t = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  const diff = Date.now() - t.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return `${t.getMonth() + 1}/${t.getDate()}`;
}

/** 搜索命中片段：主进程用 ⟦⟧ 包住关键词 */
function Snippet({ text }) {
  if (!text) return null;
  const parts = String(text).split(/(⟦[^⟧]*⟧)/g);
  return (
    <p className="note-card-snippet">
      {parts.map((part, i) =>
        part.startsWith("⟦") && part.endsWith("⟧")
          ? <mark key={i}>{part.slice(1, -1)}</mark>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </p>
  );
}

export default function Notes({ initialDraft = null, onBack }) {
  const dialog = useDialog();
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (kw = keyword, tag = activeTag) => {
    if (!window.openexam?.note) return;
    setLoading(true);
    try {
      const [res, tagList] = await Promise.all([
        kw.trim()
          ? window.openexam.note.search(kw, { limit: 100 })
          : window.openexam.note.list({ limit: 200, tag: tag || undefined }),
        window.openexam.note.tags(),
      ]);
      setNotes(res?.items || []);
      setTags(Array.isArray(tagList) ? tagList : []);
    } catch (error) {
      console.error("加载笔记失败:", error);
    } finally {
      setLoading(false);
    }
  }, [keyword, activeTag]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 搜索输入防抖
  useEffect(() => {
    const timer = setTimeout(() => load(keyword, activeTag), 220);
    return () => clearTimeout(timer);
  }, [keyword, activeTag]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialDraft) setSelected({ ...initialDraft });
  }, [initialDraft]);

  const createNote = () => setSelected({ content: "", tags: [] });

  const handleSaved = async () => {
    setSelected(null);
    load();
  };

  const removeNote = async (note) => {
    const ok = await dialog.confirm({ title: "删除笔记", message: `「${note.title}」删掉后无法恢复。` });
    if (!ok) return;
    await window.openexam.note.remove(note.id);
    if (selected?.id === note.id) setSelected(null);
    load();
  };

  const togglePin = async (note) => {
    await window.openexam.note.save({ ...note, pinned: !note.pinned });
    load();
  };

  const searching = keyword.trim().length > 0;

  return (
    <div className="notes-page">
      <header className="notes-head">
        <div>
          <h1>笔记</h1>
          <p>随手记下的东西都在这，全文可搜，AI 导师也读得到。</p>
        </div>
        <button type="button" className="notes-new" onClick={createNote}>
          <Icon path={PlusIcon} size={15} />
          <span>新建笔记</span>
        </button>
      </header>

      <div className="notes-toolbar">
        <div className="notes-search">
          <Icon path={SearchIcon} size={15} />
          <input
            value={keyword}
            placeholder="搜标题、正文、标签…"
            onChange={(e) => setKeyword(e.target.value)}
          />
          {keyword && (
            <button type="button" className="notes-search-clear" onClick={() => setKeyword("")}>清除</button>
          )}
        </div>
      </div>

      {tags.length > 0 && !searching && (
        <div className="notes-tags">
          <button
            type="button"
            className={`notes-tag${activeTag ? "" : " is-active"}`}
            onClick={() => setActiveTag("")}
          >
            全部 <em>{notes.length}</em>
          </button>
          {tags.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              className={`notes-tag${activeTag === tag ? " is-active" : ""}`}
              onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
            >
              {tag} <em>{count}</em>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="notes-empty">加载中…</div>
      ) : notes.length === 0 ? (
        <div className="notes-empty">
          {searching ? (
            <>没搜到「{keyword}」相关的笔记</>
          ) : (
            <>
              <strong>还没有笔记</strong>
              <span>刷题时想到什么、申论漏了哪个点，随手记一条，以后能搜回来。</span>
              <button type="button" onClick={createNote}>记第一条</button>
            </>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <article key={note.id} className={`note-card${note.pinned ? " is-pinned" : ""}`} onClick={() => setSelected(note)}>
              <div className="note-card-head">
                <h3>{note.title || "未命名笔记"}</h3>
                <div className="note-card-tools" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className={note.pinned ? "is-on" : ""} onClick={() => togglePin(note)} aria-label="置顶">
                    <Icon path={PinIcon} size={14} />
                  </button>
                  <button type="button" onClick={() => removeNote(note)} aria-label="删除">
                    <Icon path={TrashIcon} size={14} />
                  </button>
                </div>
              </div>

              {note.snippet
                ? <Snippet text={note.snippet} />
                : <p className="note-card-body">{note.content.slice(0, 140)}</p>}

              <footer className="note-card-foot">
                {note.sourceType && (
                  <span className="note-card-source">
                    {SOURCE_LABEL[note.sourceType] || note.sourceType}
                    {note.sourceLabel ? ` · ${note.sourceLabel}` : ""}
                  </span>
                )}
                {note.tags.map((tag) => <span key={tag} className="note-card-tag">{tag}</span>)}
                <time>{relTime(note.updatedAt)}</time>
              </footer>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <NoteEditor
          note={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ 笔记编辑器 */

export function NoteEditor({ note, onClose, onSaved }) {
  const [content, setContent] = useState(note.content || "");
  const [tagInput, setTagInput] = useState((note.tags || []).join(" "));
  const [saving, setSaving] = useState(false);
  const areaRef = useRef(null);

  useEffect(() => {
    areaRef.current?.focus();
    const el = areaRef.current;
    if (el) el.selectionStart = el.selectionEnd = el.value.length;
  }, []);

  const dirty = useMemo(
    () => content !== (note.content || "") || tagInput !== (note.tags || []).join(" "),
    [content, tagInput, note]
  );

  const save = useCallback(async () => {
    if (!content.trim()) { onClose(); return; }
    setSaving(true);
    try {
      await window.openexam.note.save({
        id: note.id,
        content,
        tags: tagInput,
        sourceType: note.sourceType,
        sourceId: note.sourceId,
        sourceLabel: note.sourceLabel,
        pinned: note.pinned,
      });
      onSaved();
    } catch (error) {
      console.error("保存笔记失败:", error);
      setSaving(false);
    }
  }, [content, tagInput, note, onClose, onSaved]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
      if (e.key === "Escape" && !dirty) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, dirty, onClose]);

  const wordCount = content.replace(/\s/g, "").length;

  return (
    <div className="note-editor-scrim" onClick={() => (dirty ? save() : onClose())}>
      <div className="note-editor" onClick={(e) => e.stopPropagation()}>
        {note.sourceLabel && (
          <div className="note-editor-source">
            来自{SOURCE_LABEL[note.sourceType] || "练习"}：{note.sourceLabel}
          </div>
        )}

        <textarea
          ref={areaRef}
          className="note-editor-area"
          value={content}
          placeholder="第一行会成为标题。&#10;&#10;想到什么写什么 —— 错因、易混词、申论漏了哪个采分点。"
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="note-editor-foot">
          <input
            className="note-editor-tags"
            value={tagInput}
            placeholder="标签，空格分隔"
            onChange={(e) => setTagInput(e.target.value)}
          />
          <span className="note-editor-count">{wordCount} 字</span>
          <button type="button" className="note-editor-cancel" onClick={onClose}>取消</button>
          <button type="button" className="note-editor-save" disabled={saving || !content.trim()} onClick={save}>
            {saving ? "保存中…" : "保存"}
            <kbd>⌘S</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
