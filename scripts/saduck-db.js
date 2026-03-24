const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { normalizeQuestionTaxonomy, isFakeQuestion } = require('../src/shared/questionCategory');

const OFFICIAL_TYPES = ['national', 'provincial'];
const DEFAULT_SEED_GZIP_PATH = path.join(__dirname, '../data/openexam.seed.db.gz');
const PAPER_PROVINCE_ALIASES = {
  '北京市': '北京',
  '天津市': '天津',
  '上海市': '上海',
  '重庆市': '重庆',
  '深圳市': '深圳',
  '内蒙古自治区': '内蒙古',
  '广西壮族自治区': '广西',
  '宁夏回族自治区': '宁夏',
  '新疆维吾尔自治区': '新疆',
  '西藏自治区': '西藏',
  '香港特别行政区': '香港',
  '澳门特别行政区': '澳门',
};

function normalizePaperProvince(value) {
  const province = String(value || '').trim();
  if (!province) return null;
  if (PAPER_PROVINCE_ALIASES[province]) return PAPER_PROVINCE_ALIASES[province];
  if (province.endsWith('省') || province.endsWith('市')) return province.slice(0, -1);
  return province;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function removeDbArtifacts(dbPath) {
  ['', '-wal', '-shm'].forEach((suffix) => {
    const target = `${dbPath}${suffix}`;
    if (fs.existsSync(target)) fs.unlinkSync(target);
  });
}

function createOfficialSchema(db) {
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_paper_order_unique ON questions(paper_id, order_num);
  `);
}

function hasTable(db, tableName) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
  return Boolean(row?.name);
}

function openDatabase(dbPath, options = {}) {
  ensureDir(dbPath);
  if (options.fresh) removeDbArtifacts(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  createOfficialSchema(db);
  return db;
}

function clearOfficialQuestionBank(db) {
  return db.transaction(() => {
    if (hasTable(db, 'wrong_questions')) {
      db.prepare(`
        DELETE FROM wrong_questions
        WHERE paper_id IN (SELECT id FROM papers WHERE type IN ('national', 'provincial'))
           OR question_id IN (
             SELECT q.id
             FROM questions q
             INNER JOIN papers p ON p.id = q.paper_id
             WHERE p.type IN ('national', 'provincial')
           )
      `).run();
    }

    db.prepare(`DELETE FROM questions WHERE paper_id IN (SELECT id FROM papers WHERE type IN ('national', 'provincial'))`).run();
    db.prepare(`DELETE FROM papers WHERE type IN ('national', 'provincial')`).run();
  })();
}

function cleanupDanglingRecords(db) {
  if (!hasTable(db, 'wrong_questions')) return;
  db.prepare('DELETE FROM wrong_questions WHERE question_id NOT IN (SELECT id FROM questions)').run();
}

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function normalizePaperQuestions(paper = {}) {
  const questions = Array.isArray(paper.questions) ? paper.questions : [];
  return questions.filter((question) => !isFakeQuestion(question));
}

function insertOfficialPapers(db, papers = [], options = {}) {
  const logger = typeof options.logger === 'function' ? options.logger : () => {};
  if (options.clearExisting !== false) clearOfficialQuestionBank(db);

  const insertPaper = db.prepare(`
    INSERT OR REPLACE INTO papers (id, title, year, type, subject, province, question_count, duration, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuestion = db.prepare(`
    INSERT OR REPLACE INTO questions (id, paper_id, order_num, type, category, sub_category, content, content_html, options, answer, analysis, analysis_html, difficulty, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const saveTransaction = db.transaction(() => {
    let totalPapers = 0;
    let totalQuestions = 0;

    for (const paper of papers) {
      const validQuestions = normalizePaperQuestions(paper);
      if (!validQuestions.length) continue;

      insertPaper.run(
        paper.id,
        paper.title,
        Number(paper.year) || new Date().getFullYear(),
        OFFICIAL_TYPES.includes(String(paper.type || '').trim()) ? paper.type : 'provincial',
        'xingce',
        normalizePaperProvince(paper.province),
        validQuestions.length,
        120,
        Math.round(Number(paper.difficulty) || 3)
      );

      for (const question of validQuestions) {
        const content = String(question.content || '').trim();
        const contentHtml = String(question.content_html || question.contentHtml || '').trim();
        const analysis = String(question.analysis || '').trim();
        const analysisHtml = String(question.analysis_html || question.analysisHtml || '').trim();
        const taxonomy = normalizeQuestionTaxonomy({
          category: question.category,
          sub_category: question.sub_category,
          subCategory: question.subCategory,
          content: content || contentHtml,
        });

        insertQuestion.run(
          `${paper.id}_q${question.order_num}`,
          paper.id,
          Number(question.order_num) || totalQuestions + 1,
          question.type,
          taxonomy.category,
          taxonomy.subCategory,
          content || '图片题',
          contentHtml || null,
          JSON.stringify(parseOptions(question.options)),
          String(question.answer || '').trim().toUpperCase(),
          analysis,
          analysisHtml || null,
          Math.max(1, Math.min(5, Number(question.difficulty) || 2)),
          String(question.source || question.tags || '').trim()
        );
        totalQuestions += 1;
      }

      totalPapers += 1;
      logger(`✓ ${paper.title} (${validQuestions.length}题)`);
    }

    return { totalPapers, totalQuestions };
  });

  const result = saveTransaction();
  cleanupDanglingRecords(db);
  return result;
}

function optimizeDatabase(db) {
  db.pragma('journal_mode = DELETE');
  db.exec('VACUUM');
}

function gzipDatabase(dbPath, gzipPath = DEFAULT_SEED_GZIP_PATH) {
  ensureDir(gzipPath);
  const compressed = zlib.gzipSync(fs.readFileSync(dbPath), { level: 9 });
  fs.writeFileSync(gzipPath, compressed);
  return gzipPath;
}

function buildSeedDatabase(papers = [], options = {}) {
  const dbPath = options.dbPath || path.join(__dirname, '../data/openexam.seed.db');
  const gzipPath = options.gzipPath || DEFAULT_SEED_GZIP_PATH;
  removeDbArtifacts(dbPath);

  const db = openDatabase(dbPath, { fresh: true });
  try {
    const result = insertOfficialPapers(db, papers, { clearExisting: false, logger: options.logger });
    optimizeDatabase(db);
    const output = { ...result, dbPath, gzipPath: gzipDatabase(dbPath, gzipPath) };
    db.close();
    if (!options.keepRaw) removeDbArtifacts(dbPath);
    return output;
  } catch (error) {
    db.close();
    throw error;
  }
}

function getUserDbPath() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, 'Library/Application Support/openexam/openexam.db');
}

function syncOfficialQuestionBank(papers = [], options = {}) {
  const dbPath = options.dbPath || getUserDbPath();
  const db = openDatabase(dbPath);
  try {
    return {
      dbPath,
      ...insertOfficialPapers(db, papers, { clearExisting: true, logger: options.logger })
    };
  } finally {
    db.close();
  }
}

function loadOfficialPapersFromDatabase(dbPath) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const papers = db.prepare(`
      SELECT id, title, year, type, province, question_count, difficulty
      FROM papers
      WHERE type IN ('national', 'provincial')
      ORDER BY year DESC, created_at DESC, title ASC
    `).all();

    return papers.map((paper) => {
      const questions = db.prepare(`
        SELECT order_num, type, category, sub_category, content, content_html, options, answer, analysis, analysis_html, difficulty, tags
        FROM questions
        WHERE paper_id = ?
        ORDER BY order_num ASC
      `).all(paper.id).map((row) => ({
        order_num: row.order_num,
        type: row.type,
        category: row.category,
        sub_category: row.sub_category,
        content: row.content,
        content_html: row.content_html,
        options: parseOptions(row.options),
        answer: row.answer,
        analysis: row.analysis,
        analysis_html: row.analysis_html,
        difficulty: row.difficulty,
        source: row.tags || '',
      }));

      return {
        id: paper.id,
        title: paper.title,
        year: paper.year,
        type: paper.type,
        province: normalizePaperProvince(paper.province),
        question_count: paper.question_count,
        difficulty: paper.difficulty,
        questions,
      };
    });
  } finally {
    db.close();
  }
}

function extractSeedDatabase(seedPath, outputPath) {
  ensureDir(outputPath);
  if (String(seedPath).endsWith('.gz')) {
    fs.writeFileSync(outputPath, zlib.gunzipSync(fs.readFileSync(seedPath)));
    return outputPath;
  }
  fs.copyFileSync(seedPath, outputPath);
  return outputPath;
}

module.exports = {
  DEFAULT_SEED_GZIP_PATH,
  buildSeedDatabase,
  extractSeedDatabase,
  getUserDbPath,
  insertOfficialPapers,
  loadOfficialPapersFromDatabase,
  openDatabase,
  syncOfficialQuestionBank,
};
