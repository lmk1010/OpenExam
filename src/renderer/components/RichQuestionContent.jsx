import React, { useMemo } from 'react';

const HTML_RE = /<[^>]+>/;
const ALLOWED_TAGS = new Set(['p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'br', 'img', 'sup', 'sub', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'colgroup', 'col', 'ul', 'ol', 'li']);
const IMG_ATTRS = new Set(['src', 'alt', 'width', 'height', 'flag']);
const TABLE_ATTRS = new Set(['colspan', 'rowspan', 'width', 'height', 'align']);

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
  if (url.startsWith('/')) return `https://saduck.top${url}`;
  return url;
}

function sanitizeHtml(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (!HTML_RE.test(input)) return escapeHtml(input).replace(/\n/g, '<br/>');
  if (typeof DOMParser === 'undefined') return escapeHtml(input).replace(/\n/g, '<br/>');

  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html');
  const root = doc.body.firstElementChild || doc.body;

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

export default function RichQuestionContent({ value = '', className = '', style = undefined }) {
  const html = useMemo(() => sanitizeHtml(value), [value]);
  if (!html) return null;
  return <div className={`rich-question-content ${className}`.trim()} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
