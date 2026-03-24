const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { app } = require('electron');
const { normalizeQuestionTaxonomy, isFakeQuestion } = require('../shared/questionCategory');
const achievementCatalog = require('../shared/achievementCatalog.json');

let db = null;

const REVIEW_INTERVAL_DAYS = [0, 1, 2, 4, 7, 15, 30];
const USER_GENERATED_PAPER_TYPES = ['imported', 'ai_exam', 'ai_practice'];
const USER_GENERATED_PAPER_TYPE_SQL = USER_GENERATED_PAPER_TYPES.map((type) => `\'${type}\'`).join(', ');

function removeDatabaseArtifacts(dbPath) {
  ['', '-wal', '-shm'].forEach((suffix) => {
    const target = `${dbPath}${suffix}`;
    if (fs.existsSync(target)) fs.unlinkSync(target);
  });
}

function getBundledDatabaseCandidates() {
  const devDataPath = path.join(__dirname, '..', '..', 'data');
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'openexam.seed.db.gz') : '',
    process.resourcesPath ? path.join(process.resourcesPath, 'openexam.seed.db') : '',
    path.join(devDataPath, 'openexam.seed.db.gz'),
    path.join(devDataPath, 'openexam.seed.db'),
  ];
  return candidates.filter(Boolean);
}

function bootstrapBundledDatabase(dbPath) {
  if (fs.existsSync(dbPath)) return false;

  for (const candidate of getBundledDatabaseCandidates()) {
    if (!fs.existsSync(candidate)) continue;
    try {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      removeDatabaseArtifacts(dbPath);
      if (candidate.endsWith('.gz')) {
        fs.writeFileSync(dbPath, zlib.gunzipSync(fs.readFileSync(candidate)));
      } else {
        fs.copyFileSync(candidate, dbPath);
      }
      console.log(`使用内置题库初始化数据库: ${candidate}`);
      return true;
    } catch (error) {
      console.error(`初始化内置题库失败: ${candidate}`, error);
      removeDatabaseArtifacts(dbPath);
    }
  }

  return false;
}

