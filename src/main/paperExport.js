const { BrowserWindow, app, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFilename(value = 'openexam-paper') {
  return String(value || 'openexam-paper')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'openexam-paper';
}

function normalizeOptions(options = []) {
  if (!Array.isArray(options)) return [];
  return options.map((option, index) => ({
    key: String(option?.key || String.fromCharCode(65 + index)).toUpperCase(),
    content: String(option?.content || ''),
  }));
}

function normalizePayload(payload = {}) {
  const paper = payload.paper && typeof payload.paper === 'object' ? payload.paper : {};
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (!questions.length) throw new Error('试卷题目不能为空');

  return {
    paper: {
      title: String(paper.title || 'OpenExam 试卷'),
      year: paper.year || new Date().getFullYear(),
      duration: Number(paper.duration || 120),
      type: String(paper.type || 'custom'),
      province: String(paper.province || ''),
      subject: String(paper.subject || '综合'),
      difficulty: Number(paper.difficulty || 3),
      question_count: Number(paper.question_count || questions.length),
    },
    questions: questions.map((question, index) => ({
      id: question.id || `q_${index + 1}`,
      order_num: Number(question.order_num || index + 1),
      content: String(question.content || '').trim(),
      options: normalizeOptions(question.options),
      answer: String(question.answer || '').trim(),
      analysis: String(question.analysis || '').trim(),
      category: String(question.category || ''),
      type: String(question.type || 'single'),
    })),
  };
}

function renderQuestion(question, index) {
  return `
    <article class="question-card">
      <div class="question-top">
        <span class="question-index">${index + 1}</span>
        <span class="question-type">${escapeHtml(question.category || '综合')}</span>
      </div>
      <div class="question-content">${escapeHtml(question.content).replace(/\n/g, '<br/>')}</div>
      <div class="option-list">
        ${question.options.map((option) => `
          <div class="option-item">
            <span class="option-key">${escapeHtml(option.key)}</span>
            <span>${escapeHtml(option.content)}</span>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderAnswer(question, index) {
  return `
    <article class="answer-card">
      <div class="answer-head">
        <span>第 ${index + 1} 题</span>
        <span>答案：${escapeHtml(question.answer || '-')}</span>
      </div>
      ${question.analysis ? `<div class="answer-analysis">${escapeHtml(question.analysis).replace(/\n/g, '<br/>')}</div>` : ''}
    </article>
  `;
}

function buildPaperHtml(payload) {
  const { paper, questions } = normalizePayload(payload);
  const typeLabel = paper.type === 'national' ? '国考' : (paper.province || '自定义');
  const subjectLabel = paper.subject === 'xingce' ? '行测' : paper.subject;

  return `<!doctype html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(paper.title)}</title>
    <style>
      @page { size: A4; margin: 16mm 14mm 18mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #1f2937; font: 14px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      .cover { padding: 8mm 2mm 4mm; }
      .hero { padding: 18mm 14mm; border-radius: 24px; color: #fff; background: linear-gradient(135deg,#6d5efb,#4f46e5); }
      .hero h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.3; }
      .hero p { margin: 0; opacity: .88; font-size: 14px; }
      .meta-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-top: 18px; }
      .meta-card { padding: 12px 14px; border-radius: 16px; background: #fff; border: 1px solid #e5e7eb; }
      .meta-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
      .meta-value { font-size: 16px; font-weight: 700; color: #111827; }
      .section-title { margin: 12mm 0 6mm; font-size: 16px; font-weight: 800; color: #4f46e5; }
      .question-card, .answer-card { padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 18px; margin-bottom: 10px; break-inside: avoid; }
      .question-top, .answer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
      .question-index { width: 28px; height: 28px; border-radius: 999px; display: inline-grid; place-items: center; background: rgba(109,94,251,.1); color: #5b52d6; font-weight: 800; }
      .question-type { padding: 4px 10px; border-radius: 999px; background: #f5f3ff; color: #6d5efb; font-size: 11px; font-weight: 700; }
      .question-content { font-size: 14px; font-weight: 600; color: #111827; }
      .option-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
      .option-item { display: flex; gap: 8px; padding: 8px 10px; border-radius: 12px; background: #f8fafc; border: 1px solid #e5e7eb; }
      .option-key { font-weight: 800; color: #4f46e5; }
      .answer-head { font-weight: 700; color: #111827; }
      .answer-analysis { padding-top: 10px; border-top: 1px dashed #d1d5db; color: #4b5563; }
      .footer-note { margin-top: 10mm; color: #9ca3af; font-size: 11px; text-align: center; }
      .page-break { page-break-before: always; }
    </style>
  </head>
  <body>
    <section class="cover">
      <div class="hero">
        <h1>${escapeHtml(paper.title)}</h1>
        <p>OpenExam 导出的可打印试卷，可直接归档或发送给同学 / 学员。</p>
      </div>
      <div class="meta-grid">
        <div class="meta-card"><div class="meta-label">题量</div><div class="meta-value">${questions.length} 题</div></div>
        <div class="meta-card"><div class="meta-label">建议时长</div><div class="meta-value">${paper.duration} 分钟</div></div>
        <div class="meta-card"><div class="meta-label">试卷类型</div><div class="meta-value">${escapeHtml(typeLabel)}</div></div>
        <div class="meta-card"><div class="meta-label">科目</div><div class="meta-value">${escapeHtml(subjectLabel)}</div></div>
      </div>
      <div class="section-title">试题正文</div>
      ${questions.map(renderQuestion).join('')}
      <div class="footer-note">生成时间 ${escapeHtml(new Date().toLocaleString())} · OpenExam</div>
    </section>
    <section class="page-break">
      <div class="section-title">参考答案与解析</div>
      ${questions.map(renderAnswer).join('')}
    </section>
  </body>
  </html>`;
}

async function exportPaperPdf(parentWindow, payload) {
  const normalized = normalizePayload(payload);
  const defaultPath = path.join(app.getPath('downloads'), `${safeFilename(normalized.paper.title)}.pdf`);
  const { canceled, filePath } = await dialog.showSaveDialog(parentWindow || null, {
    title: '导出试卷 PDF',
    defaultPath,
    filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { success: false, canceled: true };

  const exportWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await exportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildPaperHtml(normalized))}`);
    const pdf = await exportWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    await fs.writeFile(filePath, pdf);
    return { success: true, filePath, questionCount: normalized.questions.length };
  } finally {
    if (!exportWindow.isDestroyed()) exportWindow.close();
  }
}

module.exports = { buildPaperHtml, exportPaperPdf };
