const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

// 初始化数据库
function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'openexam.db');

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
      options TEXT NOT NULL,
      answer TEXT NOT NULL,
      analysis TEXT,
      difficulty INTEGER DEFAULT 2,
      tags TEXT,
      FOREIGN KEY (paper_id) REFERENCES papers(id)
    );

    -- 练习记录表
    CREATE TABLE IF NOT EXISTS practice_records (
      id TEXT PRIMARY KEY,
      paper_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER,
      status TEXT DEFAULT 'ongoing',
      answers TEXT,
      correct_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      FOREIGN KEY (paper_id) REFERENCES papers(id)
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
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );
  `);

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
    (id, paper_id, start_time, end_time, duration, status, answers, correct_count, total_count, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.id,
    record.paperId,
    record.startTime,
    record.endTime,
    record.duration,
    record.status,
    JSON.stringify(record.answers),
    record.correctCount,
    record.totalCount,
    record.score
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
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO wrong_questions (id, question_id, paper_id, user_answer, correct_answer, added_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(`wrong_${questionId}`, questionId, paperId, userAnswer, correctAnswer);
}

// 获取错题列表
function getWrongQuestions() {
  return db.prepare(`
    SELECT wq.*, q.content, q.options, q.analysis, q.category
    FROM wrong_questions wq
    LEFT JOIN questions q ON wq.question_id = q.id
    ORDER BY wq.added_at DESC
  `).all().map(row => ({
    ...row,
    options: row.options ? JSON.parse(row.options) : []
  }));
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
    FROM questions q
    INNER JOIN practice_records pr ON pr.paper_id = q.paper_id
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
  `).all(category);
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

  return {
    totalQuestions,
    totalDone: completedRecords.total || 0,
    correctCount: completedRecords.correct || 0,
    wrongCount,
    accuracy: completedRecords.total > 0
      ? Math.round((completedRecords.correct / completedRecords.total) * 100)
      : 0
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
  getCategoryStats,
  getSubCategoryStats,
  getPracticeStats,
  closeDatabase
};