function toSQLiteDateTime(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function parseSQLiteDateTime(value) {
  if (!value) return null;
  const normalized = String(value).replace(' ', 'T');
  const withZone = /z$/i.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(dateTime, days = 0) {
  const next = new Date(dateTime instanceof Date ? dateTime : new Date(dateTime));
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getNextReviewAt(stage = 0, from = new Date()) {
  const safeStage = Math.max(0, Math.min(stage, REVIEW_INTERVAL_DAYS.length - 1));
  return toSQLiteDateTime(addDays(from, REVIEW_INTERVAL_DAYS[safeStage] || 0));
}

function ensurePracticeRecordsSchema() {
  const columns = db.pragma('table_info(practice_records)');
  if (!Array.isArray(columns) || !columns.length) return;

  const byName = new Map(columns.map((column) => [column.name, column]));
  const needsRebuild = [
    'category',
    'sub_category',
    'accuracy',
    'created_at'
  ].some((name) => !byName.has(name)) || Number(byName.get('paper_id')?.notnull || 0) !== 0;

  if (!needsRebuild) return;

  const hasColumn = (name) => byName.has(name);
  const pick = (name, fallback) => hasColumn(name) ? name : fallback;
  const accuracyExpr = hasColumn('accuracy')
    ? `COALESCE(accuracy, CASE WHEN COALESCE(total_count, 0) > 0 THEN ROUND(COALESCE(correct_count, 0) * 100.0 / total_count) ELSE 0 END)`
    : `CASE WHEN COALESCE(total_count, 0) > 0 THEN ROUND(COALESCE(correct_count, 0) * 100.0 / total_count) ELSE 0 END`;

  db.transaction(() => {
    db.exec(`
      CREATE TABLE practice_records_new (
        id TEXT PRIMARY KEY,
        paper_id TEXT,
        category TEXT,
        sub_category TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        status TEXT DEFAULT 'ongoing',
        answers TEXT,
        correct_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        accuracy INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO practice_records_new (
        id, paper_id, category, sub_category, start_time, end_time, duration,
        status, answers, correct_count, total_count, accuracy, score, created_at
      )
      SELECT
        ${pick('id', 'lower(hex(randomblob(16)))')},
        ${pick('paper_id', 'NULL')},
        ${pick('category', 'NULL')},
        ${pick('sub_category', 'NULL')},
        ${pick('start_time', 'CURRENT_TIMESTAMP')},
        ${pick('end_time', 'NULL')},
        ${pick('duration', '0')},
        ${pick('status', "'ongoing'")},
        ${pick('answers', "'{}'")},
        ${pick('correct_count', '0')},
        ${pick('total_count', '0')},
        ${accuracyExpr},
        ${pick('score', '0')},
        ${pick('created_at', "COALESCE(start_time, CURRENT_TIMESTAMP)")}
      FROM practice_records;

      DROP TABLE practice_records;
      ALTER TABLE practice_records_new RENAME TO practice_records;
    `);
  })();
}

function ensureWrongQuestionsSchema() {
  const columns = db.pragma('table_info(wrong_questions)');
  if (!Array.isArray(columns) || !columns.length) return;

  const byName = new Set(columns.map((column) => column.name));
  const additions = [
    ['review_count', 'INTEGER DEFAULT 0'],
    ['last_review', 'TEXT'],
    ['next_review_at', 'TEXT'],
    ['review_stage', 'INTEGER DEFAULT 0'],
  ];

  additions.forEach(([name, definition]) => {
    if (!byName.has(name)) {
      db.prepare(`ALTER TABLE wrong_questions ADD COLUMN ${name} ${definition}`).run();
    }
  });

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_wrong_questions_question_id ON wrong_questions(question_id);
    CREATE INDEX IF NOT EXISTS idx_wrong_questions_next_review_at ON wrong_questions(next_review_at);
  `);

  db.prepare(`
    UPDATE wrong_questions
    SET next_review_at = COALESCE(next_review_at, added_at, datetime('now')),
        review_stage = COALESCE(review_stage, 0),
        review_count = COALESCE(review_count, 0)
    WHERE next_review_at IS NULL OR review_stage IS NULL OR review_count IS NULL
  `).run();
}

function ensureQuestionsSchema() {
  const columns = db.pragma('table_info(questions)');
  if (!Array.isArray(columns) || !columns.length) return;

  const byName = new Set(columns.map((column) => column.name));
  const additions = [
    ['content_html', 'TEXT'],
    ['analysis_html', 'TEXT'],
  ];

  additions.forEach(([name, definition]) => {
    if (!byName.has(name)) {
      db.prepare(`ALTER TABLE questions ADD COLUMN ${name} ${definition}`).run();
    }
  });

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_paper_order_unique ON questions(paper_id, order_num);
  `);
}

// 初始化数据库
function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'openexam.db');

  fs.mkdirSync(userDataPath, { recursive: true });
  bootstrapBundledDatabase(dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // 创建表
  db.exec(`
    -- 试卷表
    CREATE TABLE IF NOT EXISTS papers (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      year INTEGER NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      province TEXT,
      question_count INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 120,
      difficulty INTEGER DEFAULT 3,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 题目表
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      paper_id TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      type TEXT DEFAULT 'single',
      category TEXT,
      sub_category TEXT,
      content TEXT NOT NULL,
      content_html TEXT,
      options TEXT NOT NULL,
      answer TEXT NOT NULL,
      analysis TEXT,
      analysis_html TEXT,
      difficulty INTEGER DEFAULT 2,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paper_id) REFERENCES papers(id)
    );

    -- 练习记录表
    CREATE TABLE IF NOT EXISTS practice_records (
      id TEXT PRIMARY KEY,
      paper_id TEXT,
      category TEXT,
      sub_category TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER,
      status TEXT DEFAULT 'ongoing',
      answers TEXT,
      correct_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      accuracy INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 错题本
    CREATE TABLE IF NOT EXISTS wrong_questions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      paper_id TEXT NOT NULL,
      user_answer TEXT,
      correct_answer TEXT,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      review_count INTEGER DEFAULT 0,
      last_review TEXT,
      next_review_at TEXT,
      review_stage INTEGER DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    -- 应用设置表（持久化 AI 配置等）
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- AI 聊天会话
    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      message_count INTEGER DEFAULT 0,
      last_message_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- AI 聊天消息
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id)
    );
  `);

  ensurePracticeRecordsSchema();
  ensureWrongQuestionsSchema();
  ensureQuestionsSchema();

  // 插入示例数据（如果表为空）
  const count = db.prepare('SELECT COUNT(*) as count FROM papers').get();
  if (count.count === 0) {
    insertSampleData();
  }

  return db;
}

// 插入示例数据
function insertSampleData() {
  const insertPaper = db.prepare(`
    INSERT INTO papers (id, title, year, type, subject, province, question_count, duration, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO questions (id, paper_id, order_num, type, category, sub_category, content, options, answer, analysis, difficulty, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 示例试卷
  const papers = [
    ['paper_2024_national', '2024年国家公务员考试行测真题', 2024, 'national', 'xingce', null, 5, 120, 3],
    ['paper_2024_beijing', '2024年北京市公务员考试行测真题', 2024, 'provincial', 'xingce', '北京', 3, 120, 3],
    ['paper_2023_national', '2023年国家公务员考试行测真题', 2023, 'national', 'xingce', null, 2, 120, 3]
  ];

  // 示例题目
  const questions = [
    ['q_001', 'paper_2024_national', 1, 'single', 'yanyu', 'xuanci',
      '依次填入下列横线处的词语，最恰当的一组是：\n\n科学研究需要______的态度，任何______都可能导致实验失败。',
      JSON.stringify([{key:'A',content:'严谨  疏忽'},{key:'B',content:'严格  忽略'},{key:'C',content:'严肃  疏漏'},{key:'D',content:'严密  忽视'}]),
      'A', '第一空，严谨指严密谨慎，与科学研究搭配恰当。第二空，疏忽指粗心大意。故选A。', 2, '选词填空,近义词辨析'],
    ['q_002', 'paper_2024_national', 2, 'single', 'yanyu', 'yueduan',
      '下列各句中，没有语病的一句是：',
      JSON.stringify([{key:'A',content:'通过这次培训，使我对新技术有了更深入的了解。'},{key:'B',content:'能否保持良好的心态，是考试取得好成绩的关键。'},{key:'C',content:'这篇文章的作者是一位著名的青年作家写的。'},{key:'D',content:'随着科技的发展，人们的生活水平不断提高。'}]),
      'D', 'A项缺主语；B项两面对一面；C项句式杂糅。D项正确。', 2, '病句辨析'],
    ['q_003', 'paper_2024_national', 3, 'single', 'shuliang', 'jisuan',
      '某商品原价100元，先涨价20%，再打八折出售，最终售价是多少元？',
      JSON.stringify([{key:'A',content:'92元'},{key:'B',content:'96元'},{key:'C',content:'100元'},{key:'D',content:'104元'}]),
      'B', '原价100元，涨价20%后为120元，再打八折为96元。故选B。', 1, '经济利润'],
    ['q_004', 'paper_2024_national', 4, 'single', 'panduan', 'luoji',
      '所有的玫瑰都是花，有些花会在冬天凋谢，所以有些玫瑰会在冬天凋谢。\n\n以下哪项最能说明上述推理的错误？',
      JSON.stringify([{key:'A',content:'所有的苹果都是水果，有些水果是甜的，所以有些苹果是甜的'},{key:'B',content:'所有的猫都是动物，有些动物会游泳，所以有些猫会游泳'},{key:'C',content:'所有的学生都是人，有些人是老师，所以有些学生是老师'},{key:'D',content:'所有的铁都是金属，有些金属很贵重，所以有些铁很贵重'}]),
      'B', '题干推理形式为无效推理。B项结构相同且结论明显错误。', 3, '逻辑推理'],
    ['q_005', 'paper_2024_national', 5, 'single', 'changshi', 'zhengzhi',
      '下列关于我国基本政治制度的说法，正确的是：',
      JSON.stringify([{key:'A',content:'人民代表大会制度是我国的根本政治制度'},{key:'B',content:'民族区域自治制度只在少数民族聚居区实行'},{key:'C',content:'基层群众自治制度是我国的基本政治制度之一'},{key:'D',content:'以上说法都正确'}]),
      'D', 'A、B、C三项说法均正确。故选D。', 2, '政治常识'],
    ['q_bj_001', 'paper_2024_beijing', 1, 'single', 'yanyu', 'xuanci',
      '填入下列横线处的词语，最恰当的是：\n\n这座城市的发展______了传统与现代的完美结合。',
      JSON.stringify([{key:'A',content:'体现'},{key:'B',content:'表现'},{key:'C',content:'展示'},{key:'D',content:'显示'}]),
      'A', '体现指某种性质在某一事物上具体表现出来，与完美结合搭配恰当。故选A。', 2, '选词填空'],
    ['q_bj_002', 'paper_2024_beijing', 2, 'single', 'shuliang', 'tuili',
      '1, 4, 9, 16, 25, ?',
      JSON.stringify([{key:'A',content:'30'},{key:'B',content:'36'},{key:'C',content:'42'},{key:'D',content:'49'}]),
      'B', '这是一个平方数列：1, 4, 9, 16, 25, 36。故选B。', 1, '数字推理'],
    ['q_bj_003', 'paper_2024_beijing', 3, 'single', 'ziliao', 'zengzhang',
      '2022年某市GDP为5000亿元，比上年增长8%。问2021年该市GDP约为多少亿元？',
      JSON.stringify([{key:'A',content:'4600亿元'},{key:'B',content:'4630亿元'},{key:'C',content:'4670亿元'},{key:'D',content:'4700亿元'}]),
      'B', '设2021年GDP为x，则x乘以1.08等于5000，x约等于4630亿元。故选B。', 2, '资料分析'],
    ['q_2023_001', 'paper_2023_national', 1, 'single', 'changshi', 'dili',
      '下列关于我国地理的说法，正确的是：',
      JSON.stringify([{key:'A',content:'长江是我国第一大河'},{key:'B',content:'黄河是我国第二长河'},{key:'C',content:'珠穆朗玛峰是世界最高峰'},{key:'D',content:'以上说法都正确'}]),
      'D', 'A、B、C三项说法均正确。故选D。', 1, '地理常识'],
    ['q_2023_002', 'paper_2023_national', 2, 'single', 'shuliang', 'gongcheng',
      '一个水池有甲、乙两个进水管，单独开甲管6小时可注满，单独开乙管8小时可注满。两管同时开，多少小时可注满？',
      JSON.stringify([{key:'A',content:'3小时'},{key:'B',content:'3.4小时'},{key:'C',content:'3.5小时'},{key:'D',content:'4小时'}]),
      'B', '甲管效率1/6，乙管效率1/8，两管同时开效率为7/24，需要24/7约等于3.4小时。', 2, '工程问题']
  ];

  const insertMany = db.transaction(() => {
    papers.forEach(p => insertPaper.run(...p));
    questions.forEach(q => insertQuestion.run(...q));
  });

  insertMany();
}

// 获取所有试卷
function getPapers() {
  return db.prepare('SELECT * FROM papers ORDER BY year DESC, created_at DESC').all();
}

// 获取试卷题目
function getQuestionsByPaperId(paperId) {
  const rows = db.prepare('SELECT * FROM questions WHERE paper_id = ? ORDER BY order_num').all(paperId);
  return rows.map(row => ({
    ...row,
    options: JSON.parse(row.options),
    tags: row.tags ? row.tags.split(',') : []
  }));
}

// 保存练习记录
function savePracticeRecord(record) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO practice_records
    (id, paper_id, category, sub_category, start_time, end_time, duration, status, answers, correct_count, total_count, accuracy, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.id,
    record.paperId || null,
    record.category || null,
    record.subCategory || null,
    record.startTime,
    record.endTime,
    record.duration,
    record.status,
    JSON.stringify(record.answers || {}),
    record.correctCount,
    record.totalCount,
    record.accuracy || 0,
    record.score || 0
  );
}

// 获取练习记录
function getPracticeRecords() {
  const rows = db.prepare(`
    SELECT pr.*, p.title as paper_title
    FROM practice_records pr
    LEFT JOIN papers p ON pr.paper_id = p.id
    ORDER BY pr.start_time DESC
  `).all();
  return rows.map(row => ({
    ...row,
    answers: row.answers ? JSON.parse(row.answers) : {}
  }));
}

// 添加错题
function addWrongQuestion(questionId, paperId, userAnswer, correctAnswer) {
  const now = toSQLiteDateTime();
  db.prepare(`
    INSERT INTO wrong_questions (
      id, question_id, paper_id, user_answer, correct_answer,
      added_at, next_review_at, review_stage
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      paper_id = excluded.paper_id,
      user_answer = excluded.user_answer,
      correct_answer = excluded.correct_answer,
      added_at = excluded.added_at,
      next_review_at = excluded.next_review_at,
      review_stage = 0
  `).run(`wrong_${questionId}`, questionId, String(paperId || ''), userAnswer, correctAnswer, now, now);
}

function hydrateWrongQuestionRow(row) {
  if (!row) return null;

  const nextReviewAt = row.next_review_at || row.added_at || null;
  const nextReviewDate = parseSQLiteDateTime(nextReviewAt);
  const now = new Date();

  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : [],
    review_count: Number(row.review_count || 0),
    review_stage: Number(row.review_stage || 0),
    next_review_at: nextReviewAt,
    is_due: nextReviewDate ? nextReviewDate.getTime() <= now.getTime() : true,
  };
}

// 获取错题列表
function getWrongQuestionById(id) {
  const row = db.prepare(`
    SELECT wq.*, q.content, q.content_html, q.options, q.analysis, q.analysis_html, q.category, q.sub_category, q.answer, p.title AS paper_title
    FROM wrong_questions wq
    LEFT JOIN questions q ON wq.question_id = q.id
    LEFT JOIN papers p ON wq.paper_id = p.id
    WHERE wq.id = ?
  `).get(id);

  return hydrateWrongQuestionRow(row);
}

function getWrongQuestions(options = {}) {
  const dueOnly = Boolean(options && options.dueOnly);
  const limit = Number(options && options.limit);
  const params = [];
  const where = dueOnly ? `WHERE COALESCE(wq.next_review_at, wq.added_at, datetime('now')) <= datetime('now')` : '';
  const limitSql = Number.isFinite(limit) && limit > 0 ? ' LIMIT ?' : '';
  if (limitSql) params.push(Math.floor(limit));

  return db.prepare(`
    SELECT wq.*, q.content, q.content_html, q.options, q.analysis, q.analysis_html, q.category, q.sub_category, q.answer, p.title AS paper_title
    FROM wrong_questions wq
    LEFT JOIN questions q ON wq.question_id = q.id
    LEFT JOIN papers p ON wq.paper_id = p.id
    ${where}
    ORDER BY
      CASE WHEN COALESCE(wq.next_review_at, wq.added_at, datetime('now')) <= datetime('now') THEN 0 ELSE 1 END ASC,
      COALESCE(wq.next_review_at, wq.added_at, datetime('now')) ASC,
      COALESCE(wq.review_stage, 0) ASC,
      wq.added_at DESC
    ${limitSql}
  `).all(...params).map(hydrateWrongQuestionRow);
}

function reviewWrongQuestion(questionId, outcome = 'again') {
  const id = `wrong_${String(questionId || '').trim()}`;
  const row = db.prepare('SELECT * FROM wrong_questions WHERE id = ?').get(id);
  if (!row) throw new Error('错题不存在');

  const currentStage = Number(row.review_stage || 0);
  const isRemembered = outcome === 'remembered';
  const nextStage = isRemembered
    ? Math.min(currentStage + 1, REVIEW_INTERVAL_DAYS.length - 1)
    : 0;
  const now = toSQLiteDateTime();
  const nextReviewAt = getNextReviewAt(nextStage, new Date());

  db.prepare(`
    UPDATE wrong_questions
    SET review_count = COALESCE(review_count, 0) + 1,
        last_review = ?,
        next_review_at = ?,
        review_stage = ?
    WHERE id = ?
  `).run(now, nextReviewAt, nextStage, id);

  return getWrongQuestionById(id);
}

// 获取分类统计
function getCategoryStats() {
  const stats = db.prepare(`
    SELECT
      category,
      COUNT(*) as total,
      0 as done
    FROM questions
    GROUP BY category
  `).all();

  // 获取已做题数（从练习记录中统计）
  const doneStats = db.prepare(`
    SELECT
      q.category,
      COUNT(DISTINCT q.id) as done
    FROM practice_records pr
    JOIN json_each(pr.answers) answer_keys
    INNER JOIN questions q ON q.id = answer_keys.key
    WHERE pr.status = 'completed'
    GROUP BY q.category
  `).all();

  const doneMap = {};
  doneStats.forEach(d => { doneMap[d.category] = d.done; });

  return stats.map(s => ({
    ...s,
    done: doneMap[s.category] || 0
  }));
}

// 获取子分类统计
function getSubCategoryStats(category) {
  return db.prepare(`
    SELECT
      sub_category as subCategory,
      COUNT(*) as count
    FROM questions
    WHERE category = ?
    GROUP BY sub_category
    ORDER BY count DESC, sub_category ASC
  `).all(category);
}

function repairQuestionTaxonomy() {
  const rows = db.prepare('SELECT id, category, sub_category, content FROM questions').all();
  const update = db.prepare('UPDATE questions SET category = ?, sub_category = ? WHERE id = ?');
  let changed = 0;

  db.transaction(() => {
    rows.forEach((row) => {
      const next = normalizeQuestionTaxonomy({
        category: row.category,
        sub_category: row.sub_category,
        content: row.content,
      });

      if (next.category !== row.category || next.subCategory !== (row.sub_category || '')) {
        update.run(next.category, next.subCategory, row.id);
        changed += 1;
      }
    });
  })();

  return { total: rows.length, changed };
}

function repairQuestionCategories() {
  return repairQuestionTaxonomy();
}

// 获取练习统计
function getPracticeStats() {
  const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;

  const completedRecords = db.prepare(`
    SELECT COUNT(*) as count, SUM(correct_count) as correct, SUM(total_count) as total
    FROM practice_records
    WHERE status = 'completed'
  `).get();

  const wrongCount = db.prepare('SELECT COUNT(*) as count FROM wrong_questions').get().count;

  // 今日新增题目数 - 检查列是否存在
  let todayAdded = 0;
  try {
    todayAdded = db.prepare(`
      SELECT COUNT(*) as count FROM questions
      WHERE DATE(created_at) = DATE('now')
    `).get().count;
  } catch (e) {
    // created_at 列不存在，返回 0
  }

  return {
    totalQuestions,
    totalDone: completedRecords.total || 0,
    correctCount: completedRecords.correct || 0,
    wrongCount,
    todayAdded,
    accuracy: completedRecords.total > 0
      ? Math.round((completedRecords.correct / completedRecords.total) * 100)
      : 0
  };
}

function normalizeQuestionType(type) {
  const value = String(type || '').toLowerCase();
  if (['single', 'multiple', 'judge'].includes(value)) return value;
  return 'single';
}

function normalizeQuestionOptions(options) {
  if (Array.isArray(options)) {
    return options
      .filter((option) => option && typeof option === 'object')
      .map((option, index) => ({
        key: String(option.key || String.fromCharCode(65 + index)).toUpperCase(),
        content: String(option.content || ''),
      }));
  }

  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return normalizeQuestionOptions(parsed);
    } catch (error) {
      return [];
    }
  }

  return [];
}

function normalizeQuestionTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean).join(',');
  return String(tags || '').trim();
}

const SAVED_AI_PAPER_TYPES = new Set(['ai_exam', 'ai_practice']);

function normalizeSavedPaperType(type, fallback = 'imported') {
  const value = String(type || '').trim().toLowerCase();
  if (value === 'imported' || SAVED_AI_PAPER_TYPES.has(value)) return value;
  return fallback;
}

function savePaperBundle(paperData = {}, questions = [], fallbackType = 'imported') {
  const normalizedQuestions = Array.isArray(questions) ? questions.filter((question) => !isFakeQuestion(question)) : [];
  if (!normalizedQuestions.length) throw new Error('没有可保存的有效题目');

  const paperType = normalizeSavedPaperType(paperData.type, fallbackType);
  const paperId = `paper_${Date.now()}`;
  const duration = Math.max(
    paperType === 'ai_practice' ? 15 : 20,
    Number(paperData.duration) || normalizedQuestions.length * 2 || 20
  );
  const difficulty = Math.max(1, Math.min(5, Number(paperData.difficulty) || 3));
  const paperTitle = String(paperData.title || '').trim() || (paperType === 'ai_practice' ? 'AI 自定义练习' : '导入试卷');

  const insertPaper = db.prepare(`
    INSERT INTO papers (id, title, year, type, subject, province, question_count, duration, difficulty, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO questions (id, paper_id, order_num, type, category, sub_category, content, content_html, options, answer, analysis, analysis_html, difficulty, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const saveTransaction = db.transaction(() => {
    insertPaper.run(
      paperId,
      paperTitle,
      Number(paperData.year) || new Date().getFullYear(),
      paperType,
      String(paperData.subject || 'xingce').trim() || 'xingce',
      paperData.province || null,
      normalizedQuestions.length,
      duration,
      difficulty
    );

    normalizedQuestions.forEach((q, index) => {
      const questionId = `q_${Date.now()}_${index}`;
      const options = normalizeQuestionOptions(q.options);
      const content = String(q.content || '');
      const contentHtml = String(q.contentHtml || q.content_html || '');
      const analysisHtml = String(q.analysisHtml || q.analysis_html || '');
      const taxonomy = normalizeQuestionTaxonomy({
        category: q.category || paperData.category || 'yanyu',
        subCategory: q.subCategory || q.sub_category || paperData.subCategory || '',
        content,
      });
      insertQuestion.run(
        questionId,
        paperId,
        index + 1,
        normalizeQuestionType(q.type),
        taxonomy.category,
        taxonomy.subCategory,
        content,
        contentHtml || null,
        JSON.stringify(options),
        String(q.answer || '').trim().toUpperCase(),
        q.analysis || '',
        analysisHtml || null,
        Math.max(1, Math.min(5, Number(q.difficulty) || difficulty || 2)),
        normalizeQuestionTags(q.tags)
      );
    });
  });

  saveTransaction();

  return { paperId, questionCount: normalizedQuestions.length, type: paperType, title: paperTitle };
}

// 导入试卷和题目
function importPaper(paperData, questions) {
  return savePaperBundle({ ...paperData, type: 'imported' }, questions, 'imported');
}

function saveAIPaper(paperData, questions) {
  return savePaperBundle({ ...paperData, type: normalizeSavedPaperType(paperData?.type, 'ai_exam') }, questions, 'ai_exam');
}

// 获取导入的试卷列表
function getImportedPapers() {
  return db.prepare(`
    SELECT * FROM papers
    WHERE type = 'imported'
    ORDER BY created_at DESC
  `).all();
}

function getSavedAIPapers() {
  return db.prepare(`
    SELECT * FROM papers
    WHERE type IN ('ai_exam', 'ai_practice')
    ORDER BY created_at DESC
  `).all();
}

function getSavedPaperForManage(paperId) {
  const id = String(paperId || '').trim();
  if (!id) throw new Error('内容不存在');

  const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(id);
  if (!paper) throw new Error('内容不存在或已删除');
  if (!SAVED_AI_PAPER_TYPES.has(String(paper.type || '').trim())) throw new Error('仅支持管理已保存 AI 内容');

  return paper;
}

function renameSavedPaper(paperId, title) {
  const paper = getSavedPaperForManage(paperId);
  const nextTitle = String(title || '').trim();
  if (!nextTitle) throw new Error('名称不能为空');

  db.prepare('UPDATE papers SET title = ? WHERE id = ?').run(nextTitle, paper.id);
  return { ...paper, title: nextTitle };
}

function deleteSavedPaper(paperId) {
  const paper = getSavedPaperForManage(paperId);

  const remove = db.transaction(() => {
    const removedPracticeRecords = db.prepare('DELETE FROM practice_records WHERE paper_id = ?').run(paper.id).changes;
    const removedWrongQuestions = db.prepare('DELETE FROM wrong_questions WHERE paper_id = ?').run(paper.id).changes;
    const removedQuestions = db.prepare('DELETE FROM questions WHERE paper_id = ?').run(paper.id).changes;
    db.prepare('DELETE FROM papers WHERE id = ?').run(paper.id);
    return { removedPracticeRecords, removedWrongQuestions, removedQuestions };
  });

  const summary = remove();
  return { id: paper.id, title: paper.title, type: paper.type, ...summary };
}

// 按分类获取题目（用于专项练习）
function getQuestionsByCategory(category, subCategory, limit, shuffle) {
  let sql = `SELECT * FROM questions WHERE category = ?`;
  const params = [category];

  if (subCategory && subCategory !== 'all') {
    sql += ` AND sub_category = ?`;
    params.push(subCategory);
  }

  if (shuffle) {
    sql += ` ORDER BY RANDOM()`;
  } else {
    sql += ` ORDER BY paper_id, order_num`;
  }

  if (limit && limit > 0) {
    sql += ` LIMIT ?`;
    params.push(limit);
  }

  const rows = db.prepare(sql).all(...params);
  return rows.map(row => ({
    ...row,
    options: JSON.parse(row.options),
    tags: row.tags ? row.tags.split(',') : []
  }));
}

// 获取过去 N 天每日练习量（用于首页动态折线图）
function getDailyStats(days = 7) {
  const rows = db.prepare(`
    SELECT
      DATE(start_time) as date,
      COUNT(*) as sessions,
      COALESCE(SUM(total_count), 0) as total,
      COALESCE(SUM(correct_count), 0) as correct,
      COALESCE(SUM(duration), 0) as duration
    FROM practice_records
    WHERE start_time >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(start_time)
    ORDER BY date ASC
  `).all(days - 1);

  // 补全缺失日期为0
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = rows.find(r => r.date === dateStr);
    result.push({
      date: dateStr,
      sessions: found?.sessions || 0,
      total: found?.total || 0,
      correct: found?.correct || 0,
      duration: found?.duration || 0
    });
  }
  return result;
}

// 获取连续签到天数（有练习记录即视为已签到）
function getStreakDays() {
  const rows = db.prepare(`
    SELECT DISTINCT DATE(start_time) as date
    FROM practice_records
    ORDER BY date DESC
  `).all();

  if (rows.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < rows.length; i++) {
    const rowDate = new Date(rows[i].date);
    rowDate.setHours(0, 0, 0, 0);
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);

    if (rowDate.getTime() !== expected.getTime()) break;
    streak++;
  }
  return streak;
}

// 获取总学习时长（分钟）
function getTotalStudyMinutes() {
  const row = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) as total
    FROM practice_records
    WHERE status = 'completed'
  `).get();
  return Math.floor((row?.total || 0) / 60);
}

// 获取今日学习数据
function getTodayStats() {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(total_count), 0) as total,
      COALESCE(SUM(correct_count), 0) as correct,
      COALESCE(SUM(duration), 0) as duration,
      COUNT(*) as sessions
    FROM practice_records
    WHERE DATE(start_time) = ?
  `).get(today);
  return {
    total: row?.total || 0,
    correct: row?.correct || 0,
    duration: Math.floor((row?.duration || 0) / 60),
    sessions: row?.sessions || 0
  };
}

// 获取过去90天热力图数据（真实练习量）
function getHeatmapData(days = 90) {
  const rows = db.prepare(`
    SELECT
      DATE(start_time) as date,
      COUNT(*) as sessions,
      COALESCE(SUM(total_count), 0) as count
    FROM practice_records
    WHERE start_time >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(start_time)
  `).all(days);

  const map = {};
  rows.forEach((row) => {
    map[row.date] = {
      count: row.count || 0,
      sessions: row.sessions || 0,
    };
  });

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayData = map[dateStr] || { count: 0, sessions: 0 };
    const count = dayData.count;
    const sessions = dayData.sessions;

    let level = 0;
    if (count <= 0) level = 0;
    else if (count <= 10) level = 1;
    else if (count <= 30) level = 2;
    else if (count <= 60) level = 3;
    else level = 4;

    result.push({ date: dateStr, count, sessions, level });
  }
  return result;
}

