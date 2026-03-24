const { app, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');

function buildBackupFilename() {
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  return `openexam-backup-${stamp}.json`;
}

async function saveBackupFile(parentWindow, payload) {
  const { canceled, filePath } = await dialog.showSaveDialog(parentWindow || null, {
    title: '导出 OpenExam 备份',
    defaultPath: path.join(app.getPath('downloads'), buildBackupFilename()),
    filters: [{ name: 'OpenExam Backup', extensions: ['json'] }],
  });

  if (canceled || !filePath) return { canceled: true };

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { canceled: false, filePath };
}

async function openBackupFile(parentWindow) {
  const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow || null, {
    title: '导入 OpenExam 备份',
    filters: [{ name: 'OpenExam Backup', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (canceled || !filePaths?.[0]) return { canceled: true };

  const filePath = filePaths[0];
  const content = await fs.readFile(filePath, 'utf8');
  let payload = null;

  try {
    payload = JSON.parse(content);
  } catch (error) {
    throw new Error('备份文件格式无效，无法解析 JSON');
  }

  return { canceled: false, filePath, payload };
}

module.exports = {
  saveBackupFile,
  openBackupFile,
};
