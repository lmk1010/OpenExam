import React, { useState, useEffect } from 'react';

// 支持的 AI 服务商配置
const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    supportsVision: true
  },
  {
    id: 'anthropic',
    name: 'Claude',
    icon: 'claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022'],
    supportsVision: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    supportsVision: false
  },
  {
    id: 'doubao',
    name: '豆包',
    icon: 'doubao',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-1-5-vision-pro-32k', 'doubao-1-5-pro-32k'],
    supportsVision: true
  },
  {
    id: 'kimi',
    name: 'Kimi',
    icon: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k'],
    supportsVision: true
  },
  {
    id: 'qwen',
    name: '通义千问',
    icon: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-vl-max', 'qwen-vl-plus', 'qwen-turbo'],
    supportsVision: true
  },
  {
    id: 'glm',
    name: '智谱GLM',
    icon: 'glm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4v', 'glm-4'],
    supportsVision: true
  },
  {
    id: 'custom',
    name: '自定义',
    icon: 'custom',
    baseUrl: '',
    models: [],
    supportsVision: true
  },
];

// 简约图标组件
const ProviderIcon = ({ type }) => {
  const icons = {
    openai: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.28 9.37a5.5 5.5 0 0 0-.47-4.5 5.56 5.56 0 0 0-6-2.57 5.5 5.5 0 0 0-4.14-1.86 5.56 5.56 0 0 0-5.3 3.85 5.5 5.5 0 0 0-3.68 2.67 5.56 5.56 0 0 0 .68 6.52 5.5 5.5 0 0 0 .47 4.5 5.56 5.56 0 0 0 6 2.57 5.5 5.5 0 0 0 4.14 1.86 5.56 5.56 0 0 0 5.3-3.85 5.5 5.5 0 0 0 3.68-2.67 5.56 5.56 0 0 0-.68-6.52z"/>
      </svg>
    ),
    claude: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm0-8h-6V7h6v2z"/>
      </svg>
    ),
    deepseek: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    ),
    doubao: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    kimi: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 16a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    qwen: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    glm: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    ),
    custom: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  };
  return icons[type] || icons.custom;
};

