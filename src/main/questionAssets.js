const { app, protocol, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ASSET_SCHEME = 'openexam-asset';
const ASSET_HOST = 'question-assets';

function getAssetRoots() {
  const roots = [];
  try {
    roots.push(path.join(app.getPath('userData'), 'question-assets'));
  } catch (_) {}
  if (process.resourcesPath) roots.push(path.join(process.resourcesPath, 'question-assets'));
  roots.push(path.join(__dirname, '..', '..', 'data', 'question-assets'));
  return roots;
}

function normalizeRelativePath(input = '') {
  const value = String(input || '').replace(/^\/+/, '');
  const normalized = path.posix.normalize(value);
  if (!normalized || normalized === '.' || normalized.startsWith('..')) return '';
  return normalized;
}

function resolveAssetPath(relativePath = '') {
  const safeRelativePath = normalizeRelativePath(relativePath);
  if (!safeRelativePath) return '';
  for (const root of getAssetRoots()) {
    const candidate = path.join(root, safeRelativePath);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return '';
}

function toAssetUrl(relativePath = '') {
  const safeRelativePath = normalizeRelativePath(relativePath);
  if (!safeRelativePath) return '';
  return `${ASSET_SCHEME}://${ASSET_HOST}/${safeRelativePath}`;
}

function parseAssetRequest(requestUrl = '') {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== `${ASSET_SCHEME}:`) return '';
    if (url.host !== ASSET_HOST) return '';
    return normalizeRelativePath(decodeURIComponent(url.pathname || ''));
  } catch (_) {
    return '';
  }
}

function registerProtocol() {
  protocol.handle(ASSET_SCHEME, (request) => {
    const relativePath = parseAssetRequest(request.url);
    const filePath = resolveAssetPath(relativePath);
    if (!filePath) {
      return new Response('Asset Not Found', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).href);
  });
}

module.exports = {
  ASSET_SCHEME,
  ASSET_HOST,
  getAssetRoots,
  parseAssetRequest,
  registerProtocol,
  resolveAssetPath,
  toAssetUrl,
};