// 获取成就解锁状态
function getAchievementMetrics(metrics = {}) {
  const practiceStats = metrics.practiceStats || getPracticeStats();
  const totalDone = practiceStats.totalDone || 0;

  const perfectCount = db.prepare(`
    SELECT COUNT(*) as c FROM practice_records
    WHERE accuracy = 100 AND status = 'completed' AND paper_id IS NOT NULL
  `).get().c;

  const speedCount = db.prepare(`
    SELECT COUNT(*) as c FROM practice_records
    WHERE duration <= 30 AND correct_count >= 1 AND status = 'completed'
  `).get().c;

  const sessions = db.prepare(`SELECT COUNT(*) as c FROM practice_records WHERE status = 'completed'`).get().c;
  const wrongCount = db.prepare(`SELECT COUNT(*) as c FROM wrong_questions`).get().c;
  const reviewCount = db.prepare(`SELECT COALESCE(SUM(review_count), 0) as c FROM wrong_questions`).get().c;
  const studyDays = db.prepare(`SELECT COUNT(DISTINCT DATE(start_time)) as c FROM practice_records WHERE status = 'completed'`).get().c;
  const categoryCoverage = db.prepare(`
    SELECT COUNT(DISTINCT q.category) as c
    FROM practice_records pr
    JOIN json_each(pr.answers) answer_keys
    INNER JOIN questions q ON q.id = answer_keys.key
    WHERE pr.status = 'completed'
  `).get().c;
  const savedAIPapers = db.prepare(`SELECT COUNT(*) as c FROM papers WHERE type IN ('ai_exam', 'ai_practice')`).get().c;

  const totalQuestions = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  const mastery = totalQuestions > 0 ? Math.round((totalDone / totalQuestions) * 100) : 0;

  return {
    sessions,
    studyDays,
    perfectCount,
    speedCount,
    wrongCount,
    reviewCount,
    categoryCoverage,
    savedAIPapers,
    totalQuestions,
    mastery,
  };
}

