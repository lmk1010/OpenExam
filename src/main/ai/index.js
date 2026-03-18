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
};
