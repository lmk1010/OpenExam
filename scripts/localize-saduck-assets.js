const fs = require('fs');
const path = require('path');
const { localizePapers } = require('./saduck-assets');

async function main() {
  const dataPath = path.join(__dirname, '../data/saduck-papers.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`未找到题库文件: ${dataPath}`);
  }

  const papers = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`读取到 ${papers.length} 套试卷，开始本地化题图...`);
  const result = await localizePapers(papers);
  fs.writeFileSync(dataPath, JSON.stringify(papers, null, 2));
  console.log(`本地化完成：${result.assetCount} 个资源${result.failed.length ? `，失败 ${result.failed.length} 个` : ''}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
