/**
 * 将爬取的试卷数据导入到 SQLite 数据库
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { normalizeQuestionTaxonomy, isFakeQuestion } = require('../src/shared/questionCategory');

// 数据库路径 - 使用与应用相同的路径
const userDataPath = process.env.HOME + '/Library/Application Support/openexam';
const dbPath = path.join(userDataPath, 'openexam.db');

console.log('数据库路径:', dbPath);

// 确保目录存在
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// 读取爬取的数据
const dataPath = path.join(__dirname, '../data/saduck-papers.json');
const papers = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log(`读取到 ${papers.length} 套试卷\n`);

// 准备SQL语句
const insertPaper = db.prepare(`
  INSERT OR REPLACE INTO papers (id, title, year, type, subject, province, question_count, duration, difficulty, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

const insertQuestion = db.prepare(`
  INSERT OR REPLACE INTO questions (id, paper_id, order_num, type, category, sub_category, content, options, answer, analysis, difficulty, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 批量导入
const importAll = db.transaction(() => {
  let totalQuestions = 0;

  for (const paper of papers) {
    const validQuestions = Array.isArray(paper.questions) ? paper.questions.filter((question) => !isFakeQuestion(question)) : [];
    if (!validQuestions.length) continue;

    // 插入试卷
    insertPaper.run(
      paper.id,
      paper.title,
      paper.year,
      paper.type,
      'xingce',
      paper.province,
      validQuestions.length,
      120,
      Math.round(paper.difficulty)
    );

    // 插入题目 - 使用 paper_id + order_num 作为唯一ID，避免重复
    for (const q of validQuestions) {
      const uniqueId = `${paper.id}_q${q.order_num}`;
      const taxonomy = normalizeQuestionTaxonomy({
        category: q.category,
        sub_category: q.sub_category,
        content: q.content,
      });
      insertQuestion.run(
        uniqueId,
        paper.id,
        q.order_num,
        q.type,
        taxonomy.category,
        taxonomy.subCategory,
        q.content,
        JSON.stringify(q.options),
        q.answer,
        q.analysis,
        q.difficulty,
        q.source
      );
      totalQuestions++;
    }

    console.log(`✓ ${paper.title} (${validQuestions.length}题)`);
  }

  return totalQuestions;
});

try {
  const total = importAll();
  console.log(`\n导入完成! 共 ${papers.length} 套试卷, ${total} 道题目`);
} catch (err) {
  console.error('导入失败:', err.message);
} finally {
  db.close();
}
