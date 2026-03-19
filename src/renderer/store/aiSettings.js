/**
 * 获取 AI 配置
 * 从 localStorage 读取设置页保存的配置
 */
export function getAISettings() {
  try {
    const saved = localStorage.getItem('openexam_settings');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

/**
 * 检查 AI 是否已配置
 */
export function isAIConfigured() {
  const s = getAISettings();
  return !!(s && s.aiProvider && s.apiKey);
}
