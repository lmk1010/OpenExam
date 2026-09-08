/**
 * 备考待办 / 笔记 / 申论 / 词语 数据层
 * 与 database.js 共用同一个 better-sqlite3 连接，由 initDatabase() 调用 initStudyPlan(db)。
 */

let db = null;

const TODO_KINDS = ['vocab', 'essay', 'drill', 'note', 'custom'];
const TODO_STATUS = ['todo', 'doing', 'done', 'skipped'];

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseJSON(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function stringifyJSON(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ schema */

const DEFAULT_TEMPLATES = [
  {
    title: '词语积累',
    kind: 'vocab',
    config: { source: 'xuanci' },
    target: { unit: 'count', value: 15 },
    sort: 10,
  },
  {
    title: '申论·归纳概括',
    kind: 'essay',
    config: { essayType: 'guina' },
    target: { unit: 'count', value: 1 },
    sort: 20,
  },
  {
    title: '行测专项·薄弱考点',
    kind: 'drill',
    config: { mode: 'weak' },
    target: { unit: 'count', value: 30 },
    sort: 30,
  },
  {
    title: '当日复盘笔记',
    kind: 'note',
    config: {},
    target: { unit: 'count', value: 1 },
    sort: 40,
  },
];

function initStudyPlan(database) {
  db = database;

  db.exec(`
    -- 待办模板：用户可增删改停用，不写死
    CREATE TABLE IF NOT EXISTS todo_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'custom',
      config TEXT,
      target TEXT,
      repeat_rule TEXT DEFAULT 'daily',
      sort INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 待办实例：每天按模板生成，也可临时插入一次性条目
    CREATE TABLE IF NOT EXISTS todo_instances (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'custom',
      config TEXT,
      target TEXT,
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'todo',
      sort INTEGER DEFAULT 0,
      done_at TEXT,
      meta TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_todo_instances_date ON todo_instances(date);
    CREATE INDEX IF NOT EXISTS idx_todo_instances_kind ON todo_instances(date, kind);

    -- 笔记
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      tags TEXT,
      source_type TEXT,
      source_id TEXT,
      source_label TEXT,
      pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_source ON notes(source_type, source_id);

    -- 词语库
    CREATE TABLE IF NOT EXISTS vocab (
      id TEXT PRIMARY KEY,
      term TEXT NOT NULL UNIQUE,
      kind TEXT DEFAULT 'chengyu',
      meaning TEXT,
      usage TEXT,
      confusable TEXT,
      examples TEXT,
      source_question_id TEXT,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 词语复习（SM-2 间隔重复）
    CREATE TABLE IF NOT EXISTS vocab_reviews (
      vocab_id TEXT PRIMARY KEY,
      stage INTEGER DEFAULT 0,
      ease REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 0,
      due_at TEXT,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      last_review_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_vocab_reviews_due ON vocab_reviews(due_at);

    -- 申论题目
    CREATE TABLE IF NOT EXISTS essay_prompts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      essay_type TEXT DEFAULT 'guina',
      track TEXT DEFAULT 'gongwuyuan',
      province TEXT,
      year INTEGER,
      material TEXT,
      requirement TEXT,
      word_limit INTEGER,
      duration INTEGER,
      reference_answer TEXT,
      scoring_points TEXT,
      source TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_essay_prompts_type ON essay_prompts(essay_type);

    -- 申论作答与批改
    CREATE TABLE IF NOT EXISTS essay_attempts (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      word_count INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 0,
      score REAL,
      max_score REAL,
      review TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_essay_attempts_prompt ON essay_attempts(prompt_id);
    CREATE INDEX IF NOT EXISTS idx_essay_attempts_created ON essay_attempts(created_at DESC);
  `);

  initNotesSearch();
  seedDefaultTemplates();
}

/**
 * 笔记全文检索。中文用 trigram 分词器（SQLite 3.34+），
 * 不可用时退化为 LIKE 查询，searchNotes 会自行判断。
 */
let notesFtsReady = false;

function initNotesSearch() {
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title, content, tags,
        content='notes', content_rowid='rowid',
        tokenize="trigram"
      );
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content, tags)
        VALUES (new.rowid, new.title, new.content, new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content, tags)
        VALUES ('delete', old.rowid, old.title, old.content, old.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content, tags)
        VALUES ('delete', old.rowid, old.title, old.content, old.tags);
        INSERT INTO notes_fts(rowid, title, content, tags)
        VALUES (new.rowid, new.title, new.content, new.tags);
      END;
    `);
    const indexed = db.prepare('SELECT COUNT(*) AS c FROM notes_fts').get().c;
    const total = db.prepare('SELECT COUNT(*) AS c FROM notes').get().c;
    if (total > 0 && indexed === 0) {
      db.exec(`INSERT INTO notes_fts(notes_fts) VALUES('rebuild');`);
    }
    notesFtsReady = true;
  } catch (error) {
    console.warn('笔记全文索引不可用，退回 LIKE 搜索:', error.message);
    notesFtsReady = false;
  }
}

function seedDefaultTemplates() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM todo_templates').get().c;
  if (count > 0) return;
  const seeded = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('todo_templates_seeded');
  if (seeded) return;

  const insert = db.prepare(`
    INSERT INTO todo_templates (id, title, kind, config, target, repeat_rule, sort, enabled)
    VALUES (@id, @title, @kind, @config, @target, 'daily', @sort, 1)
  `);
  const run = db.transaction((items) => {
    for (const item of items) {
      insert.run({
        id: uid(),
        title: item.title,
        kind: item.kind,
        config: stringifyJSON(item.config),
        target: stringifyJSON(item.target),
        sort: item.sort,
      });
    }
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('todo_templates_seeded', '1', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = '1', updated_at = CURRENT_TIMESTAMP
    `).run();
  });
  run(DEFAULT_TEMPLATES);
}