function getAchievements(metrics = {}) {
  const practiceStats = metrics.practiceStats || getPracticeStats();
  const totalDone = Number(practiceStats.totalDone) || 0;
  const accuracy = Number(practiceStats.accuracy) || 0;
  const streak = typeof metrics.streak === 'number' ? metrics.streak : getStreakDays();
  const totalMinutes = typeof metrics.totalMinutes === 'number' ? metrics.totalMinutes : getTotalStudyMinutes();
  const achievementMetrics = metrics.achievementMetrics || getAchievementMetrics({ practiceStats });
  const context = {
    totalDone,
    accuracy,
    streak,
    totalMinutes,
    sessions: Number(achievementMetrics.sessions) || 0,
    studyDays: Number(achievementMetrics.studyDays) || 0,
    perfectCount: Number(achievementMetrics.perfectCount) || 0,
    speedCount: Number(achievementMetrics.speedCount) || 0,
    wrongCount: Number(achievementMetrics.wrongCount) || 0,
    reviewCount: Number(achievementMetrics.reviewCount) || 0,
    categoryCoverage: Number(achievementMetrics.categoryCoverage) || 0,
    savedAIPapers: Number(achievementMetrics.savedAIPapers) || 0,
    totalQuestions: Number(achievementMetrics.totalQuestions) || 0,
    mastery: Number(achievementMetrics.mastery) || 0,
  };

  const clamp = (value, max) => Math.max(0, Math.min(Number(value) || 0, max));
  const ratio = (value, max) => max > 0 ? Math.max(0, Math.min((Number(value) || 0) / max, 1)) : 0;
  const buildRequirementProgress = (requirement) => {
    const target = Number(requirement.target) || 0;
    const current = Number(context[requirement.metric]) || 0;
    return {
      current,
      target,
      progressRatio: ratio(current, target),
      text: `${clamp(current, target)}/${target}${requirement.suffix || ''}`,
    };
  };

  return achievementCatalog.map((definition) => {
    if (definition.type === 'combo') {
      const parts = (definition.requirements || []).map(buildRequirementProgress);
      const progressRatio = parts.length > 0 ? Math.min(...parts.map((item) => item.progressRatio)) : 0;
      const unlocked = parts.length > 0 && parts.every((item) => item.current >= item.target);
      return {
        id: definition.id,
        name: definition.name,
        desc: definition.desc,
        group: definition.group,
        tier: definition.tier,
        iconKey: definition.iconKey,
        unlocked,
        progress: unlocked ? 1 : 0,
        target: 1,
        progressRatio,
        progressText: parts.map((item) => item.text).join(' · '),
      };
    }

    const current = Number(context[definition.metric]) || 0;
    const target = Number(definition.target) || 0;
    return {
      id: definition.id,
      name: definition.name,
      desc: definition.desc,
      group: definition.group,
      tier: definition.tier,
      iconKey: definition.iconKey,
      unlocked: current >= target,
      progress: clamp(current, target),
      target,
      progressRatio: ratio(current, target),
      progressText: `${clamp(current, target)}/${target}${definition.suffix || ''}`,
    };
  });
}

