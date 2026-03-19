import React, { useState, useEffect } from 'react';

// 支持的 AI 服务商配置
const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: 'openai', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], supportsVision: true },
  { id: 'anthropic', name: 'Claude', icon: 'claude', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022'], supportsVision: true },
  { id: 'deepseek', name: 'DeepSeek', icon: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'], supportsVision: false },
  { id: 'doubao', name: '豆包', icon: 'doubao', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', models: ['doubao-1-5-vision-pro-32k', 'doubao-1-5-pro-32k'], supportsVision: true },
  { id: 'kimi', name: 'Kimi', icon: 'kimi', baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-128k', 'moonshot-v1-32k'], supportsVision: true },
  { id: 'qwen', name: '通义千问', icon: 'qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-vl-max', 'qwen-vl-plus', 'qwen-turbo'], supportsVision: true },
  { id: 'glm', name: '智谱GLM', icon: 'glm', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4v', 'glm-4'], supportsVision: true },
  { id: 'custom', name: '自定义', icon: 'custom', baseUrl: '', models: [], supportsVision: true },
];

const ProviderIcon = ({ type }) => {
  const icons = {
    openai: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.28 9.37a5.5 5.5 0 0 0-.47-4.5 5.56 5.56 0 0 0-6-2.57 5.5 5.5 0 0 0-4.14-1.86 5.56 5.56 0 0 0-5.3 3.85 5.5 5.5 0 0 0-3.68 2.67 5.56 5.56 0 0 0 .68 6.52 5.5 5.5 0 0 0 .47 4.5 5.56 5.56 0 0 0 6 2.57 5.5 5.5 0 0 0 4.14 1.86 5.56 5.56 0 0 0 5.3-3.85 5.5 5.5 0 0 0 3.68-2.67 5.56 5.56 0 0 0-.68-6.52z"/></svg>,
    claude: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm0-8h-6V7h6v2z"/></svg>,
    deepseek: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>,
    doubao: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    kimi: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 16a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/><circle cx="12" cy="12" r="3"/></svg>,
    qwen: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    glm: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
    custom: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };
  return icons[type] || icons.custom;
};

export default function Settings({ onBack }) {
  const [settings, setSettings] = useState({ aiProvider: '', apiKey: '', apiBase: '', model: '', customModel: '' });
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [activeSection, setActiveSection] = useState('ai');

  useEffect(() => {
    const saved = localStorage.getItem('openexam_settings');
    if (saved) {
      try { setSettings(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('openexam_settings', JSON.stringify(settings));
    setTestStatus('saved');
    setTimeout(() => setTestStatus(null), 2000);
  };

  const handleTest = async () => {
    if (!settings.apiKey || !settings.aiProvider) { alert('请先配置 API Key 和服务商'); return; }
    setTestStatus('testing');
    try {
      if (window.openexam?.ai) {
        const result = await window.openexam.ai.testConnection(settings);
        if (result.success) setTestStatus('success');
        else { setTestStatus('error'); console.error('连接失败:', result.error); }
      } else {
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
    setSettings(prev => ({ ...prev, aiProvider: providerId, apiBase: provider?.baseUrl || '', model: provider?.models[0] || '' }));
  };

  const currentProvider = AI_PROVIDERS.find(p => p.id === settings.aiProvider);

  const navItems = [
    { id: 'ai', label: 'AI 模型', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></svg> },
    { id: 'import', label: '导入设置', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
    { id: 'data', label: '数据管理', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
    { id: 'about', label: '关于', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
  ];

  return (
    <section className="main-panel module-page" style={{ padding: "0 20px", gap: 20, overflow: "auto" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <div className="breadcrumb" style={{ margin: 0 }}>设置 &gt; 系统选项</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(109,94,251,0.1)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.5px", margin: 0 }}>系统设置</h2>
          {onBack && (
            <button onClick={onBack} style={{ marginLeft: "auto", background: "var(--surface)", border: "1px solid var(--line)", padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }} onMouseOver={e => { e.target.style.background = "var(--surface-soft)"; }} onMouseOut={e => { e.target.style.background = "var(--surface)"; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              返回
            </button>
          )}
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 32, flex: 1, minHeight: 0, paddingBottom: 20 }}>
        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 20, borderRight: "1px solid var(--line)" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.2s", fontSize: 13, fontWeight: activeSection === item.id ? 600 : 500,
                ...(activeSection === item.id ? { background: "var(--accent)", color: "#fff", boxShadow: "0 4px 12px rgba(109,94,251,0.2)" } : { background: "transparent", color: "var(--muted)" })
              }}
              onMouseOver={e => { if (activeSection !== item.id) e.currentTarget.style.background = "var(--surface-soft)"; }}
              onMouseOut={e => { if (activeSection !== item.id) e.currentTarget.style.background = "transparent"; }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, overflow: "auto", paddingRight: 8 }}>
          {activeSection === 'ai' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>AI 模型配置</h3>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>配置 AI 服务后，可使用智能 OCR 识别导入试卷，并支持 AI 错题解析</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
                {AI_PROVIDERS.map(provider => (
                  <button key={provider.id} onClick={() => handleProviderChange(provider.id)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 10px", borderRadius: 10, border: "1px solid", cursor: "pointer", transition: "all 0.2s",
                      ...(settings.aiProvider === provider.id ? { background: "rgba(109,94,251,0.05)", borderColor: "var(--accent)", color: "var(--text)", boxShadow: "0 4px 12px rgba(109,94,251,0.1)" } : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--muted)" })
                    }}
                  >
                    <div style={{ color: settings.aiProvider === provider.id ? "var(--accent)" : "inherit" }}>
                      <ProviderIcon type={provider.icon} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: settings.aiProvider === provider.id ? 600 : 500 }}>
                      {provider.name}
                      {provider.supportsVision && <span style={{ fontSize: 9, padding: "2px 4px", borderRadius: 4, background: "rgba(109,94,251,0.1)", color: "var(--accent)" }}>视觉</span>}
                    </div>
                  </button>
                ))}
              </div>

              {settings.aiProvider && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px", background: "var(--surface-soft)", borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>API Key</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type={showKey ? "text" : "password"} value={settings.apiKey} onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="sk-..."
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 13, outline: "none", color: "var(--text)" }}
                      />
                      <button onClick={() => setShowKey(!showKey)} style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--muted)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {showKey ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>Base URL</label>
                    <input type="text" value={settings.apiBase} onChange={(e) => setSettings(prev => ({ ...prev, apiBase: e.target.value }))} placeholder={currentProvider?.baseUrl || '输入 API 地址'}
                      style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 13, outline: "none", color: "var(--text)" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>模型</label>
                    {settings.aiProvider === 'custom' ? (
                      <input type="text" value={settings.customModel} onChange={(e) => setSettings(prev => ({ ...prev, customModel: e.target.value }))} placeholder="输入模型名称"
                        style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 13, outline: "none", color: "var(--text)" }}
                      />
                    ) : (
                      <select value={settings.model} onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                        style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 13, outline: "none", color: "var(--text)", cursor: "pointer" }}
                      >
                        {currentProvider?.models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <button onClick={handleTest} disabled={testStatus === 'testing'} style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: testStatus === 'testing' ? "wait" : "pointer" }}>
                      {testStatus === 'testing' ? '测试中...' : testStatus === 'success' ? '✓ 连接成功' : testStatus === 'error' ? '× 连接失败' : '测试连接'}
                    </button>
                    <button onClick={handleSave} style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "1px solid var(--accent)", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(109,94,251,0.2)" }}>
                      {testStatus === 'saved' ? '已保存 ✓' : '保存配置'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'import' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>导入设置</h3>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>未配置 AI 时，可使用模板文件导入题目</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px", background: "var(--surface-soft)", borderRadius: 12, border: "1px solid var(--line)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(109,94,251,0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0", color: "var(--text)" }}>题目导入模板</h4>
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>支持 CSV 格式，包含题目、选项、答案、解析等必需字段</p>
                </div>
                <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => { e.target.style.background = "var(--accent)"; e.target.style.color = "#fff"; }} onMouseOut={e => { e.target.style.background = "transparent"; e.target.style.color = "var(--accent)"; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  下载模板
                </button>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>数据管理</h3>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>导出或清理本地数据</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px", background: "var(--surface-soft)", borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(109,94,251,0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0", color: "var(--text)" }}>导出数据</h4>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>将所有题目和练习记录导出为可移植格式</p>
                  </div>
                  <button style={{ marginTop: "auto", padding: "8px 0", borderRadius: 6, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>导出所有数据</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px", background: "rgba(231,76,60,0.05)", borderRadius: 12, border: "1px solid rgba(231,76,60,0.2)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(231,76,60,0.1)", color: "#e74c3c", display: "grid", placeItems: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0", color: "#e74c3c" }}>清空数据</h4>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>删除所有本地试题库、进度和记录。此操作不可恢复</p>
                  </div>
                  <button style={{ marginTop: "auto", padding: "8px 0", borderRadius: 6, border: "none", background: "#e74c3c", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>彻底清空数据</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, minHeight: 300 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(109,94,251,0.08)", border: "1px solid rgba(109,94,251,0.15)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h8M8 15h5"/>
                </svg>
              </div>
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4, marginTop: 16 }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.5px" }}>OpenExam</h3>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, background: "rgba(109,94,251,0.1)", padding: "4px 10px", borderRadius: 12, display: "inline-block", margin: "4px auto" }}>版本 0.1.0</span>
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>开源公考刷题应用</p>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
                <a href="#" style={{ fontSize: 13, color: "var(--text)", textDecoration: "none", fontWeight: 500, padding: "6px 16px", borderRadius: 20, border: "1px solid var(--line)", transition: "all 0.2s" }} onMouseOver={e => e.target.style.background = "var(--surface-soft)"} onMouseOut={e => e.target.style.background = "transparent"}>GitHub</a>
                <a href="#" style={{ fontSize: 13, color: "var(--text)", textDecoration: "none", fontWeight: 500, padding: "6px 16px", borderRadius: 20, border: "1px solid var(--line)", transition: "all 0.2s" }} onMouseOver={e => e.target.style.background = "var(--surface-soft)"} onMouseOut={e => e.target.style.background = "transparent"}>反馈问题</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
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
