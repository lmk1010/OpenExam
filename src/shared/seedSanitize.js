/**
 * Strip third-party source markers from official seed content.
 * Exam stems are nationally unified; IDs and copy should not carry crawler/vendor tags.
 */

function mapPaperId(id) {
  const value = String(id || '').trim();
  if (value.startsWith('paper_saduck_')) {
    return value.replace(/^paper_saduck_/, 'paper_oe_');
  }
  return value;
}

function mapQuestionId(id) {
  return String(id || '').replace(/paper_saduck_/g, 'paper_oe_');
}

function sanitizeAnalysisText(text) {
  let value = String(text || '');
  if (!value.trim()) return value;

  // Drop sentences that mention 粉笔 (vendor branding).
  value = value.replace(/[^。！？\n]*粉笔[^。！？\n]*[。！？]?/g, '');

  // Neutralize vendor-style conclusion phrasing.
  value = value.replace(/故正确答案为([A-D]+)/g, '答案：$1');
  value = value.replace(/故正确答案/g, '答案');
  value = value.replace(/解析一[：:]/g, '解法一：');
  value = value.replace(/解析二[：:]/g, '解法二：');
  value = value.replace(/解析三[：:]/g, '解法三：');

  value = value.replace(/\n{3,}/g, '\n\n').trim();
  return value;
}

function sanitizeTextFields(fields = {}) {
  const next = { ...fields };
  ['content', 'analysis'].forEach((key) => {
    if (next[key]) next[key] = sanitizeAnalysisText(next[key]);
  });
  ['content_html', 'analysis_html', 'material_html'].forEach((key) => {
    if (next[key]) next[key] = sanitizeAnalysisText(next[key]);
  });
  if (next.tags) {
    next.tags = String(next.tags).replace(/saduck|fenbi|粉笔/gi, '').trim();
  }
  return next;
}

module.exports = {
  mapPaperId,
  mapQuestionId,
  sanitizeAnalysisText,
  sanitizeTextFields,
};
