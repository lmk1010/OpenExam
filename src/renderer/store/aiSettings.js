const OPENAI_FORMATS = ['responses', 'chat_completions'];

export const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: 'openai', sdkType: 'openai', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'], supportsVision: true, supportedFormats: OPENAI_FORMATS, defaultFormat: 'responses' },
  { id: 'minimax', name: 'MiniMax', icon: 'minimax', sdkType: 'openai', baseUrl: 'https://api.minimax.chat/v1', models: ['MiniMax-M1', 'MiniMax-Text-01', 'abab-6.5s-chat'], supportsVision: true, supportedFormats: ['chat_completions'], defaultFormat: 'chat_completions' },
  { id: 'kimi', name: 'Kimi', icon: 'kimi', sdkType: 'openai', baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'kimi-k2-0711-preview'], supportsVision: true, supportedFormats: ['chat_completions'], defaultFormat: 'chat_completions' },
  { id: 'glm', name: '智谱 GLM', icon: 'glm', sdkType: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4.5', 'glm-4.5-air', 'glm-4v', 'glm-4'], supportsVision: true, supportedFormats: ['chat_completions'], defaultFormat: 'chat_completions' },
  { id: 'deepseek', name: 'DeepSeek', icon: 'deepseek', sdkType: 'openai', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'], supportsVision: false, supportedFormats: ['chat_completions'], defaultFormat: 'chat_completions' },
  { id: 'doubao', name: '豆包', icon: 'doubao', sdkType: 'openai', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', models: ['doubao-1-5-vision-pro-32k', 'doubao-1-5-pro-32k'], supportsVision: true, supportedFormats: ['chat_completions'], defaultFormat: 'chat_completions' },
  { id: 'qwen', name: '通义千问', icon: 'qwen', sdkType: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-vl-max', 'qwen-vl-plus', 'qwen-turbo'], supportsVision: true, supportedFormats: ['chat_completions'], defaultFormat: 'chat_completions' },
  { id: 'custom', name: 'OpenAI 兼容', icon: 'custom', sdkType: 'openai', baseUrl: '', models: [], supportsVision: true, supportedFormats: OPENAI_FORMATS, defaultFormat: 'chat_completions' },
  { id: 'anthropic', name: 'Claude', icon: 'claude', sdkType: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022'], supportsVision: true, supportedFormats: ['messages'], defaultFormat: 'messages' },
];

export const DEFAULT_AI_SETTINGS = {
  aiProvider: '',
  apiKey: '',
  apiBase: '',
  model: '',
  customModel: '',
  apiFormat: 'chat_completions',
  recognizeEngine: 'auto',
  pdfMaxPages: 6,
  ocrEnabled: false,
  ocrProvider: 'custom',
  ocrApiUrl: '',
  ocrApiKey: '',
  ocrResponseMode: 'json_questions',
};

export function getAIProvider(providerId) {
  return AI_PROVIDERS.find((provider) => provider.id === providerId) || null;
}

export function normalizeAISettings(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const settings = { ...DEFAULT_AI_SETTINGS, ...raw };
  const provider = getAIProvider(settings.aiProvider);

  if (provider?.baseUrl && !String(settings.apiBase || '').trim()) {
    settings.apiBase = provider.baseUrl;
  }

  const preferredModel = String(settings.customModel || '').trim() || String(settings.model || '').trim();
  settings.model = preferredModel || provider?.models?.[0] || '';

  const allowedFormats = provider?.supportedFormats || ['chat_completions'];
  settings.apiFormat = allowedFormats.includes(settings.apiFormat)
    ? settings.apiFormat
    : (provider?.defaultFormat || allowedFormats[0] || 'chat_completions');

  settings.recognizeEngine = ['auto', 'ai', 'ocr'].includes(settings.recognizeEngine)
    ? settings.recognizeEngine
    : 'auto';
  settings.pdfMaxPages = Math.max(1, Math.min(20, Number(settings.pdfMaxPages) || 6));
  settings.ocrEnabled = Boolean(settings.ocrEnabled && String(settings.ocrApiUrl || '').trim());
  settings.ocrProvider = settings.ocrProvider || 'custom';
  settings.ocrApiUrl = String(settings.ocrApiUrl || '').trim();
  settings.ocrApiKey = String(settings.ocrApiKey || '').trim();
  settings.ocrResponseMode = ['json_questions', 'text'].includes(settings.ocrResponseMode)
    ? settings.ocrResponseMode
    : 'json_questions';

  return settings;
}

/**
 * 获取 AI 配置
 * 从 localStorage 读取设置页保存的配置
 */
export function getAISettings() {
  try {
    const saved = localStorage.getItem('openexam_settings');
    if (saved) return normalizeAISettings(JSON.parse(saved));
  } catch (e) {}
  return normalizeAISettings(null);
}

/**
 * 检查 AI 是否已配置
 */
export function isAIConfigured() {
  const s = getAISettings();
  return !!(s && s.aiProvider && s.apiKey && s.model);
}

export function isOCRConfigured() {
  const s = getAISettings();
  return Boolean(s.ocrEnabled && s.ocrApiUrl);
}
