const { app, BrowserWindow, nativeTheme, ipcMain } = require("electron");
const path = require("path");
const database = require("./src/main/database.js");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 680,
    minWidth: 1000,
    minHeight: 580,
    backgroundColor: "#ffffff",
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 22 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.once("ready-to-show", () => win.show());

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
    if (['1', 'true', 'yes'].includes(String(process.env.OPENEXAM_DEVTOOLS || '').toLowerCase())) {
      win.webContents.openDevTools({ mode: "detach" });
    }

    // Forward renderer console errors to terminal
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level >= 2) { // warnings and errors
        console.error(`[Renderer] ${message}`);
      }
    });

    const { watch } = require("fs");
    let relaunching = false;
    const restart = () => {
      if (relaunching) return;
      relaunching = true;
      app.relaunch();
      app.exit(0);
    };
    watch(path.join(__dirname, "main.js"), { persistent: false }, restart);
    watch(path.join(__dirname, "preload.js"), { persistent: false }, restart);
    return;
  }

  win.loadFile(path.join(__dirname, "dist", "index.html"));
};

app.whenReady().then(() => {
  nativeTheme.themeSource = "light";

  // 初始化数据库
  database.initDatabase();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC 处理器 - 数据库操作
ipcMain.handle("db:getPapers", () => {
  return database.getPapers();
});

ipcMain.handle("db:getQuestions", (event, paperId) => {
  return database.getQuestionsByPaperId(paperId);
});

ipcMain.handle("db:savePracticeRecord", (event, record) => {
  database.savePracticeRecord(record);
  return true;
});

ipcMain.handle("db:getPracticeRecords", () => {
  return database.getPracticeRecords();
});

ipcMain.handle("db:addWrongQuestion", (event, { questionId, paperId, userAnswer, correctAnswer }) => {
  database.addWrongQuestion(questionId, paperId, userAnswer, correctAnswer);
  return true;
});

ipcMain.handle("db:getWrongQuestions", () => {
  return database.getWrongQuestions();
});

ipcMain.handle("db:getCategoryStats", () => {
  return database.getCategoryStats();
});

ipcMain.handle("db:getSubCategoryStats", (event, category) => {
  return database.getSubCategoryStats(category);
});

ipcMain.handle("db:getPracticeStats", () => {
  return database.getPracticeStats();
});

ipcMain.handle("db:importPaper", (event, { paperData, questions }) => {
  return database.importPaper(paperData, questions);
});

ipcMain.handle("db:getImportedPapers", () => {
  return database.getImportedPapers();
});

ipcMain.handle("db:getQuestionsByCategory", (event, { category, subCategory, limit, shuffle }) => {
  return database.getQuestionsByCategory(category, subCategory, limit, shuffle);
});

ipcMain.handle("db:getDailyStats", (event, days) => {
  return database.getDailyStats(days || 7);
});

ipcMain.handle("db:getStreakDays", () => {
  return database.getStreakDays();
});

ipcMain.handle("db:getTodayStats", () => {
  return database.getTodayStats();
});

ipcMain.handle("db:getHeatmapData", (event, days) => {
  return database.getHeatmapData(days || 90);
});

ipcMain.handle("db:getGrowthData", () => {
  return database.getGrowthData();
});

// AI 相关 IPC 处理器
const aiService = require("./src/main/ai/index.js");

ipcMain.handle("ai:testConnection", async (event, settings) => {
  return aiService.testConnection(settings);
});

ipcMain.handle("ai:recognizeQuestions", async (event, { settings, imageBase64, mimeType }) => {
  return aiService.recognizeQuestions(settings, imageBase64, mimeType);
});

ipcMain.handle("ai:chat", async (event, { settings, messages }) => {
  return aiService.chat(settings, messages);
});

ipcMain.handle("ai:generatePaper", async (event, { settings, config }) => {
  return aiService.generatePaper(settings, config);
});

app.on("window-all-closed", () => {
  database.closeDatabase();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
