const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openexam", {
  setTheme: (theme) => {
    if (theme === "dark" || theme === "light") {
      document.documentElement.dataset.theme = theme;
    }
  },

  // 数据库 API
  db: {
    getPapers: () => ipcRenderer.invoke("db:getPapers"),
    getQuestions: (paperId) => ipcRenderer.invoke("db:getQuestions", paperId),
    savePracticeRecord: (record) => ipcRenderer.invoke("db:savePracticeRecord", record),
    getPracticeRecords: () => ipcRenderer.invoke("db:getPracticeRecords"),
    addWrongQuestion: (data) => ipcRenderer.invoke("db:addWrongQuestion", data),
    getWrongQuestions: () => ipcRenderer.invoke("db:getWrongQuestions"),
    getCategoryStats: () => ipcRenderer.invoke("db:getCategoryStats"),
    getSubCategoryStats: (category) => ipcRenderer.invoke("db:getSubCategoryStats", category),
    getPracticeStats: () => ipcRenderer.invoke("db:getPracticeStats"),
    importPaper: (paperData, questions) => ipcRenderer.invoke("db:importPaper", { paperData, questions }),
    getImportedPapers: () => ipcRenderer.invoke("db:getImportedPapers"),
    getQuestionsByCategory: (category, subCategory, limit, shuffle) =>
      ipcRenderer.invoke("db:getQuestionsByCategory", { category, subCategory, limit, shuffle }),
    getDailyStats: (days) => ipcRenderer.invoke("db:getDailyStats", days),
    getStreakDays: () => ipcRenderer.invoke("db:getStreakDays"),
    getTodayStats: () => ipcRenderer.invoke("db:getTodayStats"),
    getHeatmapData: (days) => ipcRenderer.invoke("db:getHeatmapData", days),
    getGrowthData: () => ipcRenderer.invoke("db:getGrowthData"),
  },

  // AI API
  ai: {
    testConnection: (settings) => ipcRenderer.invoke("ai:testConnection", settings),
    recognizeQuestions: (settings, imageBase64, mimeType) =>
      ipcRenderer.invoke("ai:recognizeQuestions", { settings, imageBase64, mimeType }),
    chat: (settings, messages) =>
      ipcRenderer.invoke("ai:chat", { settings, messages }),
    generatePaper: (settings, config) =>
      ipcRenderer.invoke("ai:generatePaper", { settings, config }),
  }
});
