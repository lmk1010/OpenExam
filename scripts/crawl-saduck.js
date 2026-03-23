const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { localizePapers } = require('./saduck-assets');

const TOKEN = process.env.SADUCK_TOKEN || '';
const AES_KEY_DECRYPT = '7SyqrN6925ZYb636';
const AES_KEY_ENCRYPT = 'kxZ17XQ8z6957n3S';
const BASE_URL = 'https://saduck.top/api';
const ORIGIN = 'https://saduck.top';
const REFERER = 'https://saduck.top/questionBank/overTheYears.html';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
const REQUEST_DELAY = Math.max(100, Number(process.env.SADUCK_DELAY_MS) || 250);
const MAX_PER_GROUP = Math.max(0, Number(process.env.SADUCK_MAX_PER_GROUP) || 0);

function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv('aes-128-ecb', AES_KEY_DECRYPT, null);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

function encryptId(text) {
  const cipher = crypto.createCipheriv('aes-128-ecb', AES_KEY_ENCRYPT, null);
  let encrypted = cipher.update(String(text), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted.replace(/\//g, '_').replace(/\+/g, '-');
}

function normalizeHtml(value) {
  let html = String(value || '').trim();
  if (!html) return '';
  html = html.replace(/src=(['"])\/\//gi, 'src=$1https://');
  html = html.replace(/src=(['"])\/(?!\/)/gi, `src=$1${ORIGIN}/`);
  html = html.replace(/href=(['"])\/\//gi, 'href=$1https://');
  html = html.replace(/href=(['"])\/(?!\/)/gi, `href=$1${ORIGIN}/`);
  return html;
}

function toPlainText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitOptions(value) {
  if (Array.isArray(value)) return value;
  return String(value || '').split('#');
}

function convertAnswer(value) {
  const indexes = String(value || '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0);
  return indexes.map((index) => String.fromCharCode(65 + index)).join('');
}

async function getPaperList() {
  const res = await fetch(`${BASE_URL}/tk/itemizes?type=1`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
      origin: ORIGIN,
      referer: REFERER,
      'user-agent': USER_AGENT,
    },
    body: '{}'
  });
  const json = await res.json();
  if (json.code === 0) return decrypt(json.result);
  throw new Error(json.message || '获取试卷列表失败');
}

async function getQuestions(sid) {
  if (!TOKEN) throw new Error('缺少 SADUCK_TOKEN 环境变量');
  const res = await fetch(`${BASE_URL}/tk/sourceInfo`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
      origin: ORIGIN,
      referer: REFERER,
      token: TOKEN,
      'user-agent': USER_AGENT,
    },
    body: JSON.stringify({ id: encryptId(sid) })
  });
  const json = await res.json();
  if (json.code === 0) return Array.isArray(json.result) ? json.result : [];
  throw new Error(json.message || `获取题目失败: ${sid}`);
}

function mapCategory(tag) {
  const map = {
    理论政策: 'zhengzhi',
    法律: 'changshi',
    经济: 'changshi',
    人文历史: 'changshi',
    历史: 'changshi',
    自然科技: 'changshi',
    经济利润: 'shuliang',
    和差倍比: 'shuliang',
    最值问题: 'shuliang',
    排列组合: 'shuliang'
  };
  return map[tag] || 'changshi';
}

function convertQuestion(q, orderNum) {
  const contentHtml = normalizeHtml(q.title || '');
  const analysisHtml = normalizeHtml(q.analysis || '');
  const answer = convertAnswer(q.correctAnswer);
  const options = splitOptions(q.options).map((opt, index) => {
    const normalized = normalizeHtml(opt);
    return {
      key: String.fromCharCode(65 + index),
      content: normalized || toPlainText(opt)
    };
  }).filter((opt) => opt.content);

  return {
    id: `q_saduck_${q.id}`,
    order_num: orderNum,
    type: String(q.type || '').toLowerCase().includes('multi') || answer.length > 1 ? 'multiple' : 'single',
    category: mapCategory(q.tag),
    sub_category: q.tag || '',
    content: toPlainText(contentHtml),
    content_html: contentHtml || null,
    options,
    answer,
    analysis: toPlainText(analysisHtml),
    analysis_html: analysisHtml || null,
    difficulty: Math.max(1, Math.min(5, Math.round((parseFloat(q.globalAccuracy) || 50) / 20))),
    source: q.source || '',
    source_question_id: q.id,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('开始爬取 saduck 题库...\n');
  const paperGroups = await getPaperList();
  const seen = new Set();
  const allPapers = [];

  for (const group of paperGroups) {
    console.log(`\n=== ${group.title} ===`);
    const sources = Array.isArray(group.tkSources) ? group.tkSources : [];
    const list = MAX_PER_GROUP > 0 ? sources.slice(0, MAX_PER_GROUP) : sources;

    for (const paper of list) {
      if (!paper?.sid || seen.has(paper.sid)) continue;
      seen.add(paper.sid);
      console.log(`  爬取: ${paper.source}`);
      try {
        const questions = await getQuestions(paper.sid);
        const converted = questions.map((q, index) => convertQuestion(q, index + 1));
        allPapers.push({
          id: `paper_saduck_${paper.sid}`,
          title: String(paper.source || '').trim(),
          year: parseInt(String(paper.source || '').match(/\d{4}/)?.[0], 10) || 2024,
          type: group.title === '国考' ? 'national' : 'provincial',
          province: group.title === '国考' ? null : group.title,
          question_count: converted.length,
          difficulty: parseFloat(paper.difficulty) || 4,
          questions: converted,
        });
        console.log(`    ✓ ${converted.length} 题`);
        await sleep(REQUEST_DELAY);
      } catch (error) {
        console.log(`    ✗ 失败: ${error.message}`);
      }
    }
  }

  console.log('\n开始本地化题图资源...');
  const localized = await localizePapers(allPapers);
  console.log(`题图本地化完成: ${localized.assetCount} 个资源${localized.failed.length ? `，失败 ${localized.failed.length} 个` : ''}`);

  const outputPath = path.join(__dirname, '../data/saduck-papers.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allPapers, null, 2));

  console.log(`\n完成，共保存 ${allPapers.length} 套试卷`);
  console.log(`输出文件: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
