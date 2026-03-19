/**
 * AI 服务统一接口
 * - OpenAI SDK 统一承接 OpenAI / OpenAI 兼容协议
 * - OpenAI 原生支持 Responses API 与 Chat Completions API
 * - MiniMax / Kimi / GLM / 其他兼容服务默认走 Chat Completions
 * - Claude 仍保留 Anthropic SDK
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const OPENAI_COMPATIBLE_PROVIDERS = {
  openai: {
    sdkType: 'openai',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    defaultFormat: 'responses',
    supportedFormats: ['responses', 'chat_completions'],
  },
  minimax: {
    sdkType: 'openai',
    baseURL: 'https://api.minimax.chat/v1',
    defaultModel: 'MiniMax-M1',
    defaultFormat: 'chat_completions',
    supportedFormats: ['chat_completions'],
  },
  kimi: {
    sdkType: 'openai',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-128k',
    defaultFormat: 'chat_completions',
    supportedFormats: ['chat_completions'],
  },
  glm: {
    sdkType: 'openai',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4.5-air',
    defaultFormat: 'chat_completions',
    supportedFormats: ['chat_completions'],
  },
  deepseek: {
    sdkType: 'openai',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    defaultFormat: 'chat_completions',
    supportedFormats: ['chat_completions'],
  },
  doubao: {
    sdkType: 'openai',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-1-5-pro-32k',
    defaultFormat: 'chat_completions',
    supportedFormats: ['chat_completions'],
  },
  qwen: {
    sdkType: 'openai',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    defaultFormat: 'chat_completions',
    supportedFormats: ['chat_completions'],
  },
  custom: {
    sdkType: 'openai',
    baseURL: '',
    defaultModel: '',
    defaultFormat: 'chat_completions',
    supportedFormats: ['responses', 'chat_completions'],
  },
  openai_compatible: {
    sdkType: 'openai',
    baseURL: '',
    defaultModel: '',
    defaultFormat: 'chat_completions',
    supportedFormats: ['responses', 'chat_completions'],
  },
  anthropic: {
    sdkType: 'anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    defaultFormat: 'messages',
    supportedFormats: ['messages'],
  },
};

function getProviderConfig(providerId) {
  return OPENAI_COMPATIBLE_PROVIDERS[providerId] || OPENAI_COMPATIBLE_PROVIDERS.custom;
}

function normalizeAISettings(input) {
  const settings = input && typeof input === 'object' ? { ...input } : {};
  const provider = getProviderConfig(settings.aiProvider || 'custom');
  const preferredModel = String(settings.customModel || '').trim() || String(settings.model || '').trim();
  const supportedFormats = provider.supportedFormats || ['chat_completions'];

  return {
    ...settings,
    aiProvider: settings.aiProvider || 'custom',
    apiKey: String(settings.apiKey || '').trim(),
    apiBase: String(settings.apiBase || provider.baseURL || '').trim(),
    model: preferredModel || provider.defaultModel,
    apiFormat: supportedFormats.includes(settings.apiFormat)
      ? settings.apiFormat
      : (provider.defaultFormat || supportedFormats[0] || 'chat_completions'),
  };
}

function createClient(inputSettings) {
  const settings = normalizeAISettings(inputSettings);
  const provider = getProviderConfig(settings.aiProvider);

  if (provider.sdkType === 'anthropic') {
    return {
      type: 'anthropic',
      client: new Anthropic({ apiKey: settings.apiKey }),
      model: settings.model || provider.defaultModel,
      settings,
      provider,
    };
  }

  return {
    type: 'openai',
    client: new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.apiBase || provider.baseURL || undefined,
    }),
    model: settings.model || provider.defaultModel,
    settings,
    provider,
  };
}

function extractResponseText(response) {
  if (!response) return '';
  if (typeof response.output_text === 'string' && response.output_text) return response.output_text;
  if (!Array.isArray(response.output)) return '';

  const parts = [];
  for (const item of response.output) {
    if (!Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }
  return parts.join('');
}

function normalizeStringContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.type === 'text' && typeof item.text === 'string') return item.text;
        if (item?.type === 'input_text' && typeof item.text === 'string') return item.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(content || '');
}

function toResponsesInput(messages) {
  return (messages || []).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'input_text', text: normalizeStringContent(message.content) }],
  }));
}

async function createOpenAITextResponse(client, model, apiFormat, { instructions = '', messages = [], maxOutputTokens = 4096 }) {
  if (apiFormat === 'responses') {
    const response = await client.responses.create({
      model,
      instructions: instructions || undefined,
      input: toResponsesInput(messages),
      max_output_tokens: maxOutputTokens,
    });
    return extractResponseText(response);
  }

  const completion = await client.chat.completions.create({
    model,
    messages: [
      ...(instructions ? [{ role: 'system', content: instructions }] : []),
      ...messages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: normalizeStringContent(message.content),
      })),
    ],
    max_tokens: maxOutputTokens,
  });

  return completion.choices?.[0]?.message?.content || '';
}

async function recognizeWithOpenAI(client, model, apiFormat, imageBase64, mimeType = 'image/png') {
  const imageUrl = `data:${mimeType};base64,${imageBase64}`;

  if (apiFormat === 'responses') {
    const response = await client.responses.create({
      model,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: OCR_PROMPT },
          { type: 'input_image', image_url: imageUrl },
        ],
      }],
      max_output_tokens: 4096,
    });
    return extractResponseText(response);
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 4096,
  });

  return response.choices?.[0]?.message?.content || '';
}

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
          { type: 'text', text: OCR_PROMPT },
        ],
      },
    ],
  });

  return response.content?.[0]?.text || '';
}

function extractJSONObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  const jsonMatch = fenced.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('无法解析返回结果');
  return JSON.parse(jsonMatch[0]);
}

async function structureQuestionsFromText(settings, rawText) {
  const { type, client, model, settings: normalizedSettings } = createClient(settings);
  const prompt = `${OCR_PROMPT}\n\n以下是 OCR 提取出的原始文本，请你整理为标准 JSON：\n\n${rawText}`;

  if (type === 'anthropic') {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content?.[0]?.text || '';
  }

  return createOpenAITextResponse(client, model, normalizedSettings.apiFormat, {
    messages: [{ role: 'user', content: prompt }],
    maxOutputTokens: 4096,
  });
}

async function recognizeWithOCREngine(settings, imageBase64, mimeType = 'image/png') {
  const normalizedSettings = normalizeAISettings(settings);
  if (!normalizedSettings.ocrEnabled || !normalizedSettings.ocrApiUrl) {
    throw new Error('OCR 引擎未配置');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (normalizedSettings.ocrApiKey) {
    headers.Authorization = `Bearer ${normalizedSettings.ocrApiKey}`;
    headers['X-API-Key'] = normalizedSettings.ocrApiKey;
  }

  const response = await fetch(normalizedSettings.ocrApiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageBase64,
      mimeType,
      responseMode: normalizedSettings.ocrResponseMode,
      prompt: OCR_PROMPT,
    }),
  });

  if (!response.ok) {
    throw new Error(`OCR 请求失败：${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { text: await response.text() };

  if (Array.isArray(payload?.questions)) {
    return { questions: payload.questions };
  }
  if (Array.isArray(payload?.data?.questions)) {
    return { questions: payload.data.questions };
  }

  const text = String(payload?.text || payload?.content || payload?.data?.text || '').trim();
  if (!text) {
    throw new Error('OCR 返回为空');
  }

  if (normalizedSettings.ocrResponseMode === 'json_questions') {
    return extractJSONObject(text);
  }

  const structured = await structureQuestionsFromText(settings, text);
  return extractJSONObject(structured);
}

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

async function recognizeQuestions(settings, imageBase64, mimeType = 'image/png') {
  const normalizedSettings = normalizeAISettings(settings);

  if (normalizedSettings.recognizeEngine === 'ocr') {
    return recognizeWithOCREngine(normalizedSettings, imageBase64, mimeType);
  }

  if (normalizedSettings.recognizeEngine === 'auto' && normalizedSettings.ocrEnabled && mimeType === 'application/pdf') {
    return recognizeWithOCREngine(normalizedSettings, imageBase64, mimeType);
  }

  const { type, client, model, settings: clientSettings } = createClient(normalizedSettings);

  let resultText;
  if (type === 'anthropic') {
    resultText = await recognizeWithClaude(client, model, imageBase64, mimeType);
  } else {
    resultText = await recognizeWithOpenAI(client, model, clientSettings.apiFormat, imageBase64, mimeType);
  }

  try {
    return extractJSONObject(resultText);
  } catch (error) {
    console.error('解析 AI 返回结果失败:', error);
    return { questions: [], error: '解析失败', raw: resultText };
  }
}

const TEACHER_SYSTEM = `你是一位经验丰富、耐心细致的学习辅导老师，名叫"小开"。你的任务是：
1. 帮助学生理解题目、掌握知识点、提升学习能力
2. 用通俗易懂的语言解释，必要时举例说明
3. 鼓励学生思考，不直接给答案，引导式教学
4. 回答时使用清晰的结构（分点、标题等）
5. 如果学生问的不是学习相关问题，礼貌地引导回学习话题`;

async function chat(settings, messages) {
  const { type, client, model, settings: normalizedSettings } = createClient(settings);
  const fullMessages = [{ role: 'system', content: TEACHER_SYSTEM }, ...(messages || [])];

  try {
    if (type === 'anthropic') {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: TEACHER_SYSTEM,
        messages: fullMessages.filter((message) => message.role !== 'system'),
      });
      return { success: true, content: response.content?.[0]?.text || '' };
    }

    const text = await createOpenAITextResponse(client, model, normalizedSettings.apiFormat, {
      instructions: TEACHER_SYSTEM,
      messages: fullMessages.filter((message) => message.role !== 'system'),
      maxOutputTokens: 4096,
    });
    return { success: true, content: text };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

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

async function generatePaper(settings, config) {
  const { type, client, model, settings: normalizedSettings } = createClient(settings);
  const prompt = buildGeneratePrompt(config);

  try {
    let resultText = '';

    if (type === 'anthropic') {
      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });
      resultText = response.content?.[0]?.text || '';
    } else {
      resultText = await createOpenAITextResponse(client, model, normalizedSettings.apiFormat, {
        messages: [{ role: 'user', content: prompt }],
        maxOutputTokens: 8192,
      });
    }

    const parsed = extractJSONObject(resultText);
    return { success: true, questions: parsed.questions || [] };
  } catch (error) {
    console.error('AI 出卷失败:', error);
    return { success: false, error: error.message, questions: [] };
  }
}

async function testConnection(settings) {
  try {
    const { type, client, model, settings: normalizedSettings } = createClient(settings);

    if (type === 'anthropic') {
      await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
    } else if (normalizedSettings.apiFormat === 'responses') {
      await client.responses.create({
        model,
        input: 'Hi',
        max_output_tokens: 10,
      });
    } else {
      await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  recognizeQuestions,
  testConnection,
  chat,
  generatePaper,
};