// 获取综合成长中心数据（一次性聚合）
function getGrowthData() {
  const streak = getStreakDays();
  const today = getTodayStats();
  const heatmap = getHeatmapData(90);
  const practiceStats = getPracticeStats();
  const totalMinutes = getTotalStudyMinutes();
  const achievementMetrics = getAchievementMetrics({ practiceStats });
  const achievements = getAchievements({ practiceStats, totalMinutes, streak, achievementMetrics });

  // 计算等级 EXP（基于总做题数）
  const totalDone = practiceStats.totalDone || 0;
  const expPerLevel = 100;
  const totalExp = Math.min(totalDone * 2, 9999);
  const level = Math.floor(totalExp / expPerLevel) + 1;
  const exp = totalExp % expPerLevel;

  const levelTitles = ['新手学员', '进阶学员', '熟练学员', '高级学员', '专家学员', '达人学员', '王者学员'];
  const levelTitle = levelTitles[Math.min(level - 1, levelTitles.length - 1)];

  return {
    streak,
    today,
    heatmap,
    achievements,
    achievementMetrics,
    practiceStats,
    totalMinutes,
    level,
    exp,
    maxExp: expPerLevel,
    levelTitle
  };
}

function getAppSetting(key) {
  const row = db.prepare('SELECT value, updated_at FROM app_settings WHERE key = ?').get(key);
  if (!row) return null;
  return row;
}

