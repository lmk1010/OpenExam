/**
 * AI 服务统一接口
 * 支持 OpenAI、Claude、豆包、Kimi、通义千问、智谱GLM 等
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// OCR 识别题目的 prompt
const OCR_PROMPT = `你是一个专业的题目识别助手。请识别图片中的考试题目，并按以下 JSON 格式输出：

{
  "questions": [
    {
      "content": "题目内容",
      "options": [
        {"key": "A", "content": "选项A内容"},
        {"key": "B", "content": "选项B内容"},
        {"key": "C", "content": "选项C内容"},
        {"key": "D", "content": "选项D内容"}
      ],
      "answer": "正确答案（如A）",
      "analysis": "解析内容（如果有）",
      "type": "single"
    }
  ]
}

注意：
1. 如果图片中有多道题目，请全部识别
2. 如果没有解析，analysis 字段留空字符串
3. 如果没有答案，answer 字段留空字符串
4. 只输出 JSON，不要其他内容`;

/**
 * 创建 AI 客户端
 */
function createClient(settings) {
  const { aiProvider, apiKey, apiBase, model } = settings;

  if (aiProvider === 'anthropic') {
    return {
      type: 'anthropic',
      client: new Anthropic({ apiKey }),
      model: model || 'claude-sonnet-4-20250514'
    };
  }

  // 其他所有服务商都使用 OpenAI 兼容协议
  const baseURLMap = {
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    doubao: 'https://ark.cn-beijing.volces.com/api/v3',
    kimi: 'https://api.moonshot.cn/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    glm: 'https://open.bigmodel.cn/api/paas/v4',
  };

  return {
    type: 'openai',
    client: new OpenAI({
      apiKey,
      baseURL: apiBase || baseURLMap[aiProvider] || 'https://api.openai.com/v1',
    }),
    model: model || 'gpt-4o'
  };
}

/**
 * 使用 OpenAI 兼容 API 识别图片
 */
async function recognizeWithOpenAI(client, model, imageBase64, mimeType = 'image/png') {
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  return response.choices[0].message.content;
}

/**
 * 使用 Claude API 识别图片
 */
async function recognizeWithClaude(client, model, imageBase64, mimeType = 'image/png') {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: OCR_PROMPT,
          },
        ],
      },
    ],
  });

  return response.content[0].text;
}

/**
 * 识别图片中的题目
 * @param {Object} settings - AI 配置
 * @param {string} imageBase64 - 图片的 base64 编码
 * @param {string} mimeType - 图片 MIME 类型
 * @returns {Object} 识别结果
 */
async function recognizeQuestions(settings, imageBase64, mimeType = 'image/png') {
  const { type, client, model } = createClient(settings);

  let resultText;
  if (type === 'anthropic') {
    resultText = await recognizeWithClaude(client, model, imageBase64, mimeType);
  } else {
    resultText = await recognizeWithOpenAI(client, model, imageBase64, mimeType);
  }

  // 解析 JSON 结果
  try {
    // 尝试提取 JSON
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('无法解析返回结果');
  } catch (e) {
    console.error('解析 AI 返回结果失败:', e);
    return { questions: [], error: '解析失败', raw: resultText };
  }
}

// AI 老师 System Prompt
const TEACHER_SYSTEM = `你是一位经验丰富、耐心细致的学习辅导老师，名叫"小开"。你的任务是：
1. 帮助学生理解题目、掌握知识点、提升学习能力
2. 用通俗易懂的语言解释，必要时举例说明
3. 鼓励学生思考，不直接给答案，引导式教学
4. 回答时使用清晰的结构（分点、标题等）
5. 如果学生问的不是学习相关问题，礼貌地引导回学习话题`;

/**
 * AI 老师对话（非流式）
 * @param {Object} settings - AI 配置
 * @param {Array} messages - 对话历史 [{role, content}]
 * @returns {string} AI 回复内容
 */
async function chat(settings, messages) {
  const { type, client, model } = createClient(settings);

  const fullMessages = [
    { role: 'system', content: TEACHER_SYSTEM },
    ...messages,
  ];

  try {
    if (type === 'anthropic') {
      const systemMsg = fullMessages.find(m => m.role === 'system')?.content || '';
      const userMsgs = fullMessages.filter(m => m.role !== 'system');
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemMsg,
        messages: userMsgs,
      });
      return { success: true, content: response.content[0].text };
    } else {
      const response = await client.chat.completions.create({
        model,
        messages: fullMessages,
        max_tokens: 4096,
      });
      return { success: true, content: response.choices[0].message.content };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// AI 出卷 Prompt 模板
const CATEGORY_NAMES = {
  yanyu: '言语理解与表达', shuliang: '数量关系', panduan: '判断推理',
  ziliao: '资料分析', changshi: '常识判断',
};

const DIFFICULTY_NAMES = {
  1: '入门级（非常简单）', 2: '简单', 3: '中等', 4: '较难', 5: '困难（需要深入思考）',
};

function buildGeneratePrompt(config) {
  const catName = CATEGORY_NAMES[config.category] || config.category;
  const diffName = DIFFICULTY_NAMES[config.difficulty] || '中等';

  return `你是一位资深的考试命题专家。请根据以下要求生成高质量的考试题目。

要求：
- 科目分类: ${catName}
- 难度等级: ${diffName}
- 题目数量: ${config.count} 道
- 题目类型: 单选题（4个选项）
${config.customPrompt ? `- 额外要求: ${config.customPrompt}` : ''}

请严格按以下 JSON 格式输出，不要输出其他内容：
{
  "questions": [
    {
      "content": "题目内容（完整的题干描述）",
      "options": [
        {"key": "A", "content": "选项A"},
        {"key": "B", "content": "选项B"},
        {"key": "C", "content": "选项C"},
        {"key": "D", "content": "选项D"}
      ],
      "answer": "正确答案字母",
      "analysis": "详细解析（说明为什么选这个答案，其他选项为什么不对）",
      "difficulty": ${config.difficulty},
      "category": "${config.category}",
      "subCategory": ""
    }
  ]
}

注意：
1. 每道题目必须有完整的题干、4个选项、正确答案和详细解析
2. 题目质量要高，不能有常识性错误
3. 难度要符合要求，不能过简单也不能过难
4. 解析要详细，帮助学生理解
5. 只输出 JSON，不要有其他文字`;
}

/**
 * AI 智能出卷
 * @param {Object} settings - AI 配置
 * @param {Object} config - 出卷配置 {category, difficulty, count, customPrompt}
 * @returns {Object} {success, questions, error}
 */
async function generatePaper(settings, config) {
  const { type, client, model } = createClient(settings);
  const prompt = buildGeneratePrompt(config);

  try {
    let resultText;

    if (type === 'anthropic') {
      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });
      resultText = response.content[0].text;
    } else {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8192,
      });
      resultText = response.choices[0].message.content;
    }

    // 解析 JSON
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, questions: parsed.questions || [] };
    }
    throw new Error('无法解析返回结果');
  } catch (e) {
    console.error('AI 出卷失败:', e);
    return { success: false, error: e.message, questions: [] };
  }
}

/**
 * 测试 AI 连接
 */
async function testConnection(settings) {
  try {
    const { type, client, model } = createClient(settings);

    if (type === 'anthropic') {
      await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
    } else {
      await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      });
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  recognizeQuestions,
  testConnection,
  chat,
  generatePaper,
};