/* --------------------------------------------------------------- templates */

function mapTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    config: parseJSON(row.config, {}),
    target: parseJSON(row.target, { unit: 'count', value: 1 }),
    repeatRule: row.repeat_rule || 'daily',
    sort: row.sort ?? 0,
    enabled: !!row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getTodoTemplates() {
  return db
    .prepare('SELECT * FROM todo_templates ORDER BY sort ASC, created_at ASC')
    .all()
    .map(mapTemplate);
}

function saveTodoTemplate(input = {}) {
  const kind = TODO_KINDS.includes(input.kind) ? input.kind : 'custom';
  const title = String(input.title || '').trim();
  if (!title) throw new Error('待办标题不能为空');

  const target = input.target && typeof input.target === 'object'
    ? input.target
    : { unit: 'count', value: 1 };

  if (input.id) {
    const exists = db.prepare('SELECT id FROM todo_templates WHERE id = ?').get(input.id);
    if (exists) {
      db.prepare(`
        UPDATE todo_templates
        SET title = @title, kind = @kind, config = @config, target = @target,
            repeat_rule = @repeatRule, sort = @sort, enabled = @enabled,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        id: input.id,
        title,
        kind,
        config: stringifyJSON(input.config || {}),
        target: stringifyJSON(target),
        repeatRule: input.repeatRule || 'daily',
        sort: Number(input.sort) || 0,
        enabled: input.enabled === false ? 0 : 1,
      });
      return mapTemplate(db.prepare('SELECT * FROM todo_templates WHERE id = ?').get(input.id));
    }
  }

  const id = input.id || uid();
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort), 0) AS s FROM todo_templates').get().s;
  db.prepare(`
    INSERT INTO todo_templates (id, title, kind, config, target, repeat_rule, sort, enabled)
    VALUES (@id, @title, @kind, @config, @target, @repeatRule, @sort, @enabled)
  `).run({
    id,
    title,
    kind,
    config: stringifyJSON(input.config || {}),
    target: stringifyJSON(target),
    repeatRule: input.repeatRule || 'daily',
    sort: Number.isFinite(Number(input.sort)) ? Number(input.sort) : maxSort + 10,
    enabled: input.enabled === false ? 0 : 1,
  });
  return mapTemplate(db.prepare('SELECT * FROM todo_templates WHERE id = ?').get(id));
}

function deleteTodoTemplate(templateId) {
  if (!templateId) return { success: false };
  const run = db.transaction(() => {
    db.prepare('DELETE FROM todo_templates WHERE id = ?').run(templateId);
    // 未完成的今日实例一并撤掉，已完成的保留为历史
    db.prepare(`
      DELETE FROM todo_instances
      WHERE template_id = ? AND status IN ('todo', 'doing')
    `).run(templateId);
  });
  run();
  return { success: true };
}

function reorderTodoTemplates(ids = []) {
  if (!Array.isArray(ids) || !ids.length) return { success: false };
  const update = db.prepare('UPDATE todo_templates SET sort = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const run = db.transaction(() => {
    ids.forEach((id, index) => update.run((index + 1) * 10, id));
  });
  run();
  return { success: true };
}

/* --------------------------------------------------------------- instances */

function shouldRunOnDate(repeatRule, dateStr) {
  const rule = String(repeatRule || 'daily');
  if (rule === 'daily') return true;
  const day = new Date(`${dateStr}T00:00:00`).getDay(); // 0=周日
  if (rule === 'weekdays') return day >= 1 && day <= 5;
  if (rule.startsWith('weekly:')) {
    const days = rule
      .slice(7)
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isFinite(n));
    return days.includes(day);
  }
  return true;
}

function mapInstance(row) {
  if (!row) return null;
  const target = parseJSON(row.target, { unit: 'count', value: 1 });
  const targetValue = Number(target?.value) || 0;
  const progress = Number(row.progress) || 0;
  return {
    id: row.id,
    templateId: row.template_id,
    date: row.date,
    title: row.title,
    kind: row.kind,
    config: parseJSON(row.config, {}),
    target,
    progress,
    percent: targetValue > 0 ? Math.min(100, Math.round((progress / targetValue) * 100)) : (row.status === 'done' ? 100 : 0),
    status: row.status,
    sort: row.sort ?? 0,
    doneAt: row.done_at,
    meta: parseJSON(row.meta, {}),
    createdAt: row.created_at,
  };
}

/** 按模板补齐某天的待办实例（幂等） */
function ensureDailyTodos(dateStr = todayStr()) {
  const date = String(dateStr).slice(0, 10);
  const templates = db
    .prepare('SELECT * FROM todo_templates WHERE enabled = 1 ORDER BY sort ASC, created_at ASC')
    .all();

  const existing = new Set(
    db
      .prepare('SELECT template_id FROM todo_instances WHERE date = ? AND template_id IS NOT NULL')
      .all(date)
      .map((row) => row.template_id)
  );

  const insert = db.prepare(`
    INSERT INTO todo_instances (id, template_id, date, title, kind, config, target, progress, status, sort)
    VALUES (@id, @templateId, @date, @title, @kind, @config, @target, 0, 'todo', @sort)
  `);

  const run = db.transaction(() => {
    for (const tpl of templates) {
      if (existing.has(tpl.id)) continue;
      if (!shouldRunOnDate(tpl.repeat_rule, date)) continue;
      insert.run({
        id: uid(),
        templateId: tpl.id,
        date,
        title: tpl.title,
        kind: tpl.kind,
        config: tpl.config,
        target: tpl.target,
        sort: tpl.sort ?? 0,
      });
    }
  });
  run();
  return date;
}

function getDailyTodos(dateStr = todayStr()) {
  const date = ensureDailyTodos(dateStr);
  const items = db
    .prepare('SELECT * FROM todo_instances WHERE date = ? ORDER BY sort ASC, created_at ASC')
    .all(date)
    .map(mapInstance);

  const done = items.filter((item) => item.status === 'done').length;
  const skipped = items.filter((item) => item.status === 'skipped').length;
  const active = items.length - skipped;

  return {
    date,
    items,
    summary: {
      total: items.length,
      active,
      done,
      skipped,
      percent: active > 0 ? Math.round((done / active) * 100) : 0,
      allDone: active > 0 && done === active,
    },
    overdue: getOverdueTodos(date),
  };
}

/** 昨天及更早未完成的待办（最多回看 7 天），用于首页「欠账」提示 */
function getOverdueTodos(dateStr = todayStr(), lookbackDays = 7) {
  const date = String(dateStr).slice(0, 10);
  const from = new Date(`${date}T00:00:00`);
  from.setDate(from.getDate() - lookbackDays);
  return db
    .prepare(`
      SELECT * FROM todo_instances
      WHERE date < ? AND date >= ? AND status IN ('todo', 'doing')
      ORDER BY date DESC, sort ASC
    `)
    .all(date, todayStr(from))
    .map(mapInstance);
}

/** 临时插入一条只属于某天的待办（不建模板） */
function addTodoInstance(input = {}) {
  const date = String(input.date || todayStr()).slice(0, 10);
  const title = String(input.title || '').trim();
  if (!title) throw new Error('待办标题不能为空');
  const id = uid();
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort), 0) AS s FROM todo_instances WHERE date = ?').get(date).s;
  db.prepare(`
    INSERT INTO todo_instances (id, template_id, date, title, kind, config, target, progress, status, sort)
    VALUES (@id, NULL, @date, @title, @kind, @config, @target, 0, 'todo', @sort)
  `).run({
    id,
    date,
    title,
    kind: TODO_KINDS.includes(input.kind) ? input.kind : 'custom',
    config: stringifyJSON(input.config || {}),
    target: stringifyJSON(input.target || { unit: 'count', value: 1 }),
    sort: maxSort + 10,
  });
  return mapInstance(db.prepare('SELECT * FROM todo_instances WHERE id = ?').get(id));
}

function updateTodoInstance(input = {}) {
  const { id } = input;
  if (!id) throw new Error('缺少待办 id');
  const row = db.prepare('SELECT * FROM todo_instances WHERE id = ?').get(id);
  if (!row) throw new Error('待办不存在');

  const target = parseJSON(row.target, { unit: 'count', value: 1 });
  const targetValue = Number(target?.value) || 0;

  let progress = row.progress;
  if (Number.isFinite(Number(input.progress))) progress = Math.max(0, Number(input.progress));

  let status = TODO_STATUS.includes(input.status) ? input.status : row.status;
  // 进度达标自动完成；未达标又被回退则退回进行中
  if (input.status === undefined && targetValue > 0) {
    if (progress >= targetValue) status = 'done';
    else if (progress > 0) status = 'doing';
    else status = row.status === 'skipped' ? 'skipped' : 'todo';
  }
  if (status === 'done' && targetValue > 0 && progress < targetValue) progress = targetValue;

  db.prepare(`
    UPDATE todo_instances
    SET title = @title, progress = @progress, status = @status,
        meta = @meta,
        done_at = CASE WHEN @status = 'done' THEN COALESCE(done_at, CURRENT_TIMESTAMP) ELSE NULL END
    WHERE id = @id
  `).run({
    id,
    title: input.title !== undefined ? String(input.title).trim() || row.title : row.title,
    progress,
    status,
    meta: input.meta !== undefined ? stringifyJSON(input.meta) : row.meta,
  });

  return mapInstance(db.prepare('SELECT * FROM todo_instances WHERE id = ?').get(id));
}

function deleteTodoInstance(id) {
  if (!id) return { success: false };
  db.prepare('DELETE FROM todo_instances WHERE id = ?').run(id);
  return { success: true };
}

/**
 * 业务侧回写进度：刷题 / 背词 / 交申论 / 记笔记 完成后调用，
 * 按 kind 给当天未完成的对应待办累加进度。
 */
function bumpTodoProgress(kind, amount = 1, dateStr = todayStr()) {
  if (!TODO_KINDS.includes(kind) || !Number.isFinite(Number(amount))) return { updated: 0 };
  const date = ensureDailyTodos(dateStr);
  const rows = db
    .prepare(`
      SELECT * FROM todo_instances
      WHERE date = ? AND kind = ? AND status IN ('todo', 'doing')
      ORDER BY sort ASC
    `)
    .all(date, kind);

  let updated = 0;
  for (const row of rows) {
    updateTodoInstance({ id: row.id, progress: (Number(row.progress) || 0) + Number(amount) });
    updated += 1;
  }
  return { updated, date };
}

/** 顺延过期待办到今天 */
function carryOverTodos(ids = [], dateStr = todayStr()) {
  const date = ensureDailyTodos(dateStr);
  const list = Array.isArray(ids) && ids.length
    ? ids
    : getOverdueTodos(date).map((item) => item.id);
  if (!list.length) return { moved: 0 };

  const findToday = db.prepare(`
    SELECT * FROM todo_instances
    WHERE date = ? AND template_id IS NOT NULL AND template_id = ?
    LIMIT 1
  `);
  const move = db.prepare("UPDATE todo_instances SET date = ? WHERE id = ? AND status IN ('todo', 'doing')");
  const drop = db.prepare('DELETE FROM todo_instances WHERE id = ?');

  let moved = 0;
  let merged = 0;
  const run = db.transaction(() => {
    for (const id of list) {
      const row = db.prepare('SELECT * FROM todo_instances WHERE id = ?').get(id);
      if (!row || !['todo', 'doing'].includes(row.status)) continue;

      // 今天已有同模板的待办：把欠下的进度并进去，不再多出一条同名条目
      const twin = row.template_id ? findToday.get(date, row.template_id) : null;
      if (twin && twin.id !== row.id) {
        const carried = Math.max(Number(twin.progress) || 0, Number(row.progress) || 0);
        drop.run(row.id);
        if (carried !== (Number(twin.progress) || 0)) {
          updateTodoInstance({ id: twin.id, progress: carried });
        }
        merged += 1;
        continue;
      }
      move.run(date, row.id);
      moved += 1;
    }
  });
  run();
  return { moved, merged, date };
}

/** 首页顶部：近 N 天待办完成率 */
function getTodoStreak(days = 30) {
  const rows = db
    .prepare(`
      SELECT date,
             SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
             SUM(CASE WHEN status != 'skipped' THEN 1 ELSE 0 END) AS active
      FROM todo_instances
      GROUP BY date
      ORDER BY date DESC
      LIMIT ?
    `)
    .all(Math.max(1, Number(days) || 30));

  let streak = 0;
  const cursor = new Date();
  const byDate = new Map(rows.map((row) => [row.date, row]));
  // 今天没做完不断连，从昨天开始算
  if (!(byDate.get(todayStr(cursor))?.active > 0 && byDate.get(todayStr(cursor)).done === byDate.get(todayStr(cursor)).active)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (;;) {
    const row = byDate.get(todayStr(cursor));
    if (!row || !(row.active > 0) || row.done < row.active) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { streak, history: rows.reverse() };
}

/* ------------------------------------------------------------------- notes */

function mapNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    content: row.content || '',
    tags: parseJSON(row.tags, []),
    sourceType: row.source_type || null,
    sourceId: row.source_id || null,
    sourceLabel: row.source_label || null,
    pinned: !!row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    snippet: row.snippet,
  };
}

function normalizeTags(tags) {
  if (!tags) return [];
  const list = Array.isArray(tags)
    ? tags
    : String(tags).split(/[,，\s]+/);
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))];
}

function saveNote(input = {}) {
  const content = String(input.content ?? '');
  const tags = normalizeTags(input.tags);
  const title = String(input.title || '').trim() || deriveNoteTitle(content);

  if (input.id) {
    const exists = db.prepare('SELECT id FROM notes WHERE id = ?').get(input.id);
    if (exists) {
      db.prepare(`
        UPDATE notes
        SET title = @title, content = @content, tags = @tags,
            source_type = @sourceType, source_id = @sourceId, source_label = @sourceLabel,
            pinned = @pinned, updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        id: input.id,
        title,
        content,
        tags: stringifyJSON(tags),
        sourceType: input.sourceType || null,
        sourceId: input.sourceId || null,
        sourceLabel: input.sourceLabel || null,
        pinned: input.pinned ? 1 : 0,
      });
      return mapNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(input.id));
    }
  }

  const id = input.id || uid();
  db.prepare(`
    INSERT INTO notes (id, title, content, tags, source_type, source_id, source_label, pinned)
    VALUES (@id, @title, @content, @tags, @sourceType, @sourceId, @sourceLabel, @pinned)
  `).run({
    id,
    title,
    content,
    tags: stringifyJSON(tags),
    sourceType: input.sourceType || null,
    sourceId: input.sourceId || null,
    sourceLabel: input.sourceLabel || null,
    pinned: input.pinned ? 1 : 0,
  });

  bumpTodoProgress('note', 1);
  return mapNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id));
}

