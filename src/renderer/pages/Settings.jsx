import React, { useState, useEffect } from 'react';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS, getAIProvider, normalizeAISettings } from '../store/aiSettings.js';
import CustomSelect from '../components/CustomSelect.jsx';
import appLogo from '../assets/openexam-logo.png';

const RESETTABLE_LOCAL_KEYS = ['openexam_settings', 'openexam_onboarding_done_v1', 'openexam_ai_active_session', 'openexam_question_context'];

const ProviderIcon = ({ type }) => {
  const icons = {
    openai: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.28 9.37a5.5 5.5 0 0 0-.47-4.5 5.56 5.56 0 0 0-6-2.57 5.5 5.5 0 0 0-4.14-1.86 5.56 5.56 0 0 0-5.3 3.85 5.5 5.5 0 0 0-3.68 2.67 5.56 5.56 0 0 0 .68 6.52 5.5 5.5 0 0 0 .47 4.5 5.56 5.56 0 0 0 6 2.57 5.5 5.5 0 0 0 4.14 1.86 5.56 5.56 0 0 0 5.3-3.85 5.5 5.5 0 0 0 3.68-2.67 5.56 5.56 0 0 0-.68-6.52z"/></svg>,
    minimax: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5h4l3 4 3-4h4v14h-4V11l-3 4-3-4v8H5z"/></svg>,
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
  const [settings, setSettings] = useState(DEFAULT_AI_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [activeSection, setActiveSection] = useState('ai');
  const [persistStatus, setPersistStatus] = useState('loading');
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [connectionState, setConnectionState] = useState(null);
  const [appInfo, setAppInfo] = useState(null);
  const [updateState, setUpdateState] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    let mounted = true;
    let dispose = () => {};

    const loadAppState = async () => {
      try {
        if (window.openexam?.app?.getInfo) {
          const info = await window.openexam.app.getInfo();
          if (mounted) setAppInfo(info || null);
        }

        if (window.openexam?.app?.getUpdateState) {
          const state = await window.openexam.app.getUpdateState();
          if (mounted) setUpdateState(state || null);
        }

        if (window.openexam?.app?.onUpdateState) {
          dispose = window.openexam.app.onUpdateState((payload) => {
            if (mounted) setUpdateState(payload || null);
          });
        }
      } catch (error) {
        console.error('读取应用状态失败:', error);
      }
    };

    loadAppState();
    return () => {
      mounted = false;
      dispose();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      let next = normalizeAISettings(null);
      try {
        const localSaved = localStorage.getItem('openexam_settings');
        if (localSaved) {
          next = normalizeAISettings(JSON.parse(localSaved));
        }
      } catch (e) {}

      try {
        if (window.openexam?.db?.getAISettings) {
          const sqliteSettings = await window.openexam.db.getAISettings();
          if (sqliteSettings && typeof sqliteSettings === 'object') {
            next = normalizeAISettings(sqliteSettings);
            localStorage.setItem('openexam_settings', JSON.stringify(next));
          }
          setPersistStatus('sqlite');
        } else {
          setPersistStatus('local');
        }
      } catch (error) {
        console.error('读取 SQLite 配置失败:', error);
        setPersistStatus('local');
      }

      try {
        if (window.openexam?.db?.getAIConnectionState) {
          const state = await window.openexam.db.getAIConnectionState();
          if (mounted) setConnectionState(state || null);
        }
      } catch (error) {
        console.error('读取连接状态失败:', error);
      }

      if (mounted) setSettings(next);
    };

    loadSettings();
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    const normalized = normalizeAISettings(settings);
    setSettings(normalized);
    localStorage.setItem('openexam_settings', JSON.stringify(normalized));
    const now = new Date().toISOString();
    setLastSavedAt(now);
    try {
      if (window.openexam?.db?.saveAISettings) {
        await window.openexam.db.saveAISettings(normalized);
        setPersistStatus('sqlite');
      }
    } catch (error) {
      console.error('写入 SQLite 配置失败:', error);
      setPersistStatus('local');
    }
    setTestStatus('saved');
    setTimeout(() => setTestStatus(null), 2000);
  };

  const handleTest = async () => {
    if (!settings.apiKey || !settings.aiProvider) { alert('请先配置 API Key 和服务商'); return; }
    setTestStatus('testing');
    try {
      if (window.openexam?.ai) {
        const result = await window.openexam.ai.testConnection(settings);
        const state = {
          status: result.success ? 'success' : 'error',
          provider: settings.aiProvider || '',
          model: settings.model || '',
          apiBase: settings.apiBase || '',
          checkedAt: new Date().toISOString(),
          error: result.success ? '' : (result.error || ''),
        };
        setConnectionState(state);
        if (window.openexam?.db?.saveAIConnectionState) {
          await window.openexam.db.saveAIConnectionState(state);
        }
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

  const formatTime = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return value;
    }
  };

  const getUpdateSummary = () => {
    if (!updateState) return '可在此查看版本与 GitHub Release 更新状态';

    const statusMap = {
      idle: '已接入自动更新，可随时手动检查',
      checking: '正在检查 GitHub Release 更新',
      available: '发现新版本，可前往 Release 页面下载',
      downloading: '正在后台下载更新包',
      downloaded: '更新包已下载完成，可重启安装',
      'up-to-date': '当前已经是最新版本',
      'manual-update': '发现新版本，当前平台建议手动下载安装',
      dev: '当前为开发环境，仅展示更新状态',
      error: updateState.message || '更新检查失败，可稍后重试',
    };

    return statusMap[updateState.status] || updateState.message || '更新状态未知';
  };

  const handleCheckUpdates = async () => {
    if (!window.openexam?.app?.checkForUpdates || checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const result = await window.openexam.app.checkForUpdates();
      setUpdateState(result || null);
    } catch (error) {
      alert(`检查更新失败：${error.message || '未知错误'}`);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleOpenLink = async (targetUrl) => {
    if (!targetUrl) return;
    try {
      if (window.openexam?.app?.openExternal) {
        await window.openexam.app.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('打开链接失败:', error);
    }
  };

  const handleUpdatePrimary = async () => {
    if (!updateState) {
      await handleCheckUpdates();
      return;
    }

    if (updateState.status === 'downloaded' && appInfo?.canAutoInstall && window.openexam?.app?.quitAndInstallUpdate) {
      await window.openexam.app.quitAndInstallUpdate();
      return;
    }

    if ([ 'available', 'manual-update', 'error' ].includes(updateState.status) || (!appInfo?.canAutoInstall && updateState.latestVersion && updateState.latestVersion !== appInfo?.version)) {
      const target = updateState.releaseUrl || appInfo?.releaseUrl || 'https://github.com/lmk1010/OpenExam/releases';
      if (window.openexam?.app?.openReleasePage) {
        await window.openexam.app.openReleasePage();
      } else {
        await handleOpenLink(target);
      }
      return;
    }

    await handleCheckUpdates();
  };

  const updatePrimaryLabel = (() => {
    if (checkingUpdate || updateState?.status === 'checking') return '检查中...';
    if (updateState?.status === 'downloaded' && appInfo?.canAutoInstall) return '重启安装';
    if ([ 'available', 'manual-update', 'error' ].includes(updateState?.status) || (!appInfo?.canAutoInstall && updateState?.latestVersion && updateState.latestVersion !== appInfo?.version)) return '前往 Release';
    return '检查更新';
  })();

  const handleProviderChange = (providerId) => {
    const provider = getAIProvider(providerId);
    setSettings(prev => {
      const isSameProvider = prev.aiProvider === providerId;
      const nextBase = isSameProvider
        ? prev.apiBase
        : (provider?.baseUrl || prev.apiBase || '');
      const nextModel = isSameProvider
        ? prev.model
        : (provider?.models?.[0] || prev.model || '');

      return normalizeAISettings({
        ...prev,
        aiProvider: providerId,
        apiBase: nextBase,
        model: nextModel,
        customModel: providerId === 'custom' ? prev.customModel : '',
        apiFormat: provider?.defaultFormat || prev.apiFormat,
      });
    });
  };

  const handleExportAllData = async () => {
    if (!window.openexam?.db?.exportAllData) {
      alert('当前环境不支持导出');
      return;
    }

    try {
      const payload = await window.openexam.db.exportAllData();
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      const filename = `openexam-backup-${stamp}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      alert(`导出成功：${filename}`);
    } catch (error) {
      alert(`导出失败：${error.message || '未知错误'}`);
    }
  };

  const handleResetUserData = async () => {
    if (!window.openexam?.db?.resetUserData) {
      alert('当前环境不支持重置用户数据');
      return;
    }

    const confirmed = window.confirm('该操作会保留题库，但会清空练习进度、错题、本地 AI 会话、设置和自定义内容，恢复到首次打开状态。是否继续？');
    if (!confirmed) return;

    try {
      const result = await window.openexam.db.resetUserData();
      RESETTABLE_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
      alert(`已重置为新用户状态，题库保留 ${result?.preserved?.papers || 0} 套 / ${result?.preserved?.questions || 0} 题`);
      window.location.reload();
    } catch (error) {
      alert(`重置失败：${error.message || '未知错误'}`);
    }
  };

  const currentProvider = getAIProvider(settings.aiProvider);

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
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-soft-bg)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
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
                ...(activeSection === item.id ? { background: "var(--accent)", color: "#fff", boxShadow: "0 8px 18px rgba(15,23,42,0.08)" } : { background: "transparent", color: "var(--muted)" })
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
                      ...(settings.aiProvider === provider.id ? { background: "var(--accent-soft-bg)", borderColor: "var(--accent)", color: "var(--text)", boxShadow: "0 10px 22px rgba(15,23,42,0.06)" } : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--muted)" })
                    }}
                  >
                    <div style={{ color: settings.aiProvider === provider.id ? "var(--accent)" : "inherit" }}>
                      <ProviderIcon type={provider.icon} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: settings.aiProvider === provider.id ? 600 : 500 }}>
                      {provider.name}
                      {provider.supportsVision && <span style={{ fontSize: 9, padding: "2px 4px", borderRadius: 4, background: "var(--accent-soft-bg)", color: "var(--accent)" }}>视觉</span>}
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

                  {currentProvider?.sdkType !== 'anthropic' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>接口格式</label>
                      <CustomSelect
                        value={settings.apiFormat}
                        onChange={(nextValue) => setSettings(prev => normalizeAISettings({ ...prev, apiFormat: nextValue }))}
                        options={(currentProvider?.supportedFormats || []).map((format) => ({
                          value: format,
                          label: format === 'responses'
                            ? 'Responses API'
                            : format === 'chat_completions'
                              ? 'Chat Completions API'
                              : format,
                        }))}
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>模型</label>
                    {settings.aiProvider === 'custom' ? (
                      <input type="text" value={settings.customModel} onChange={(e) => setSettings(prev => ({ ...prev, customModel: e.target.value }))} placeholder="输入模型名称"
                        style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 13, outline: "none", color: "var(--text)" }}
                      />
                    ) : (
                      <CustomSelect
                        value={settings.model}
                        onChange={(nextValue) => setSettings(prev => ({ ...prev, model: nextValue }))}
                        options={(currentProvider?.models || []).map((model) => ({ value: model, label: model }))}
                      />
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <button onClick={handleTest} disabled={testStatus === 'testing'} style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: testStatus === 'testing' ? "wait" : "pointer" }}>
                      {testStatus === 'testing' ? '测试中...' : testStatus === 'success' ? '✓ 连接成功' : testStatus === 'error' ? '× 连接失败' : '测试连接'}
                    </button>
                    <button onClick={handleSave} style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "1px solid var(--accent)", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 8px 18px rgba(15,23,42,0.08)" }}>
                      {testStatus === 'saved' ? '已保存 ✓' : '保存配置'}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                    <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)" }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>配置存储</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: persistStatus === 'sqlite' ? 'var(--success)' : 'var(--text)' }}>
                        {persistStatus === 'loading' ? '读取中...' : persistStatus === 'sqlite' ? 'SQLite 持久化' : '仅本地缓存'}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                        最近保存: {formatTime(lastSavedAt)}
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)" }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>连接状态</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: connectionState?.status === 'success' ? 'var(--success)' : connectionState?.status === 'error' ? 'var(--danger)' : 'var(--text)' }}>
                        {connectionState?.status === 'success' ? '已验证可用' : connectionState?.status === 'error' ? '验证失败' : '未验证'}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                        最近验证: {formatTime(connectionState?.checkedAt)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed var(--line)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>文档识别引擎</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>引擎 A 复用当前 AI 模型；引擎 B 用独立 OCR 服务，适合扫描 PDF 或复杂版式。</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {[
                        ['auto', '自动选择'],
                        ['ai', '仅 AI 引擎'],
                        ['ocr', '仅 OCR 引擎'],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, recognizeEngine: key }))}
                          style={{ padding: '10px 12px', borderRadius: 8, border: settings.recognizeEngine === key ? '1px solid var(--accent)' : '1px solid var(--line)', background: settings.recognizeEngine === key ? 'var(--accent-soft-bg)' : 'var(--surface)', color: settings.recognizeEngine === key ? 'var(--accent)' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>PDF 最大识别页数</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={settings.pdfMaxPages}
                        onChange={(e) => setSettings(prev => ({ ...prev, pdfMaxPages: e.target.value }))}
                        style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none', color: 'var(--text)' }}
                      />
                    </div>

                    <div style={{ marginTop: 4, padding: '14px', borderRadius: 10, background: 'var(--surface-soft)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>OCR 引擎 B</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>可接第三方 OCR URL。建议你的 OCR 服务返回 <code>{'{ questions: [...] }'}</code>，或返回纯文本再交给系统解析。</div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={Boolean(settings.ocrEnabled)} onChange={(e) => setSettings(prev => ({ ...prev, ocrEnabled: e.target.checked }))} />
                          启用 OCR
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>OCR URL</label>
                          <input type="text" value={settings.ocrApiUrl} onChange={(e) => setSettings(prev => ({ ...prev, ocrApiUrl: e.target.value }))} placeholder="https://your-ocr.example.com/recognize"
                            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none', color: 'var(--text)' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>OCR Key</label>
                          <input type={showKey ? 'text' : 'password'} value={settings.ocrApiKey} onChange={(e) => setSettings(prev => ({ ...prev, ocrApiKey: e.target.value }))} placeholder="可选"
                            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none', color: 'var(--text)' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>OCR 返回格式</label>
                        <CustomSelect
                          value={settings.ocrResponseMode}
                          onChange={(nextValue) => setSettings(prev => ({ ...prev, ocrResponseMode: nextValue }))}
                          options={[
                            { value: 'json_questions', label: '返回结构化题目 JSON' },
                            { value: 'text', label: '返回纯文本，再交给 AI 结构化' },
                          ]}
                        />
                      </div>
                    </div>
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
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-soft-bg)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
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
                <p style={{ fontSize: 12, color: "var(--muted)" }}>导出备份，或将当前账号恢复到首次打开状态</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px", background: "var(--surface-soft)", borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-soft-bg)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0", color: "var(--text)" }}>导出数据</h4>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>将所有题目和练习记录导出为可移植格式</p>
                  </div>
                  <button onClick={handleExportAllData} style={{ marginTop: "auto", padding: "8px 0", borderRadius: 6, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>导出所有数据</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px", background: "var(--danger-soft)", borderRadius: 12, border: "1px solid var(--danger-border)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0", color: "var(--danger)" }}>重置用户数据</h4>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>保留内置题库，清空练习进度、错题、AI 会话、设置与自定义内容</p>
                  </div>
                  <button onClick={handleResetUserData} style={{ marginTop: "auto", padding: "8px 0", borderRadius: 6, border: "none", background: "var(--danger)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>恢复新用户状态</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, minHeight: 300, justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 24px", borderRadius: 20, background: "linear-gradient(180deg, var(--surface-elevated), var(--surface))", border: "1px solid var(--line)", boxShadow: "var(--elevated-shadow)" }}>
                <div className="app-logo app-logo--about">
                  <img src={appLogo} alt="OpenExam" className="app-logo-image" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.5px" }}>OpenExam</h3>
                    <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, background: "var(--accent-soft-bg)", padding: "4px 10px", borderRadius: 999 }}>v{appInfo?.version || '0.2.0'}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>开源公考刷题应用 · 本地优先 · AI 助学</p>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => handleOpenLink('https://github.com/lmk1010/OpenExam')} style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, padding: "8px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer" }}>GitHub 仓库</button>
                    <button type="button" onClick={() => handleOpenLink('https://github.com/lmk1010/OpenExam/issues')} style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, padding: "8px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer" }}>反馈问题</button>
                    <button type="button" onClick={() => handleOpenLink(appInfo?.releaseUrl || 'https://github.com/lmk1010/OpenExam/releases')} style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, padding: "8px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer" }}>Release 页面</button>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 22px", borderRadius: 18, background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>在线更新</h4>
                      <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0 0" }}>{getUpdateSummary()}</p>
                    </div>
                    <button type="button" onClick={handleUpdatePrimary} disabled={checkingUpdate || updateState?.status === 'checking'} style={{ minWidth: 108, height: 38, borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: checkingUpdate || updateState?.status === 'checking' ? 0.7 : 1 }}>{updatePrimaryLabel}</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                    <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>当前版本</div>
                      <strong style={{ fontSize: 16 }}>{appInfo?.version ? `v${appInfo.version}` : '-'}</strong>
                    </div>
                    <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>最新版本</div>
                      <strong style={{ fontSize: 16 }}>{updateState?.latestVersion ? `v${updateState.latestVersion}` : '-'}</strong>
                    </div>
                    <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>更新方式</div>
                      <strong style={{ fontSize: 14 }}>{appInfo?.canAutoInstall ? '自动下载 / 安装' : '检测后手动下载'}</strong>
                    </div>
                    <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>上次检查</div>
                      <strong style={{ fontSize: 14 }}>{formatTime(updateState?.lastCheckedAt)}</strong>
                    </div>
                  </div>
                  {updateState?.message && (
                    <div style={{ fontSize: 12, color: updateState?.status === 'error' ? 'var(--danger)' : 'var(--muted)', lineHeight: 1.7 }}>
                      {updateState.message}
                      {updateState?.error ? `：${updateState.error}` : ''}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 22px", borderRadius: 18, background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Release 提示</h4>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
                    <div>Windows：可直接通过应用内更新下载安装。</div>
                    <div>macOS：检测到新版后会打开 GitHub Release 下载。</div>
                    <div>若 macOS 首次打开被拦截，请按 Release 说明移除隔离属性。</div>
                  </div>
                </div>
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
