const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { normalizeQuestionTaxonomy, isFakeQuestion } = require('../src/shared/questionCategory');

const userDataPath = path.join(process.env.HOME, 'Library/Application Support/openexam');
const dbPath = path.join(userDataPath, 'openexam.db');
const dataPath = path.join(__dirname, '../data/saduck-papers.json');

console.log('数据库路径:', dbPath);

if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
if (!fs.existsSync(dataPath)) throw new Error(`未找到数据文件: ${dataPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function ensureQuestionsSchema() {
  const columns = db.pragma('table_info(questions)');
  const byName = new Set((columns || []).map((column) => column.name));
  if (!byName.has('content_html')) db.prepare('ALTER TABLE questions ADD COLUMN content_html TEXT').run();
  if (!byName.has('analysis_html')) db.prepare('ALTER TABLE questions ADD COLUMN analysis_html TEXT').run();
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_paper_order_unique ON questions(paper_id, order_num);
  `);
}

function clearOfficialQuestionBank() {
  return db.transaction(() => {
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
    db.prepare(`DELETE FROM questions WHERE paper_id IN (SELECT id FROM papers WHERE type IN ('national', 'provincial'))`).run();
    db.prepare(`DELETE FROM papers WHERE type IN ('national', 'provincial')`).run();
  })();
}

function cleanupDanglingRecords() {
  db.prepare('DELETE FROM wrong_questions WHERE question_id NOT IN (SELECT id FROM questions)').run();
}

const papers = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
console.log(`读取到 ${papers.length} 套试卷\n`);

ensureQuestionsSchema();
clearOfficialQuestionBank();

const insertPaper = db.prepare(`
  INSERT OR REPLACE INTO papers (id, title, year, type, subject, province, question_count, duration, difficulty, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

const insertQuestion = db.prepare(`
  INSERT OR REPLACE INTO questions (id, paper_id, order_num, type, category, sub_category, content, content_html, options, answer, analysis, analysis_html, difficulty, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const importAll = db.transaction(() => {
  let totalPapers = 0;
  let totalQuestions = 0;

  for (const paper of papers) {
    const validQuestions = Array.isArray(paper.questions) ? paper.questions.filter((question) => !isFakeQuestion(question)) : [];
    if (!validQuestions.length) continue;

    insertPaper.run(
      paper.id,
      paper.title,
      paper.year,
      paper.type,
      'xingce',
      paper.province,
      validQuestions.length,
      120,
      Math.round(paper.difficulty) || 3
    );

    for (const q of validQuestions) {
      const questionId = `${paper.id}_q${q.order_num}`;
      const content = String(q.content || '').trim();
      const contentHtml = String(q.content_html || q.contentHtml || '').trim();
      const analysis = String(q.analysis || '').trim();
      const analysisHtml = String(q.analysis_html || q.analysisHtml || '').trim();
      const taxonomy = normalizeQuestionTaxonomy({
        category: q.category,
        sub_category: q.sub_category,
        content: content || contentHtml,
      });
      insertQuestion.run(
        questionId,
        paper.id,
        q.order_num,
        q.type,
        taxonomy.category,
        taxonomy.subCategory,
        content || '图片题',
        contentHtml || null,
        JSON.stringify(Array.isArray(q.options) ? q.options : []),
        q.answer,
        analysis,
        analysisHtml || null,
        q.difficulty,
        q.source || ''
      );
      totalQuestions += 1;
    }

    totalPapers += 1;
    console.log(`✓ ${paper.title} (${validQuestions.length}题)`);
  }

  return { totalPapers, totalQuestions };
});

try {
  const result = importAll();
  cleanupDanglingRecords();
  console.log(`\n导入完成! 共 ${result.totalPapers} 套试卷, ${result.totalQuestions} 道题目`);
} catch (error) {
  console.error('导入失败:', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