function deriveNoteTitle(content) {
  const firstLine = String(content || '')
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find(Boolean);
  if (!firstLine) return '未命名笔记';
  return firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine;
}

function getNotes(options = {}) {
  const limit = Math.min(500, Math.max(1, Number(options.limit) || 100));
  const offset = Math.max(0, Number(options.offset) || 0);
  const where = [];
  const params = { limit, offset };

  if (options.sourceType) {
    where.push('source_type = @sourceType');
    params.sourceType = options.sourceType;
  }
  if (options.sourceId) {
    where.push('source_id = @sourceId');
    params.sourceId = options.sourceId;
  }
  if (options.tag) {
    where.push('tags LIKE @tag');
    params.tag = `%"${options.tag}"%`;
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM notes ${clause} ORDER BY pinned DESC, updated_at DESC LIMIT @limit OFFSET @offset`)
    .all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM notes ${clause}`).get(params).c;
  return { items: rows.map(mapNote), total };
}

function getNote(id) {
  if (!id) return null;
  return mapNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id));
}

function deleteNote(id) {
  if (!id) return { success: false };
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return { success: true };
}

function searchNotes(keyword, options = {}) {
  const query = String(keyword || '').trim();
  if (!query) return getNotes(options);
  const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));

  // trigram 分词器最短匹配单元是 3 字符，"迥然"这类双字词必须走 LIKE
  if (notesFtsReady && [...query].length >= 3) {
    try {
      const rows = db
        .prepare(`
          SELECT n.*, snippet(notes_fts, 1, '⟦', '⟧', '…', 24) AS snippet
          FROM notes_fts f
          JOIN notes n ON n.rowid = f.rowid
          WHERE notes_fts MATCH @query
          ORDER BY rank
          LIMIT @limit
        `)
        .all({ query: `"${query.replace(/"/g, '""')}"`, limit });
      return { items: rows.map(mapNote), total: rows.length };
    } catch (error) {
      console.warn('FTS 搜索失败，退回 LIKE:', error.message);
    }
  }

  const like = `%${query}%`;
  const rows = db
    .prepare(`
      SELECT * FROM notes
      WHERE title LIKE @like OR content LIKE @like OR tags LIKE @like
      ORDER BY pinned DESC, updated_at DESC
      LIMIT @limit
    `)
    .all({ like, limit });
  return { items: rows.map(mapNote), total: rows.length };
}

