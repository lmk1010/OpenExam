/**
 * 爬取 saduck.top 试卷数据
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2aXBFbmRUaW1lIjoiMTc2OTM5MTA0MDcxNCIsInNpZ24iOiI1MDIwODI1NjYxIiwidmlwVHlwZSI6IjEiLCJ2aXBTdGFydFRpbWUiOiIxNzY5MTMxODQwNzE0IiwiZXhwIjoxNzcwODU5ODQwLCJlbWFpbCI6InpteGxpejk5MTQzbUBvdXRsb29rLmNvbSJ9.nA2IHHH0iemhUXX_Vvdo_YVwkWDCtCVsKhSxN5SsJXc';
const AES_KEY_DECRYPT = '7SyqrN6925ZYb636';  // 解密试卷列表
const AES_KEY_ENCRYPT = 'kxZ17XQ8z6957n3S';  // 加密请求ID
const BASE_URL = 'https://saduck.top/api';

// AES 解密 (试卷列表)
function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv('aes-128-ecb', AES_KEY_DECRYPT, null);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// AES 加密 (请求ID) - URL安全base64
function encryptId(text) {
  const cipher = crypto.createCipheriv('aes-128-ecb', AES_KEY_ENCRYPT, null);
  let encrypted = cipher.update(String(text), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  // 转换为URL安全的base64
  return encrypted.replace(/\//g, '_').replace(/\+/g, '-');
}

// 获取试卷列表
async function getPaperList() {
  const res = await fetch(`${BASE_URL}/tk/itemizes?type=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  const json = await res.json();
  if (json.code === 0) {
    return decrypt(json.result);
  }
  throw new Error(json.message);
}

// 获取题目详情
async function getQuestions(sid) {
  const encryptedId = encryptId(sid);
  const res = await fetch(`${BASE_URL}/tk/sourceInfo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': TOKEN
    },
    body: JSON.stringify({ id: encryptedId })
  });
  const json = await res.json();
  if (json.code === 0) {
    return json.result; // 题目数据未加密
  }
  throw new Error(json.message || `获取题目失败: ${sid}`);
}

// 转换题目格式
function convertQuestion(q, orderNum) {
  const options = q.options.split('#').map((opt, i) => ({
    key: String.fromCharCode(65 + i), // A, B, C, D
    content: opt
  }));

  // 正确答案转换 (0->A, 1->B, 2->C, 3->D)
  const answerIndex = parseInt(q.correctAnswer);
  const answer = String.fromCharCode(65 + answerIndex);

  return {
    id: `q_saduck_${q.id}`,
    order_num: orderNum,
    type: q.type === 'single' ? 'single' : 'multiple',
    category: mapCategory(q.tag),
    sub_category: q.tag || '',
    content: q.title.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ''),
    options: options,
    answer: answer,
    analysis: (q.analysis || '').replace(/<br>/g, '\n').replace(/<[^>]+>/g, ''),
    difficulty: Math.round((parseFloat(q.globalAccuracy) || 50) / 20), // 转换为1-5
    source: q.source || ''
  };
}

// 分类映射
function mapCategory(tag) {
  const map = {
    '理论政策': 'zhengzhi',
    '法律': 'changshi',
    '经济': 'changshi',
    '人文历史': 'changshi',
    '历史': 'changshi',
    '自然科技': 'changshi',
    '经济利润': 'shuliang',
    '和差倍比': 'shuliang',
    '最值问题': 'shuliang',
    '排列组合': 'shuliang'
  };
  return map[tag] || 'changshi';
}

// 延迟函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 主函数
async function main() {
  console.log('开始爬取试卷数据...\n');

  // 获取试卷列表
  const paperGroups = await getPaperList();
  console.log(`共 ${paperGroups.length} 个分组\n`);

  const allPapers = [];

  for (const group of paperGroups) {
    console.log(`\n=== ${group.title} ===`);

    for (const paper of group.tkSources.slice(0, 3)) { // 每组最多3套
      console.log(`  爬取: ${paper.source}`);

      try {
        const questions = await getQuestions(paper.sid);

        const paperData = {
          id: `paper_saduck_${paper.sid}`,
          title: paper.source.trim(),
          year: parseInt(paper.source.match(/\d{4}/)?.[0]) || 2024,
          type: group.title === '国考' ? 'national' : 'provincial',
          province: group.title === '国考' ? null : group.title,
          question_count: questions.length,
          difficulty: parseFloat(paper.difficulty) || 4,
          questions: questions.map((q, i) => convertQuestion(q, i + 1))
        };

        allPapers.push(paperData);
        console.log(`    ✓ ${questions.length} 题`);

        await sleep(500); // 避免请求过快
      } catch (err) {
        console.log(`    ✗ 失败: ${err.message}`);
      }
    }
  }

  // 保存数据
  const outputPath = path.join(__dirname, '../data/saduck-papers.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allPapers, null, 2));

  console.log(`\n完成! 共爬取 ${allPapers.length} 套试卷`);
  console.log(`数据保存至: ${outputPath}`);
}

main().catch(console.error);