function setAppSetting(key, value) {
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(key, value);
  return getAppSetting(key);
}

function getAISettings() {
  const row = getAppSetting('ai_settings');
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch (error) {
    return null;
  }
}

function saveAISettings(settings) {
  const payload = JSON.stringify(settings && typeof settings === 'object' ? settings : {});
  const row = setAppSetting('ai_settings', payload);
  return {
    success: true,
    updatedAt: row?.updated_at || new Date().toISOString(),
  };
}

function getAIConnectionState() {
  const row = getAppSetting('ai_connection_state');
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch (error) {
    return null;
  }
}

function saveAIConnectionState(state) {
  const payload = JSON.stringify(state && typeof state === 'object' ? state : {});
  const row = setAppSetting('ai_connection_state', payload);
  return {
    success: true,
    updatedAt: row?.updated_at || new Date().toISOString(),
  };
}

const DEFAULT_USER_PROFILE = Object.freeze({
  name: '考生用户',
});

function normalizeUserProfile(input) {
  const name = String(input?.name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);

  return {
    name: name || DEFAULT_USER_PROFILE.name,
  };
}

function getUserProfile() {
  const row = getAppSetting('user_profile');
  if (!row?.value) return { ...DEFAULT_USER_PROFILE };
  try {
    return normalizeUserProfile(JSON.parse(row.value));
  } catch (error) {
    return { ...DEFAULT_USER_PROFILE };
  }
}

