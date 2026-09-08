#!/usr/bin/env node
/**
 * Migrate bundled seed: paper_saduck_* -> paper_oe_*, strip vendor copy markers, rebuild .gz
 *
 * Usage:
 *   npm run sanitize:seed
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');
const {
  mapPaperId,
  sanitizeTextFields,
} = require('../src/shared/seedSanitize');

const ROOT = path.join(__dirname, '..');
const SEED_GZ = path.join(ROOT, 'data/openexam.seed.db.gz');
const SEED_DB = path.join(ROOT, 'data/openexam.seed.db');
const MANIFEST_PATH = path.join(ROOT, 'data/question-assets-manifest.json');

function openSeedDb() {
  if (fs.existsSync(SEED_GZ)) {
    fs.writeFileSync(SEED_DB, zlib.gunzipSync(fs.readFileSync(SEED_GZ)));
  }
  if (!fs.existsSync(SEED_DB)) {
    throw new Error(`缺少种子库: ${SEED_DB} 或 ${SEED_GZ}`);
  }
  return new Database(SEED_DB);
}

function rewriteManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { entries: 0 };
  const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const next = {};
  Object.entries(raw).forEach(([key, meta]) => {
    const file = meta?.file || key;
    next[file] = {
      file,
      contentType: meta.contentType || null,
      size: meta.size || null,
    };
  });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return { entries: Object.keys(next).length };
}

function sanitizeDatabase(db) {
  const stats = {
    papersRenamed: 0,
    questionsRenamed: 0,
    questionsTextCleaned: 0,
  };

  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  const papers = db.prepare("SELECT id FROM papers WHERE id LIKE 'paper_saduck_%'").all();
  const renameQuestionIds = db.prepare(`
    UPDATE questions SET id = ?, paper_id = ? WHERE id = ?
  `);
  const renamePaper = db.prepare('UPDATE papers SET id = ? WHERE id = ?');
  const loadQuestions = db.prepare(`
    SELECT id, order_num FROM questions WHERE paper_id = ?
  `);

  db.pragma('foreign_keys = OFF');

  db.transaction(() => {
    papers.forEach((row) => {
      const nextPaperId = mapPaperId(row.id);
      if (nextPaperId === row.id) return;
      loadQuestions.all(row.id).forEach((question) => {
        const nextQuestionId = `${nextPaperId}_q${question.order_num}`;
        renameQuestionIds.run(nextQuestionId, nextPaperId, question.id);
        stats.questionsRenamed += 1;
      });
      renamePaper.run(nextPaperId, row.id);
      stats.papersRenamed += 1;
    });

    const questionRows = db.prepare(`
      SELECT id, content, content_html, material_html, analysis, analysis_html, tags
      FROM questions
    `).all();
    const updateQuestionText = db.prepare(`
      UPDATE questions
      SET content = ?, content_html = ?, material_html = ?, analysis = ?, analysis_html = ?, tags = ?
      WHERE id = ?
    `);

    questionRows.forEach((row) => {
      const cleaned = sanitizeTextFields(row);
      const changed = ['content', 'content_html', 'material_html', 'analysis', 'analysis_html', 'tags']
        .some((key) => String(cleaned[key] || '') !== String(row[key] || ''));
      if (!changed) return;
      updateQuestionText.run(
        cleaned.content,
        cleaned.content_html,
        cleaned.material_html,
        cleaned.analysis,
        cleaned.analysis_html,
        cleaned.tags || null,
        row.id
      );
      stats.questionsTextCleaned += 1;
    });

    db.prepare(`
      INSERT OR REPLACE INTO meta (key, value) VALUES ('seed_sanitized', ?)
    `).run(new Date().toISOString());
  })();

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = DELETE');
  db.exec('VACUUM');
  return stats;
}

function writeGzip() {
  const compressed = zlib.gzipSync(fs.readFileSync(SEED_DB), { level: 9 });
  fs.writeFileSync(SEED_GZ, compressed);
  return SEED_GZ;
}

function main() {
  const db = openSeedDb();
  let stats;
  try {
    stats = sanitizeDatabase(db);
  } finally {
    db.close();
  }
  const gzipPath = writeGzip();
  const manifest = rewriteManifest();
  console.log('种子库清理完成');
  console.log(`  试卷 ID 迁移: ${stats.papersRenamed}`);
  console.log(`  题目 ID 迁移: ${stats.questionsRenamed}`);
  console.log(`  文案清理: ${stats.questionsTextCleaned} 题`);
  console.log(`  题图 manifest 重写: ${manifest.entries} 条`);
  console.log(`  输出: ${gzipPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { sanitizeDatabase, rewriteManifest, openSeedDb, writeGzip };
