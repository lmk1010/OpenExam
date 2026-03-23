export function buildPaperShareText({ paper = {}, questions = [] } = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const title = paper.title || 'OpenExam 试卷';
  const typeLabel = paper.type === 'national' ? '国考' : (paper.province || '自定义');
  const duration = paper.duration || 120;
  const lines = [
    `【${title}】`,
    `题量：${list.length} 题`,
    `建议时长：${duration} 分钟`,
    `类型：${typeLabel}`,
    '',
    '题目预览：',
    ...list.slice(0, 3).map((question, index) => `${index + 1}. ${(question.content || '').replace(/\s+/g, ' ').slice(0, 54)}${(question.content || '').length > 54 ? '…' : ''}`),
    '',
    '来自 OpenExam，可导出 PDF 继续练习。',
  ];
  return lines.join('\n');
}

export async function copyText(text) {
  const value = String(text || '');
  if (!value) return false;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!success) throw new Error('复制失败');
  return true;
}
