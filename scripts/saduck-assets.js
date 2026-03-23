const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ASSET_SCHEME = 'openexam-asset://question-assets/';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
const REFERER = 'https://saduck.top/questionBank/overTheYears.html';
const ORIGIN = 'https://saduck.top';
const DEFAULT_CONCURRENCY = Math.max(2, Number(process.env.SADUCK_ASSET_CONCURRENCY) || 8);
const ASSET_DIR = path.join(__dirname, '../data/question-assets');
const MANIFEST_PATH = path.join(__dirname, '../data/question-assets-manifest.json');

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeAssetUrl(url) {
  const value = decodeHtmlEntities(String(url || '').trim());
  if (!value || value.startsWith('openexam-asset://') || value.startsWith('data:')) return '';
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${ORIGIN}${value}`;
  return value;
}

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function getExtFromContentType(contentType = '') {
  const value = String(contentType || '').toLowerCase();
  if (value.includes('image/png')) return '.png';
  if (value.includes('image/jpeg')) return '.jpg';
  if (value.includes('image/webp')) return '.webp';
  if (value.includes('image/gif')) return '.gif';
  if (value.includes('image/svg+xml')) return '.svg';
  return '';
}

function getExtFromUrl(targetUrl = '') {
  try {
    const pathname = new URL(targetUrl).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) return ext;
  } catch (_) {}
  return '';
}

function extractAssetUrls(html = '') {
  return [...String(html || '').matchAll(/src=["']([^"']+)["']/gi)]
    .map((match) => normalizeAssetUrl(match[1]))
    .filter(Boolean);
}

function rewriteHtmlWithMap(html = '', assetMap = new Map()) {
  return String(html || '').replace(/src=(["'])([^"']+)\1/gi, (full, quote, url) => {
    const normalized = normalizeAssetUrl(url);
    const local = assetMap.get(normalized);
    if (!local) return full;
    return `src=${quote}${local}${quote}`;
  });
}

async function runPool(list, worker, concurrency = DEFAULT_CONCURRENCY) {
  const tasks = [];
  let index = 0;
  const size = Math.max(1, Math.min(concurrency, list.length || 1));
  for (let i = 0; i < size; i += 1) {
    tasks.push((async () => {
      while (index < list.length) {
        const current = list[index];
        index += 1;
        await worker(current, index - 1);
      }
    })());
  }
  await Promise.all(tasks);
}

async function downloadAsset(url, manifest) {
  const normalizedUrl = normalizeAssetUrl(url);
  if (!normalizedUrl) return null;

  const existing = manifest[normalizedUrl];
  if (existing?.file) {
    const localPath = path.join(ASSET_DIR, existing.file);
    if (fs.existsSync(localPath)) return existing.file;
  }

  const response = await fetch(normalizedUrl, {
    headers: {
      'user-agent': USER_AGENT,
      referer: REFERER,
      origin: ORIGIN,
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = getExtFromContentType(response.headers.get('content-type')) || getExtFromUrl(normalizedUrl) || '.png';
  const file = `${sha1(normalizedUrl)}${ext}`;
  ensureDir(ASSET_DIR);
  fs.writeFileSync(path.join(ASSET_DIR, file), buffer);
  manifest[normalizedUrl] = {
    file,
    contentType: response.headers.get('content-type') || '',
    size: buffer.length,
  };
  return file;
}

async function localizePapers(papers = [], options = {}) {
  const assetDir = options.assetDir || ASSET_DIR;
  const manifestPath = options.manifestPath || MANIFEST_PATH;
  ensureDir(assetDir);
  const manifest = safeReadJson(manifestPath, {});
  const urls = new Set();

  for (const paper of papers) {
    for (const question of paper.questions || []) {
      extractAssetUrls(question.content_html).forEach((url) => urls.add(url));
      extractAssetUrls(question.analysis_html).forEach((url) => urls.add(url));
      for (const option of question.options || []) {
        extractAssetUrls(option.content).forEach((url) => urls.add(url));
      }
    }
  }

  const list = [...urls];
  const assetMap = new Map();
  const failed = [];

  await runPool(list, async (url, index) => {
    try {
      const file = await downloadAsset(url, manifest);
      if (file) assetMap.set(url, `${ASSET_SCHEME}${file}`);
      if ((index + 1) % 200 === 0 || index === list.length - 1) {
        console.log(`资源下载 ${index + 1}/${list.length}`);
      }
    } catch (error) {
      failed.push({ url, error: error.message });
      console.log(`资源失败: ${url} -> ${error.message}`);
    }
  }, options.concurrency || DEFAULT_CONCURRENCY);

  for (const [url, meta] of Object.entries(manifest)) {
    if (meta?.file && fs.existsSync(path.join(assetDir, meta.file)) && !assetMap.has(url)) {
      assetMap.set(url, `${ASSET_SCHEME}${meta.file}`);
    }
  }

  for (const paper of papers) {
    for (const question of paper.questions || []) {
      if (question.content_html) question.content_html = rewriteHtmlWithMap(question.content_html, assetMap);
      if (question.analysis_html) question.analysis_html = rewriteHtmlWithMap(question.analysis_html, assetMap);
      for (const option of question.options || []) {
        if (option.content) option.content = rewriteHtmlWithMap(option.content, assetMap);
      }
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return { assetCount: assetMap.size, failed };
}

module.exports = {
  ASSET_DIR,
  MANIFEST_PATH,
  extractAssetUrls,
  localizePapers,
  normalizeAssetUrl,
  rewriteHtmlWithMap,
};
