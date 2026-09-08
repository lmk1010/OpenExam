/**
 * Shared question-bank quality helpers (Node + renderer-safe, no DOM).
 */

function trimText(value) {
  return String(value || '').trim();
}

function hasHtmlMedia(html = '') {
  return /<img\b/i.test(html) || /<table\b/i.test(html) || /<svg\b/i.test(html);
}

/**
 * Convert common MathML fragments to plain readable text (e.g. 3/5, x²).
 * Used when regenerating `content` from `content_html` in Node scripts.
 */
function mathMlToPlainText(html = '') {
  let value = String(html || '');
  if (!value || !/<math[\s>]/i.test(value)) return value;

  const SUPER = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', n: 'ⁿ',
  };
  const SUB = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    n: 'ₙ', i: 'ᵢ',
  };
  const mapChars = (text, map) => String(text || '').split('').map((ch) => map[ch] || ch).join('');
  const innerText = (fragment) => trimText(
    String(fragment || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
  );

  for (let i = 0; i < 8; i += 1) {
    const before = value;
    value = value.replace(/<mfrac[^>]*>([\s\S]*?)<\/mfrac>/gi, (_, inner) => {
      const parts = [];
      const tokenRe = /<(mn|mi|mo|mtext|ms|mrow)[^>]*>([\s\S]*?)<\/\1>/gi;
      let match = tokenRe.exec(inner);
      while (match && parts.length < 2) {
        parts.push(innerText(match[2]));
        match = tokenRe.exec(inner);
      }
      if (parts.length < 2) {
        const fallback = innerText(inner).replace(/\s+/g, '');
        if (fallback.length >= 2) return `${fallback[0]}/${fallback.slice(1)}`;
        return fallback;
      }
      const wrap = (part) => (/^[A-Za-z0-9.]+$/.test(part) ? part : `(${part})`);
      return `${wrap(parts[0])}/${wrap(parts[1])}`;
    });
    value = value.replace(/<msup[^>]*>([\s\S]*?)<\/msup>/gi, (_, inner) => {
      const parts = [...inner.matchAll(/<(mn|mi|mo|mtext|ms|mrow)[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => innerText(m[2]));
      return `${parts[0] || ''}${mapChars(parts[1] || '', SUPER)}`;
    });
    value = value.replace(/<msub[^>]*>([\s\S]*?)<\/msub>/gi, (_, inner) => {
      const parts = [...inner.matchAll(/<(mn|mi|mo|mtext|ms|mrow)[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => innerText(m[2]));
      return `${parts[0] || ''}${mapChars(parts[1] || '', SUB)}`;
    });
    value = value.replace(/<msqrt[^>]*>([\s\S]*?)<\/msqrt>/gi, (_, inner) => `√(${innerText(inner)})`);
    if (value === before) break;
  }

  return value
    .replace(/<\/?math[^>]*>/gi, '')
    .replace(/<\/?m[a-z]+[^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToPlainText(html = '') {
  const withMath = mathMlToPlainText(html);
  return String(withMath || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert legacy correctAnswer payloads into A/B/C… letters.
 * Rejects out-of-range indexes that previously produced characters like `}`.
 */
function convertAnswer(value) {
  const raw = trimText(value);
  if (!raw) return '';
  if (/^[A-Za-z]+$/.test(raw)) return raw.toUpperCase();

  // Pure oversized number (e.g. "28") must not become String.fromCharCode(93)
  if (/^\d+$/.test(raw) && Number(raw) > 25) return '';

  const indexes = raw
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 25);

  if (!indexes.length) return '';
  // Guard: a single token like "100" already rejected; multi-digit junk like "2","8" from "28" split is avoided by /^\d+$/ check above
  return indexes.map((index) => String.fromCharCode(65 + index)).join('');
}

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function optionKeys(options) {
  return parseOptions(options)
    .map((item) => trimText(item?.key || item?.value).toUpperCase())
    .filter(Boolean);
}

function answerLetters(answer, type = 'single') {
  const raw = trimText(answer).toUpperCase();
  if (!raw) return [];
  if (type === 'multiple' || (/^[A-Z]+$/.test(raw) && raw.length > 1)) {
    return [...new Set(raw.split(''))];
  }
  return [raw];
}

function isAnswerCompatible(answer, options, type = 'single') {
  const keys = new Set(optionKeys(options));
  if (!keys.size) return false;
  const letters = answerLetters(answer, type);
  if (!letters.length) return false;
  return letters.every((letter) => /^[A-Z]$/.test(letter) && keys.has(letter));
}

/**
 * Whether a question (esp. 资料分析) has enough material to be practiced.
 */
function hasUsableMaterial(question = {}) {
  const materialHtml = trimText(question.material_html || question.materialHtml);
  if (materialHtml) return true;
  const contentHtml = trimText(question.content_html || question.contentHtml);
  if (hasHtmlMedia(contentHtml)) return true;
  const content = trimText(question.content);
  if (content.length >= 180 && /(根据|材料|资料|如下表|如下图|统计表)/.test(content)) return true;
  return false;
}

function isPracticeableQuestion(question = {}) {
  const options = parseOptions(question.options);
  if (!options.length) return false;
  if (!isAnswerCompatible(question.answer, options, question.type)) return false;
  if (String(question.quality_flag || '').includes('exclude')) return false;
  if (question.category === 'ziliao' && !hasUsableMaterial(question)) return false;
  return true;
}

function extractMaterialFields(raw = {}) {
  const materialHtml = trimText(
    raw.material
    || raw.materialHtml
    || raw.material_html
    || raw.passage
    || raw.stem
    || raw.groupContent
    || raw.group_content
    || raw.description
    || ''
  );
  // Avoid treating the question title itself as material when APIs reuse `content`
  const groupId = trimText(
    raw.groupId
    || raw.group_id
    || raw.materialId
    || raw.material_id
    || raw.pid
    || raw.parentId
    || raw.parent_id
    || ''
  ) || null;
  return {
    material_html: materialHtml || null,
    material_group_id: groupId,
  };
}

module.exports = {
  answerLetters,
  convertAnswer,
  extractMaterialFields,
  hasUsableMaterial,
  htmlToPlainText,
  isAnswerCompatible,
  isPracticeableQuestion,
  mathMlToPlainText,
  optionKeys,
  parseOptions,
};
