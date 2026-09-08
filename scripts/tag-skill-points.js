#!/usr/bin/env node
/**
 * 用 AI 给题库批量打三级考点标签（离线一次性跑，日常刷题零 token）。
 *
 * 用法：
 *   npm run tag:skill-points                      # 跑全库，断点续跑
 *   npm run tag:skill-points -- --category ziliao # 只跑资料分析
 *   npm run tag:skill-points -- --limit 50        # 先小样本试水
 *   npm run tag:skill-points -- --dry-run         # 只看会打什么，不写库
 *   npm run tag:skill-points -- --retag           # 连已打过的一起重打
 *   npm run tag:skill-points -- --db /tmp/copy.db # 打到指定的库副本上（先试跑用）
 *
 * AI 配置默认读应用里已保存的那套（~/Library/Application Support/openexam/openexam.db），
 * 也可以用 OPENEXAM_AI_SETTINGS 指向一个 JSON 文件覆盖。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const {
  getPoints,
  getSubLabel,
  getCategoryLabel,
  makePointId,
  isValidPointKey,
  UNCLASSIFIED,
} = require('../src/shared/skillPoints');

const ROOT = path.join(__dirname, '..');
const DEFAULT_SEED_DB = path.join(ROOT, 'data/openexam.seed.db');

const BATCH_SIZE = 20;      // 每次请求塞多少题
const CONCURRENCY = 3;      // 并发请求数
const MAX_RETRY = 2;

/* ----------------------------------------------------------------- 参数 */

function parseArgs(argv) {
  const args = { limit: 0, category: '', dryRun: false, retag: false, db: DEFAULT_SEED_DB };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--limit') args.limit = Number(argv[++i]) || 0;
    else if (key === '--category') args.category = String(argv[++i] || '');
    else if (key === '--dry-run') args.dryRun = true;
    else if (key === '--retag') args.retag = true;
    else if (key === '--db') args.db = path.resolve(String(argv[++i] || ''));
  }
  return args;
}

/* ------------------------------------------------------------- AI 设置 */

function userDataDir() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'openexam');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'openexam');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'openexam');
}

function loadAISettings() {
  const override = process.env.OPENEXAM_AI_SETTINGS;
  if (override) {
    return JSON.parse(fs.readFileSync(override, 'utf8'));
  }
  const appDb = path.join(userDataDir(), 'openexam.db');
  if (!fs.existsSync(appDb)) {
    throw new Error(`没找到应用数据库 ${appDb}\n请先启动一次 OpenExam 并在「系统设置」里配好 AI，或用 OPENEXAM_AI_SETTINGS 指定配置文件。`);
  }
  const db = new Database(appDb, { readonly: true });
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'ai_settings'").get();
  db.close();
  if (!row?.value) {
    throw new Error('应用里还没保存 AI 配置，请先在「系统设置 → AI」里填好并测试连接。');
  }
  const settings = JSON.parse(row.value);
  if (!settings.apiKey) throw new Error('AI 配置里没有 API Key。');
  return settings;
}

/* ------------------------------------------------------------ 题库准备 */

function ensureSkillPointColumn(db) {
  const columns = db.prepare('PRAGMA table_info(questions)').all().map((c) => c.name);
  if (!columns.includes('skill_point')) {
    db.exec('ALTER TABLE questions ADD COLUMN skill_point TEXT');
    console.log('已为 questions 表添加 skill_point 字段');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_questions_skill_point ON questions(skill_point)');
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* --------------------------------------------------------------- 打标 */

function buildPrompt(category, subCategory, questions) {
  const points = getPoints(category, subCategory);
  const list = points.map((p) => `  ${p.key} = ${p.label}`).join('\n');
  const body = questions
    .map((q, i) => {
      const text = stripHtml(q.content_html || q.content).slice(0, 220);
      return `[${i + 1}] ${text}`;
    })
    .join('\n');

  return `你是公考行测题库的分类标注员。下面是${getCategoryLabel(category)}·${getSubLabel(category, subCategory)}的题目，请为每道题判断它考的是哪个考点。

可选考点（只能从这些里选，用左边的 key）：
${list}

题目：
${body}

只输出一个 JSON 对象，键是题号字符串，值是考点 key，不要任何解释、不要代码块标记。
实在判断不了的题，值填 "${UNCLASSIFIED}"。
格式示例：{"1":"${points[0].key}","2":"${points[Math.min(1, points.length - 1)].key}"}`;
}

function extractJSON(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function tagBatch(ai, settings, category, subCategory, questions) {
  const prompt = buildPrompt(category, subCategory, questions);

  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    const result = await ai.chat(settings, [{ role: 'user', content: prompt }]);
    if (!result.success) {
      if (attempt === MAX_RETRY) throw new Error(result.error || 'AI 请求失败');
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    const parsed = extractJSON(result.content);
    if (!parsed) {
      if (attempt === MAX_RETRY) return [];
      continue;
    }

    return questions
      .map((q, i) => {
        const key = String(parsed[String(i + 1)] || '').trim();
        if (!key || key === UNCLASSIFIED) return { id: q.id, pointId: UNCLASSIFIED };
        if (!isValidPointKey(category, subCategory, key)) return { id: q.id, pointId: UNCLASSIFIED };
        return { id: q.id, pointId: makePointId(category, subCategory, key) };
      })
      .filter(Boolean);
  }
  return [];
}

/** 简单的并发池 */
async function runPool(tasks, concurrency, onProgress) {
  let cursor = 0;
  let finished = 0;
  const results = [];
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= tasks.length) return;
      try {
        results.push(await tasks[index]());
      } catch (error) {
        console.error(`  批次失败: ${error.message}`);
        results.push([]);
      }
      onProgress?.(++finished, tasks.length);
    }
  });
  await Promise.all(workers);
  return results.flat();
}