function getNoteTags() {
  const rows = db.prepare('SELECT tags FROM notes WHERE tags IS NOT NULL').all();
  const counter = new Map();
  for (const row of rows) {
    for (const tag of parseJSON(row.tags, [])) {
      counter.set(tag, (counter.get(tag) || 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ 申论 */

const ESSAY_TYPES = ['guina', 'duice', 'fenxi', 'guanche', 'dazuowen'];

function mapEssayPrompt(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    essayType: row.essay_type,
    track: row.track,
    province: row.province,
    year: row.year,
    material: row.material || '',
    requirement: row.requirement || '',
    wordLimit: row.word_limit || null,
    duration: row.duration || null,
    referenceAnswer: row.reference_answer || '',
    scoringPoints: parseJSON(row.scoring_points, []),
    source: row.source,
    createdAt: row.created_at,
    attemptCount: row.attempt_count ?? undefined,
    bestScore: row.best_score ?? undefined,
  };
}

function saveEssayPrompt(input = {}) {
  const title = String(input.title || '').trim();
  if (!title) throw new Error('题目标题不能为空');
  const essayType = ESSAY_TYPES.includes(input.essayType) ? input.essayType : 'guina';
  const id = input.id || uid();
  const exists = input.id && db.prepare('SELECT id FROM essay_prompts WHERE id = ?').get(input.id);

  const params = {
    id,
    title,
    essayType,
    track: input.track === 'shiye' ? 'shiye' : 'gongwuyuan',
    province: input.province || null,
    year: Number(input.year) || null,
    material: String(input.material || ''),
    requirement: String(input.requirement || ''),
    wordLimit: Number(input.wordLimit) || null,
    duration: Number(input.duration) || null,
    referenceAnswer: String(input.referenceAnswer || ''),
    scoringPoints: stringifyJSON(input.scoringPoints || []),
    source: input.source || 'manual',
  };

  if (exists) {
    db.prepare(`
      UPDATE essay_prompts SET
        title = @title, essay_type = @essayType, track = @track, province = @province,
        year = @year, material = @material, requirement = @requirement,
        word_limit = @wordLimit, duration = @duration,
        reference_answer = @referenceAnswer, scoring_points = @scoringPoints
      WHERE id = @id
    `).run(params);
  } else {
    db.prepare(`
      INSERT INTO essay_prompts
        (id, title, essay_type, track, province, year, material, requirement,
         word_limit, duration, reference_answer, scoring_points, source)
      VALUES
        (@id, @title, @essayType, @track, @province, @year, @material, @requirement,
         @wordLimit, @duration, @referenceAnswer, @scoringPoints, @source)
    `).run(params);
  }
  return mapEssayPrompt(db.prepare('SELECT * FROM essay_prompts WHERE id = ?').get(id));
}

function getEssayPrompts(options = {}) {
  const where = [];
  const params = {};
  if (options.essayType) { where.push('p.essay_type = @essayType'); params.essayType = options.essayType; }
  if (options.track) { where.push('p.track = @track'); params.track = options.track; }
  if (options.province) { where.push('p.province = @province'); params.province = options.province; }
  if (options.keyword) {
    where.push('(p.title LIKE @kw OR p.requirement LIKE @kw)');
    params.kw = `%${options.keyword}%`;
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(`
      SELECT p.*,
             (SELECT COUNT(*) FROM essay_attempts a WHERE a.prompt_id = p.id AND a.status = 'graded') AS attempt_count,
             (SELECT MAX(a.score) FROM essay_attempts a WHERE a.prompt_id = p.id AND a.status = 'graded') AS best_score
      FROM essay_prompts p
      ${clause}
      ORDER BY p.created_at DESC
    `)
    .all(params)
    .map(mapEssayPrompt);
}

function getEssayPrompt(id) {
  if (!id) return null;
  return mapEssayPrompt(db.prepare('SELECT * FROM essay_prompts WHERE id = ?').get(id));
}

function deleteEssayPrompt(id) {
  if (!id) return { success: false };
  const run = db.transaction(() => {
    db.prepare('DELETE FROM essay_attempts WHERE prompt_id = ?').run(id);
    db.prepare('DELETE FROM essay_prompts WHERE id = ?').run(id);
  });
  run();
  return { success: true };
}

function mapEssayAttempt(row) {
  if (!row) return null;
  return {
    id: row.id,
    promptId: row.prompt_id,
    answer: row.answer || '',
    wordCount: row.word_count || 0,
    duration: row.duration || 0,
    score: row.score,
    maxScore: row.max_score,
    review: parseJSON(row.review, null),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    promptTitle: row.prompt_title,
    essayType: row.essay_type,
  };
}

/** 保存作答；带 review 表示批改完成，此时才计入待办 */
function saveEssayAttempt(input = {}) {
  const promptId = input.promptId;
  if (!promptId) throw new Error('缺少题目 id');
  const answer = String(input.answer || '');
  const wordCount = answer.replace(/\s/g, '').length;
  const graded = !!input.review;
  const id = input.id || uid();
  const exists = input.id && db.prepare('SELECT id, status FROM essay_attempts WHERE id = ?').get(input.id);

  const params = {
    id,
    promptId,
    answer,
    wordCount,
    duration: Number(input.duration) || 0,
    score: Number.isFinite(Number(input.score)) ? Number(input.score) : null,
    maxScore: Number.isFinite(Number(input.maxScore)) ? Number(input.maxScore) : null,
    review: stringifyJSON(input.review || null),
    status: graded ? 'graded' : (input.status === 'submitted' ? 'submitted' : 'draft'),
  };

  if (exists) {
    db.prepare(`
      UPDATE essay_attempts SET
        answer = @answer, word_count = @wordCount, duration = @duration,
        score = @score, max_score = @maxScore, review = @review, status = @status,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run(params);
  } else {
    db.prepare(`
      INSERT INTO essay_attempts
        (id, prompt_id, answer, word_count, duration, score, max_score, review, status)
      VALUES
        (@id, @promptId, @answer, @wordCount, @duration, @score, @maxScore, @review, @status)
    `).run(params);
  }

  // 只在首次批改完成时推进待办，重批不重复计数
  if (graded && exists?.status !== 'graded') {
    try {
      bumpTodoProgress('essay', 1);
    } catch (error) {
      console.error('回写申论待办失败:', error);
    }
  }

  return mapEssayAttempt(db.prepare('SELECT * FROM essay_attempts WHERE id = ?').get(id));
}

function getEssayAttempts(options = {}) {
  const where = [];
  const params = { limit: Math.min(200, Math.max(1, Number(options.limit) || 50)) };
  if (options.promptId) { where.push('a.prompt_id = @promptId'); params.promptId = options.promptId; }
  if (options.status) { where.push('a.status = @status'); params.status = options.status; }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(`
      SELECT a.*, p.title AS prompt_title, p.essay_type
      FROM essay_attempts a
      LEFT JOIN essay_prompts p ON p.id = a.prompt_id
      ${clause}
      ORDER BY a.created_at DESC
      LIMIT @limit
    `)
    .all(params)
    .map(mapEssayAttempt);
}

function getEssayAttempt(id) {
  if (!id) return null;
  const row = db.prepare(`
    SELECT a.*, p.title AS prompt_title, p.essay_type
    FROM essay_attempts a LEFT JOIN essay_prompts p ON p.id = a.prompt_id
    WHERE a.id = ?
  `).get(id);
  return mapEssayAttempt(row);
}

function deleteEssayAttempt(id) {
  if (!id) return { success: false };
  db.prepare('DELETE FROM essay_attempts WHERE id = ?').run(id);
  return { success: true };
}

/** 今天该练哪道：优先没做过的，其次分最低的 */
function getEssayRecommendation(options = {}) {
  const essayType = options.essayType || 'guina';
  const fresh = db.prepare(`
    SELECT p.* FROM essay_prompts p
    WHERE p.essay_type = ?
      AND NOT EXISTS (SELECT 1 FROM essay_attempts a WHERE a.prompt_id = p.id AND a.status = 'graded')
    ORDER BY RANDOM() LIMIT 1
  `).get(essayType);
  if (fresh) return mapEssayPrompt(fresh);

  const weakest = db.prepare(`
    SELECT p.*, MIN(a.score) AS s FROM essay_prompts p
    JOIN essay_attempts a ON a.prompt_id = p.id AND a.status = 'graded'
    WHERE p.essay_type = ?
    GROUP BY p.id ORDER BY s ASC LIMIT 1
  `).get(essayType);
  return mapEssayPrompt(weakest);
}

module.exports = {
  initStudyPlan,
  todayStr,
  // 模板
  getTodoTemplates,
  saveTodoTemplate,
  deleteTodoTemplate,
  reorderTodoTemplates,
  // 实例
  ensureDailyTodos,
  getDailyTodos,
  getOverdueTodos,
  addTodoInstance,
  updateTodoInstance,
  deleteTodoInstance,
  bumpTodoProgress,
  carryOverTodos,
  getTodoStreak,
  // 笔记
  saveNote,
  getNotes,
  getNote,
  deleteNote,
  searchNotes,
  getNoteTags,
  // 申论
  saveEssayPrompt,
  getEssayPrompts,
  getEssayPrompt,
  deleteEssayPrompt,
  saveEssayAttempt,
  getEssayAttempts,
  getEssayAttempt,
  deleteEssayAttempt,
  getEssayRecommendation,
};
