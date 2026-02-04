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
    win.webContents.openDevTools({ mode: "detach" });

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

app.on("window-all-closed", () => {
  database.closeDatabase();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
