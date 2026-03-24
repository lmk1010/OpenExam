const { app, BrowserWindow, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const RELEASES_URL = 'https://github.com/lmk1010/OpenExam/releases';
const LATEST_RELEASE_API = 'https://api.github.com/repos/lmk1010/OpenExam/releases/latest';
const AUTO_INSTALL_ENABLED = process.platform === 'win32';

let initialized = false;
let autoUpdaterBound = false;

const state = {
  status: 'idle',
  currentVersion: app.getVersion(),
  latestVersion: app.getVersion(),
  message: '',
  progress: 0,
  releaseUrl: RELEASES_URL,
  releaseNotes: '',
  lastCheckedAt: '',
  error: '',
  canAutoInstall: AUTO_INSTALL_ENABLED,
  isPackaged: app.isPackaged,
  platform: process.platform,
};

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split('.').map((item) => Number(item) || 0);
  const rightParts = normalizeVersion(right).split('.').map((item) => Number(item) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index] || 0;
    const b = rightParts[index] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }

  return 0;
}

function snapshot() {
  return { ...state };
}

function broadcast() {
  const payload = snapshot();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('app:update-state', payload);
    }
  });
}

function patchState(next) {
  Object.assign(state, next);
  broadcast();
  return snapshot();
}

async function fetchLatestRelease() {
  const response = await fetch(LATEST_RELEASE_API, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'OpenExam-Updater',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub Release 查询失败（${response.status}）`);
  }

  const payload = await response.json();
  return {
    version: normalizeVersion(payload.tag_name || payload.name || ''),
    url: payload.html_url || RELEASES_URL,
    notes: typeof payload.body === 'string' ? payload.body.slice(0, 4000) : '',
    publishedAt: payload.published_at || payload.created_at || '',
  };
}

function bindAutoUpdater() {
  if (autoUpdaterBound || !AUTO_INSTALL_ENABLED) return;
  autoUpdaterBound = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    patchState({ status: 'checking', message: '正在检查更新…', error: '', progress: 0 });
  });

  autoUpdater.on('update-available', (info) => {
    patchState({
      status: 'downloading',
      latestVersion: normalizeVersion(info?.version) || state.latestVersion,
      message: '发现新版本，正在后台下载…',
      error: '',
      progress: 0,
      lastCheckedAt: new Date().toISOString(),
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    patchState({
      status: 'up-to-date',
      latestVersion: normalizeVersion(info?.version) || state.currentVersion,
      message: '当前已是最新版本',
      error: '',
      progress: 100,
      lastCheckedAt: new Date().toISOString(),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    patchState({
      status: 'downloading',
      message: '正在下载更新包…',
      progress: Math.max(0, Math.min(100, Math.round(progress?.percent || 0))),
      error: '',
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    patchState({
      status: 'downloaded',
      latestVersion: normalizeVersion(info?.version) || state.latestVersion,
      message: '更新已下载完成，可在应用内立即重启安装',
      progress: 100,
      error: '',
      lastCheckedAt: new Date().toISOString(),
    });
  });

  autoUpdater.on('error', (error) => {
    patchState({
      status: 'error',
      message: AUTO_INSTALL_ENABLED ? '自动更新失败，请前往 GitHub Release 下载最新版' : '更新检查失败，请稍后重试',
      error: error?.message || '未知错误',
      progress: 0,
      lastCheckedAt: new Date().toISOString(),
    });
  });
}

function getAppInfo() {
  return {
    name: app.getName(),
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    releaseUrl: state.releaseUrl,
    canAutoInstall: AUTO_INSTALL_ENABLED && app.isPackaged,
    updateStrategy: AUTO_INSTALL_ENABLED ? 'auto' : 'manual',
  };
}

async function checkForUpdates() {
  if (state.status === 'checking' || state.status === 'downloading') {
    return snapshot();
  }

  patchState({ status: 'checking', message: '正在检查更新…', error: '', progress: 0 });

  let latestRelease = null;
  try {
    latestRelease = await fetchLatestRelease();
    patchState({
      latestVersion: latestRelease.version || state.latestVersion,
      releaseUrl: latestRelease.url || RELEASES_URL,
      releaseNotes: latestRelease.notes || '',
      lastCheckedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (!AUTO_INSTALL_ENABLED || !app.isPackaged) {
      return patchState({
        status: 'error',
        message: '无法连接 GitHub Release，请稍后重试',
        error: error?.message || '未知错误',
        progress: 0,
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }

  if (latestRelease && compareVersions(latestRelease.version, state.currentVersion) <= 0) {
    return patchState({
      status: 'up-to-date',
      latestVersion: latestRelease.version || state.currentVersion,
      message: '当前已是最新版本',
      error: '',
      progress: 100,
      lastCheckedAt: new Date().toISOString(),
    });
  }

  if (!app.isPackaged) {
    return patchState({
      status: latestRelease ? 'available' : 'dev',
      message: latestRelease ? '开发环境已检测到新版本，可前往 GitHub Release 下载' : '当前是开发环境，不执行自动更新',
      error: '',
      progress: 0,
      lastCheckedAt: new Date().toISOString(),
    });
  }

  if (!AUTO_INSTALL_ENABLED) {
    return patchState({
      status: 'manual-update',
      message: '检测到新版本，请前往 GitHub Release 下载并覆盖安装',
      error: '',
      progress: 0,
      lastCheckedAt: new Date().toISOString(),
    });
  }

  bindAutoUpdater();
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    return patchState({
      status: 'error',
      message: '自动更新检查失败，请前往 GitHub Release 下载最新版',
      error: error?.message || '未知错误',
      progress: 0,
      lastCheckedAt: new Date().toISOString(),
    });
  }

  return snapshot();
}

async function openReleasePage() {
  await shell.openExternal(state.releaseUrl || RELEASES_URL);
  return true;
}

function quitAndInstallUpdate() {
  if (state.status === 'downloaded' && AUTO_INSTALL_ENABLED) {
    autoUpdater.quitAndInstall();
    return true;
  }
  return false;
}

async function openExternal(targetUrl) {
  const url = String(targetUrl || '').trim();
  if (!url) return false;
  await shell.openExternal(url);
  return true;
}

function initUpdater() {
  if (initialized) return;
  initialized = true;
  patchState({
    currentVersion: app.getVersion(),
    latestVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    canAutoInstall: AUTO_INSTALL_ENABLED && app.isPackaged,
    status: app.isPackaged ? 'idle' : 'dev',
    message: app.isPackaged ? '' : '当前是开发环境，不执行自动更新',
  });

  if (app.isPackaged && AUTO_INSTALL_ENABLED) {
    bindAutoUpdater();
  }

  if (app.isPackaged) {
    setTimeout(() => {
      checkForUpdates().catch(() => {});
    }, 2800);
  }
}

module.exports = {
  initUpdater,
  getAppInfo,
  getUpdateState: snapshot,
  checkForUpdates,
  openReleasePage,
  quitAndInstallUpdate,
  openExternal,
};
