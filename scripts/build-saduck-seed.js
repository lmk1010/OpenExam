const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSeedDatabase, getUserDbPath, loadOfficialPapersFromDatabase } = require('./saduck-db');

const sourceDbPath = process.env.SADUCK_SOURCE_DB || getUserDbPath();

if (!fs.existsSync(sourceDbPath)) {
  throw new Error(`未找到源数据库: ${sourceDbPath}`);
}

console.log('源数据库:', sourceDbPath);
const papers = loadOfficialPapersFromDatabase(sourceDbPath);
console.log(`读取到 ${papers.length} 套官方试卷`);

const result = buildSeedDatabase(papers, {
  dbPath: path.join(os.tmpdir(), 'openexam.seed.build.db'),
  gzipPath: path.join(__dirname, '../data/openexam.seed.db.gz'),
  logger: (message) => console.log(message),
});

console.log(`\n种子库构建完成: ${result.totalPapers} 套试卷, ${result.totalQuestions} 道题目`);
console.log(`输出文件: ${result.gzipPath}`);