function saveUserProfile(input) {
  const profile = normalizeUserProfile(input);
  const row = setAppSetting('user_profile', JSON.stringify(profile));
  return {
    success: true,
    profile,
    updatedAt: row?.updated_at || new Date().toISOString(),
  };
}

function createAIChatSession(input = {}) {
  const id = String(input.id || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const title = String(input.title || '新会话').trim() || '新会话';
  const provider = String(input.provider || '').trim() || null;
  const model = String(input.model || '').trim() || null;

  db.prepare(`
    INSERT INTO ai_chat_sessions (id, title, provider, model, message_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(id, title, provider, model);

  return db.prepare('SELECT * FROM ai_chat_sessions WHERE id = ?').get(id);
}

function getAIChatSessions(limit = 30) {
  const count = Math.max(1, Math.min(200, Number(limit) || 30));
  return db.prepare(`
    SELECT * FROM ai_chat_sessions
    ORDER BY COALESCE(last_message_at, created_at) DESC, updated_at DESC
    LIMIT ?
  `).all(count);
}

function getAIChatMessages(sessionId, limit = 300) {
  const id = String(sessionId || '').trim();
  if (!id) return [];
  const count = Math.max(1, Math.min(2000, Number(limit) || 300));
  return db.prepare(`
    SELECT * FROM ai_chat_messages
    WHERE session_id = ?
    ORDER BY created_at ASC, rowid ASC
    LIMIT ?
  `).all(id, count);
}

function addAIChatMessage(input = {}) {
  const id = String(input.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const sessionId = String(input.sessionId || '').trim();
  const role = String(input.role || 'assistant').trim();
  const content = String(input.content || '').trim();

  if (!sessionId) throw new Error('sessionId 不能为空');
  if (!content) throw new Error('content 不能为空');

  db.prepare(`
    INSERT INTO ai_chat_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(id, sessionId, role, content);

  db.prepare(`
    UPDATE ai_chat_sessions
    SET
      updated_at = CURRENT_TIMESTAMP,
      last_message_at = CURRENT_TIMESTAMP,
      message_count = (
        SELECT COUNT(*) FROM ai_chat_messages WHERE session_id = ?
      )
    WHERE id = ?
  `).run(sessionId, sessionId);

  return db.prepare('SELECT * FROM ai_chat_messages WHERE id = ?').get(id);
}

function renameAIChatSession(sessionId, title) {
  const id = String(sessionId || '').trim();
  const nextTitle = String(title || '').trim();
  if (!id || !nextTitle) return null;
  db.prepare(`
    UPDATE ai_chat_sessions
    SET title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nextTitle, id);
  return db.prepare('SELECT * FROM ai_chat_sessions WHERE id = ?').get(id);
}

function deleteAIChatSession(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) return { success: false };

  db.transaction(() => {
    db.prepare('DELETE FROM ai_chat_messages WHERE session_id = ?').run(id);
    db.prepare('DELETE FROM ai_chat_sessions WHERE id = ?').run(id);
  })();

  return { success: true };
}

function exportAllData() {
  const safeParseJSON = (value, fallback) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  };

  const papers = db.prepare('SELECT * FROM papers ORDER BY year DESC, created_at DESC').all();
  const questions = db.prepare('SELECT * FROM questions ORDER BY paper_id, order_num ASC').all().map((row) => ({
    ...row,
    options: safeParseJSON(row.options, []),
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
  }));
  const practiceRecords = db.prepare('SELECT * FROM practice_records ORDER BY start_time DESC').all().map((row) => ({
    ...row,
    answers: safeParseJSON(row.answers, {}),
  }));
  const wrongQuestions = db.prepare('SELECT * FROM wrong_questions ORDER BY added_at DESC').all();
  const appSettings = db.prepare('SELECT * FROM app_settings ORDER BY updated_at DESC').all();
  const aiChatSessions = db.prepare('SELECT * FROM ai_chat_sessions ORDER BY updated_at DESC').all();
  const aiChatMessages = db.prepare('SELECT * FROM ai_chat_messages ORDER BY created_at ASC').all();

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    stats: {
      papers: papers.length,
      questions: questions.length,
      practice_records: practiceRecords.length,
      wrong_questions: wrongQuestions.length,
      app_settings: appSettings.length,
      ai_chat_sessions: aiChatSessions.length,
      ai_chat_messages: aiChatMessages.length,
    },
    data: {
      papers,
      questions,
      practice_records: practiceRecords,
      wrong_questions: wrongQuestions,
      app_settings: appSettings,
      ai_chat_sessions: aiChatSessions,
      ai_chat_messages: aiChatMessages,
    },
  };
}

function resetUserData() {
  const clearedAt = new Date().toISOString();
  const savedPaperIds = db.prepare(`
    SELECT id FROM papers
    WHERE type IN (${USER_GENERATED_PAPER_TYPE_SQL})
  `).all().map((row) => row.id);

  const deleteSavedQuestions = savedPaperIds.length > 0
    ? db.prepare(`DELETE FROM questions WHERE paper_id IN (${savedPaperIds.map(() => '?').join(', ')})`)
    : null;
  const deleteSavedPapers = savedPaperIds.length > 0
    ? db.prepare(`DELETE FROM papers WHERE id IN (${savedPaperIds.map(() => '?').join(', ')})`)
    : null;

  const cleared = db.transaction(() => {
    const wrongQuestions = db.prepare('DELETE FROM wrong_questions').run().changes;
    const practiceRecords = db.prepare('DELETE FROM practice_records').run().changes;
    const aiChatMessages = db.prepare('DELETE FROM ai_chat_messages').run().changes;
    const aiChatSessions = db.prepare('DELETE FROM ai_chat_sessions').run().changes;
    const appSettings = db.prepare('DELETE FROM app_settings').run().changes;
    const savedQuestions = deleteSavedQuestions ? deleteSavedQuestions.run(...savedPaperIds).changes : 0;
    const savedPapers = deleteSavedPapers ? deleteSavedPapers.run(...savedPaperIds).changes : 0;

    return {
      wrongQuestions,
      practiceRecords,
      aiChatMessages,
      aiChatSessions,
      appSettings,
      savedQuestions,
      savedPapers,
    };
  })();

  const preserved = {
    papers: db.prepare(`
      SELECT COUNT(*) AS c FROM papers
      WHERE type NOT IN (${USER_GENERATED_PAPER_TYPE_SQL})
    `).get().c,
    questions: db.prepare(`
      SELECT COUNT(*) AS c
      FROM questions q
      INNER JOIN papers p ON p.id = q.paper_id
      WHERE p.type NOT IN (${USER_GENERATED_PAPER_TYPE_SQL})
    `).get().c,
  };

  return {
    success: true,
    clearedAt,
    cleared,
    preserved,
  };
}

function clearAllData() {
  db.transaction(() => {
    db.prepare('DELETE FROM wrong_questions').run();
    db.prepare('DELETE FROM practice_records').run();
    db.prepare('DELETE FROM questions').run();
    db.prepare('DELETE FROM papers').run();
    db.prepare('DELETE FROM ai_chat_messages').run();
    db.prepare('DELETE FROM ai_chat_sessions').run();
    db.prepare('DELETE FROM app_settings').run();
  })();

  return {
    success: true,
    cleared_at: new Date().toISOString(),
  };
}

// 关闭数据库
function closeDatabase() {
  if (db) {
    db.close();
  }
}

module.exports = {
  initDatabase,
  getPapers,
  getQuestionsByPaperId,
  savePracticeRecord,
  getPracticeRecords,
  addWrongQuestion,
  getWrongQuestions,
  reviewWrongQuestion,
  getCategoryStats,
  getSubCategoryStats,
  repairQuestionCategories,
  repairQuestionTaxonomy,
  getPracticeStats,
  importPaper,
  saveAIPaper,
  getImportedPapers,
  getSavedAIPapers,
  renameSavedPaper,
  deleteSavedPaper,
  getQuestionsByCategory,
  getDailyStats,
  getStreakDays,
  getTodayStats,
  getTotalStudyMinutes,
  getHeatmapData,
  getAchievements,
  getGrowthData,
  getAISettings,
  saveAISettings,
  getAIConnectionState,
  saveAIConnectionState,
  getUserProfile,
  saveUserProfile,
  createAIChatSession,
  getAIChatSessions,
  getAIChatMessages,
  addAIChatMessage,
  renameAIChatSession,
  deleteAIChatSession,
  exportAllData,
  resetUserData,
  clearAllData,
  closeDatabase
};
