/**
 * Patch question rows in an open better-sqlite3 database.
 */
const {
  convertAnswer,
  htmlToPlainText,
  isAnswerCompatible,
  hasUsableMaterial,
  parseOptions,
} = require('./questionQuality');

const KNOWN_ANSWER_FIXES = {
  paper_oe_19501_q100: 'C',
  paper_oe_19486_q100: 'C',
  paper_oe_19488_q91: 'C',
  paper_oe_19465_q25: 'B',
};

const KNOWN_OPTION_FIXES = {
  paper_oe_19382_q128: [
    { key: 'A', content: '33%' },
    { key: 'B', content: '55%' },
    { key: 'C', content: '77%' },
    { key: 'D', content: '99%' },
  ],
  paper_oe_19410_q129: [
    { key: 'A', content: 'V₃<V₁<V₂' },
    { key: 'B', content: 'V₂<V₃<V₁' },
    { key: 'C', content: 'V₃<V₂<V₁' },
    { key: 'D', content: 'V₁<V₃<V₂' },
  ],
  paper_oe_19411_q124: [
    { key: 'A', content: 'V₃<V₁<V₂' },
    { key: 'B', content: 'V₂<V₃<V₁' },
    { key: 'C', content: 'V₃<V₂<V₁' },
    { key: 'D', content: 'V₁<V₃<V₂' },
  ],
};

function isTrueFalseOptions(options = []) {
  if (options.length !== 2) return false;
  return options.every((item) => {
    const text = String(item?.content || '').replace(/<[^>]+>/g, '').trim();
    return /^(正确|错误|对|错|是|否|true|false)$/i.test(text);
  });
}

function ensureQuestionQualityColumns(db) {
  const cols = new Set(db.pragma('table_info(questions)').map((c) => c.name));
  [
    ['material_html', 'TEXT'],
    ['material_group_id', 'TEXT'],
    ['quality_flag', 'TEXT'],
  ].forEach(([name, def]) => {
    if (!cols.has(name)) db.prepare(`ALTER TABLE questions ADD COLUMN ${name} ${def}`).run();
  });
}

function placeholderOptions() {
  return ['A', 'B', 'C', 'D'].map((key) => ({ key, content: key }));
}

function patchQuestionDatabase(db) {
  ensureQuestionQualityColumns(db);
  const rows = db.prepare(`
    SELECT id, type, category, content, content_html, options, answer, analysis, quality_flag
    FROM questions
  `).all();
  const update = db.prepare(`
    UPDATE questions
    SET content = ?, options = ?, answer = ?, quality_flag = ?
    WHERE id = ?
  `);

  const stats = {
    total: rows.length,
    answerFixed: 0,
    optionsFixed: 0,
    contentMathFixed: 0,
    flagged: 0,
  };

  const tx = db.transaction(() => {
    rows.forEach((row) => {
      let content = String(row.content || '');
      let options = parseOptions(row.options);
      let answer = String(row.answer || '').trim().toUpperCase();
      const flags = new Set(
        String(row.quality_flag || '')
          .split('|')
          .map((item) => item.trim())
          .filter(Boolean)
      );

      if (KNOWN_OPTION_FIXES[row.id]) {
        options = KNOWN_OPTION_FIXES[row.id];
        stats.optionsFixed += 1;
        flags.delete('bad_options');
      }

      if (KNOWN_ANSWER_FIXES[row.id]) {
        answer = KNOWN_ANSWER_FIXES[row.id];
        stats.answerFixed += 1;
        flags.delete('bad_answer');
      } else if (!/^[A-Z]+$/.test(answer)) {
        const converted = convertAnswer(row.answer);
        if (converted) {
          answer = converted;
          stats.answerFixed += 1;
        } else {
          flags.add('bad_answer');
          flags.add('exclude');
        }
      }

      if (!options.length) {
        if (/<img\b/i.test(row.content_html || '') || /问号处|图形/.test(content)) {
          options = placeholderOptions();
          stats.optionsFixed += 1;
          flags.add('options_placeholder');
        } else {
          flags.add('bad_options');
          flags.add('exclude');
        }
      } else if (options.length < 4 && row.type !== 'multiple' && !isTrueFalseOptions(options)) {
        flags.add('bad_options');
      }

      if (!isAnswerCompatible(answer, options, row.type)) {
        flags.add('bad_answer');
        flags.add('exclude');
      } else {
        flags.delete('bad_answer');
        if (![...flags].some((flag) => flag === 'bad_options' || flag === 'missing_material')) {
          flags.delete('exclude');
        }
      }

      if (row.content_html && /<math[\s>]/i.test(row.content_html)) {
        const nextContent = htmlToPlainText(row.content_html);
        if (nextContent && nextContent !== content) {
          content = nextContent;
          stats.contentMathFixed += 1;
        }
      }

      if (row.category === 'ziliao' && !hasUsableMaterial(row)) {
        flags.add('missing_material');
      } else {
        flags.delete('missing_material');
      }

      // Missing material alone should not hard-exclude non-practice paths, but practice filter uses isPracticeableQuestion.
      if (flags.has('bad_answer') || flags.has('bad_options')) flags.add('exclude');

      const qualityFlag = [...flags].sort().join('|') || null;
      if (qualityFlag) stats.flagged += 1;

      update.run(
        content || row.content,
        JSON.stringify(options),
        answer || row.answer,
        qualityFlag,
        row.id
      );
    });
  });

  tx();
  return stats;
}

module.exports = {
  ensureQuestionQualityColumns,
  patchQuestionDatabase,
  KNOWN_ANSWER_FIXES,
};
