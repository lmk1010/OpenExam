import React, { useMemo } from 'react';

const HTML_RE = /<[^>]+>/;
const ALLOWED_TAGS = new Set(['p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'br', 'img', 'sup', 'sub', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'colgroup', 'col', 'ul', 'ol', 'li']);
const IMG_ATTRS = new Set(['src', 'alt', 'width', 'height', 'flag']);
const TABLE_ATTRS = new Set(['colspan', 'rowspan', 'width', 'height', 'align']);
const MATH_TAGS = new Set([
  'math', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mtext', 'mspace',
  'mfrac', 'msup', 'msub', 'msubsup', 'mroot', 'msqrt',
  'mstyle', 'mpadded', 'mphantom', 'menclose', 'semantics', 'annotation',
]);
const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ',
};
const SUBSCRIPT_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'i': 'ᵢ', 'n': 'ₙ',
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return '';
  return url;
}

function mapChars(value, map) {
  return String(value || '')
    .split('')
    .map((ch) => map[ch] || ch)
    .join('');
}

function mathChildren(node) {
  return Array.from(node.childNodes || []).filter((child) => {
    if (child.nodeType === 3) return String(child.textContent || '').trim().length > 0;
    if (child.nodeType !== 1) return false;
    const tag = child.tagName.toLowerCase();
    if (tag === 'annotation') return false;
    return true;
  });
}

function serializeMathNode(node) {
  if (!node) return '';
  if (node.nodeType === 3) return String(node.textContent || '').replace(/\s+/g, ' ');
  if (node.nodeType !== 1) return '';

  const tag = node.tagName.toLowerCase();
  const kids = mathChildren(node);

  if (tag === 'annotation') return '';
  if (tag === 'mfrac') {
    const num = serializeMathNode(kids[0]).trim() || '?';
    const den = serializeMathNode(kids[1]).trim() || '?';
    const wrap = (part) => (/^[A-Za-z0-9.]+$/.test(part) ? part : `(${part})`);
    return `${wrap(num)}/${wrap(den)}`;
  }
  if (tag === 'msup') {
    const base = serializeMathNode(kids[0]).trim();
    const exp = serializeMathNode(kids[1]).trim();
    return `${base}${mapChars(exp, SUPERSCRIPT_MAP)}`;
  }
  if (tag === 'msub') {
    const base = serializeMathNode(kids[0]).trim();
    const sub = serializeMathNode(kids[1]).trim();
    return `${base}${mapChars(sub, SUBSCRIPT_MAP)}`;
  }
  if (tag === 'msubsup') {
    const base = serializeMathNode(kids[0]).trim();
    const sub = serializeMathNode(kids[1]).trim();
    const exp = serializeMathNode(kids[2]).trim();
    return `${base}${mapChars(sub, SUBSCRIPT_MAP)}${mapChars(exp, SUPERSCRIPT_MAP)}`;
  }
  if (tag === 'msqrt') {
    return `√(${serializeMathNode(kids[0]).trim()})`;
  }
  if (tag === 'mroot') {
    const base = serializeMathNode(kids[0]).trim();
    const idx = serializeMathNode(kids[1]).trim();
    return `${mapChars(idx, SUPERSCRIPT_MAP)}√(${base})`;
  }
  if (tag === 'mo' || tag === 'mi' || tag === 'mn' || tag === 'ms' || tag === 'mtext') {
    return String(node.textContent || '').replace(/\s+/g, ' ');
  }

  return kids.map((child) => serializeMathNode(child)).join('');
}

function convertMathMl(root) {
  const mathNodes = Array.from(root.querySelectorAll('math'));
  mathNodes.forEach((mathNode) => {
    const plain = serializeMathNode(mathNode).replace(/\s+/g, ' ').trim();
    const span = mathNode.ownerDocument.createElement('span');
    span.setAttribute('class', 'math-plain');
    span.textContent = plain || '';
    mathNode.replaceWith(span);
  });

  // Safety: unwrap any leftover MathML tags that escaped conversion.
  Array.from(root.querySelectorAll('*')).forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (!MATH_TAGS.has(tag)) return;
    const span = el.ownerDocument.createElement('span');
    span.setAttribute('class', 'math-plain');
    span.textContent = String(el.textContent || '').replace(/\s+/g, ' ').trim();
    el.replaceWith(span);
  });
}

function sanitizeHtml(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (!HTML_RE.test(input)) return escapeHtml(input).replace(/\n/g, '<br/>');
  if (typeof DOMParser === 'undefined') return escapeHtml(input).replace(/\n/g, '<br/>');

  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html');
  const root = doc.body.firstElementChild || doc.body;
  convertMathMl(root);

  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== 1) return;
      walk(child);
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (tag === 'img' && IMG_ATTRS.has(name)) return;
        if (tag === 'span' && name === 'class' && attr.value === 'math-plain') return;
        if (['td', 'th'].includes(tag) && TABLE_ATTRS.has(name)) return;
        child.removeAttribute(attr.name);
      });
      if (tag === 'img') {
        const src = normalizeUrl(child.getAttribute('src'));
        if (!src) {
          child.remove();
          return;
        }
        child.setAttribute('src', src);
        child.setAttribute('loading', 'lazy');
      }
    });
  };

  walk(root);
  return root.innerHTML.trim();
}

export function mathMlToPlainText(value = '') {
  const input = String(value || '');
  if (!input || !/<math[\s>]/i.test(input) || typeof DOMParser === 'undefined') {
    return input;
  }
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html');
  const root = doc.body.firstElementChild || doc.body;
  convertMathMl(root);
  return root.textContent || '';
}

export default function RichQuestionContent({ value = '', className = '', style = undefined }) {
  const html = useMemo(() => sanitizeHtml(value), [value]);
  if (!html) return null;
  return <div className={`rich-question-content ${className}`.trim()} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
