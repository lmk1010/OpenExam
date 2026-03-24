const fs = require('fs');
const os = require('os');
const path = require('path');
const { extractSeedDatabase, getUserDbPath, loadOfficialPapersFromDatabase, syncOfficialQuestionBank } = require('./saduck-db');

const seedPath = process.env.SADUCK_SEED_DB || path.join(__dirname, '../data/openexam.seed.db.gz');
const tempDbPath = path.join(os.tmpdir(), `openexam.seed.import.${Date.now()}.db`);

if (!fs.existsSync(seedPath)) {
  throw new Error(`未找到种子库文件: ${seedPath}`);
}

console.log('种子库文件:', seedPath);
extractSeedDatabase(seedPath, tempDbPath);

try {
  const papers = loadOfficialPapersFromDatabase(tempDbPath);
  console.log(`读取到 ${papers.length} 套官方试卷`);
  const result = syncOfficialQuestionBank(papers, {
    dbPath: process.env.SADUCK_TARGET_DB || getUserDbPath(),
    logger: (message) => console.log(message),
  });
  console.log(`\n同步完成: ${result.totalPapers} 套试卷, ${result.totalQuestions} 道题目`);
  console.log(`目标数据库: ${result.dbPath}`);
} finally {
  ['', '-wal', '-shm'].forEach((suffix) => {
    const target = `${tempDbPath}${suffix}`;
    if (fs.existsSync(target)) fs.unlinkSync(target);
  });
}