export default function Settings({ onBack }) {
  const [settings, setSettings] = useState({
    aiProvider: '',
    apiKey: '',
    apiBase: '',
    model: '',
    customModel: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [activeSection, setActiveSection] = useState('ai');

  useEffect(() => {
    const saved = localStorage.getItem('openexam_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('openexam_settings', JSON.stringify(settings));
    setTestStatus('saved');
    setTimeout(() => setTestStatus(null), 2000);
  };

  const handleTest = async () => {
    if (!settings.apiKey || !settings.aiProvider) {
      alert('请先配置 API Key 和服务商');
      return;
    }
    setTestStatus('testing');

    try {
      if (window.openexam?.ai) {
        const result = await window.openexam.ai.testConnection(settings);
        if (result.success) {
          setTestStatus('success');
        } else {
          setTestStatus('error');
          console.error('连接失败:', result.error);
        }
      } else {
        // 非 Electron 环境，模拟测试
        setTestStatus('success');
      }
    } catch (e) {
      setTestStatus('error');
      console.error('测试连接失败:', e);
    }

    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleProviderChange = (providerId) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    setSettings(prev => ({
      ...prev,
      aiProvider: providerId,
      apiBase: provider?.baseUrl || '',
      model: provider?.models[0] || '',
    }));
  };

  const currentProvider = AI_PROVIDERS.find(p => p.id === settings.aiProvider);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2>设置</h2>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          <button
            className={`nav-item ${activeSection === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveSection('ai')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              <circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>
            </svg>
            AI 模型
          </button>
          <button
            className={`nav-item ${activeSection === 'import' ? 'active' : ''}`}
            onClick={() => setActiveSection('import')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            导入设置
          </button>
          <button
            className={`nav-item ${activeSection === 'data' ? 'active' : ''}`}
            onClick={() => setActiveSection('data')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            数据管理
          </button>
          <button
            className={`nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => setActiveSection('about')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            关于
          </button>
        </nav>

        <div className="settings-content">
          {activeSection === 'ai' && (
            <div className="settings-section">
              <div className="section-title">
                <h3>AI 模型配置</h3>
                <p>配置 AI 服务后，可使用智能 OCR 识别导入试卷</p>
              </div>

              <div className="provider-grid">
                {AI_PROVIDERS.map(provider => (
                  <button
                    key={provider.id}
                    className={`provider-card ${settings.aiProvider === provider.id ? 'selected' : ''}`}
                    onClick={() => handleProviderChange(provider.id)}
                  >
                    <div className="provider-icon">
                      <ProviderIcon type={provider.icon} />
                    </div>
                    <span className="provider-name">{provider.name}</span>
                    {provider.supportsVision && (
                      <span className="vision-badge">视觉</span>
                    )}
                  </button>
                ))}
              </div>

              {settings.aiProvider && (
                <div className="config-card">
                  <div className="form-row">
                    <label>API Key</label>
                    <div className="input-group">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={settings.apiKey}
                        onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="sk-..."
                      />
                      <button className="input-addon" onClick={() => setShowKey(!showKey)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showKey ? (
                            <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                          ) : (
                            <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="form-row">
                    <label>Base URL</label>
                    <input
                      type="text"
                      value={settings.apiBase}
                      onChange={(e) => setSettings(prev => ({ ...prev, apiBase: e.target.value }))}
                      placeholder={currentProvider?.baseUrl || '输入 API 地址'}
                    />
                  </div>

                  <div className="form-row">
                    <label>模型</label>
                    {settings.aiProvider === 'custom' ? (
                      <input
                        type="text"
                        value={settings.customModel}
                        onChange={(e) => setSettings(prev => ({ ...prev, customModel: e.target.value }))}
                        placeholder="输入模型名称"
                      />
                    ) : (
                      <select
                        value={settings.model}
                        onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                      >
                        {currentProvider?.models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      className={`btn-outline ${testStatus === 'success' ? 'success' : ''}`}
                      onClick={handleTest}
                      disabled={testStatus === 'testing'}
                    >
                      {testStatus === 'testing' && <span className="spinner" />}
                      {testStatus === 'success' ? '连接成功' : '测试连接'}
                    </button>
                    <button className="btn-primary" onClick={handleSave}>
                      {testStatus === 'saved' ? '已保存 ✓' : '保存配置'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'import' && (
            <div className="settings-section">
              <div className="section-title">
                <h3>导入设置</h3>
                <p>未配置 AI 时，可使用模板文件导入题目</p>
              </div>

              <div className="template-card">
                <div className="template-preview">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div className="template-info">
                  <h4>题目导入模板</h4>
                  <p>CSV 格式，包含题目、选项、答案、解析等字段</p>
                  <div className="template-fields">
                    <span>题目内容</span>
                    <span>选项A-D</span>
                    <span>正确答案</span>
                    <span>解析</span>
                    <span>分类</span>
                  </div>
                </div>
                <button className="btn-download" onClick={downloadTemplate}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  下载模板
                </button>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="settings-section">
              <div className="section-title">
                <h3>数据管理</h3>
                <p>导出或清理本地数据</p>
              </div>

              <div className="data-cards">
                <div className="data-card">
                  <div className="data-icon export">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div className="data-info">
                    <h4>导出数据</h4>
                    <p>导出所有题目和练习记录</p>
                  </div>
                  <button className="btn-outline">导出</button>
                </div>

                <div className="data-card">
                  <div className="data-icon danger">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </div>
                  <div className="data-info">
                    <h4>清空数据</h4>
                    <p>删除所有本地数据，不可恢复</p>
                  </div>
                  <button className="btn-danger">清空</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="settings-section">
              <div className="section-title">
                <h3>关于</h3>
              </div>

              <div className="about-card">
                <div className="app-logo">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <path d="M8 7h8M8 11h8M8 15h5"/>
                  </svg>
                </div>
                <h4>OpenExam</h4>
                <p className="version">版本 0.1.0</p>
                <p className="desc">开源公考刷题应用</p>
                <div className="about-links">
                  <a href="#">GitHub</a>
                  <span>·</span>
                  <a href="#">反馈问题</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadTemplate() {
  const headers = ['题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '解析', '分类', '子分类'];
  const example = ['下列说法正确的是：', '选项A内容', '选项B内容', '选项C内容', '选项D内容', 'A', '解析内容', 'yanyu', 'xuanci'];
  const csvContent = [headers.join(','), example.join(',')].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '题目导入模板.csv';
  a.click();
  URL.revokeObjectURL(url);
}