/* ---------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.db)) {
    console.error(`找不到题库 ${args.db}\n先跑 npm run build:seed 生成。`);
    process.exit(1);
  }

  const settings = loadAISettings();
  const ai = require('../src/main/ai/index.js');
  console.log(`AI: ${settings.aiProvider || 'openai'} / ${settings.model || '默认模型'}`);

  const db = new Database(args.db);
  ensureSkillPointColumn(db);

  const where = ["category IS NOT NULL", "sub_category IS NOT NULL"];
  if (!args.retag) where.push("(skill_point IS NULL OR skill_point = '')");
  if (args.category) where.push(`category = '${args.category.replace(/'/g, "''")}'`);

  const groups = db
    .prepare(`
      SELECT category, sub_category, COUNT(*) AS total
      FROM questions WHERE ${where.join(' AND ')}
      GROUP BY category, sub_category ORDER BY total DESC
    `)
    .all()
    .filter((g) => getPoints(g.category, g.sub_category).length > 0);

  if (!groups.length) {
    console.log('没有待打标的题目 —— 可能都已经打过了，加 --retag 可以重打。');
    db.close();
    return;
  }

  const pending = groups.reduce((sum, g) => sum + g.total, 0);
  console.log(`待打标 ${pending} 题，分布在 ${groups.length} 个题型\n`);

  const update = db.prepare('UPDATE questions SET skill_point = ? WHERE id = ?');
  const writeAll = db.transaction((rows) => {
    for (const row of rows) update.run(row.pointId, row.id);
  });

  let tagged = 0;
  let unclassified = 0;
  const startedAt = Date.now();

  for (const group of groups) {
    const { category, sub_category: subCategory } = group;
    let sql = `SELECT id, content, content_html FROM questions WHERE ${where.join(' AND ')} AND category = ? AND sub_category = ?`;
    if (args.limit) sql += ` LIMIT ${args.limit}`;
    const questions = db.prepare(sql).all(category, subCategory);
    if (!questions.length) continue;

    const label = `${getCategoryLabel(category)}·${getSubLabel(category, subCategory)}`;
    const batches = [];
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      batches.push(questions.slice(i, i + BATCH_SIZE));
    }
    console.log(`${label}：${questions.length} 题 / ${batches.length} 批`);

    const rows = await runPool(
      batches.map((batch) => () => tagBatch(ai, settings, category, subCategory, batch)),
      CONCURRENCY,
      (done, total) => process.stdout.write(`\r  进度 ${done}/${total} 批`)
    );
    process.stdout.write('\n');

    const good = rows.filter((r) => r.pointId !== UNCLASSIFIED);
    unclassified += rows.length - good.length;
    tagged += good.length;

    if (args.dryRun) {
      const sample = good.slice(0, 3).map((r) => r.pointId).join(', ');
      console.log(`  [dry-run] 会写入 ${good.length} 条，例如 ${sample}\n`);
    } else {
      writeAll(rows);
      console.log(`  已写入 ${good.length} 条，${rows.length - good.length} 条未能归类\n`);
    }
  }

  const minutes = ((Date.now() - startedAt) / 60000).toFixed(1);
  console.log(`完成：打上标签 ${tagged} 题，未能归类 ${unclassified} 题，耗时 ${minutes} 分钟`);

  if (!args.dryRun) {
    const stats = db
      .prepare("SELECT skill_point, COUNT(*) AS c FROM questions WHERE skill_point IS NOT NULL AND skill_point != '' GROUP BY 1 ORDER BY c DESC LIMIT 12")
      .all();
    console.log('\n覆盖最多的考点：');
    for (const row of stats) console.log(`  ${String(row.c).padStart(5)}  ${row.skill_point}`);
    console.log('\n打完记得跑 npm run build:seed 重新压缩种子库，这样别人拿到的也是打好标的。');
  }
  db.close();
}

main().catch((error) => {
  console.error('\n打标失败:', error.message);
  process.exit(1);
});
