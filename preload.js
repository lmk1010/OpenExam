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
    getWrongQuestions: (options) => ipcRenderer.invoke("db:getWrongQuestions", options),
    reviewWrongQuestion: (input) => ipcRenderer.invoke("db:reviewWrongQuestion", input),
    getCategoryStats: () => ipcRenderer.invoke("db:getCategoryStats"),
    getSubCategoryStats: (category) => ipcRenderer.invoke("db:getSubCategoryStats", category),
    getPracticeStats: () => ipcRenderer.invoke("db:getPracticeStats"),
    importPaper: (paperData, questions) => ipcRenderer.invoke("db:importPaper", { paperData, questions }),
    saveAIPaper: (paperData, questions) => ipcRenderer.invoke("db:saveAIPaper", { paperData, questions }),
    getImportedPapers: () => ipcRenderer.invoke("db:getImportedPapers"),
    getSavedAIPapers: () => ipcRenderer.invoke("db:getSavedAIPapers"),
    renameSavedPaper: (paperId, title) => ipcRenderer.invoke("db:renameSavedPaper", { paperId, title }),
    deleteSavedPaper: (paperId) => ipcRenderer.invoke("db:deleteSavedPaper", { paperId }),
    getQuestionsByCategory: (category, subCategory, limit, shuffle) =>
      ipcRenderer.invoke("db:getQuestionsByCategory", { category, subCategory, limit, shuffle }),
    getDailyStats: (days) => ipcRenderer.invoke("db:getDailyStats", days),
    getStreakDays: () => ipcRenderer.invoke("db:getStreakDays"),
    getTodayStats: () => ipcRenderer.invoke("db:getTodayStats"),
    getHeatmapData: (days) => ipcRenderer.invoke("db:getHeatmapData", days),
    getGrowthData: () => ipcRenderer.invoke("db:getGrowthData"),
    getAISettings: () => ipcRenderer.invoke("db:getAISettings"),
    saveAISettings: (settings) => ipcRenderer.invoke("db:saveAISettings", settings),
    getAIConnectionState: () => ipcRenderer.invoke("db:getAIConnectionState"),
    saveAIConnectionState: (state) => ipcRenderer.invoke("db:saveAIConnectionState", state),
    createAIChatSession: (input) => ipcRenderer.invoke("db:createAIChatSession", input),
    getAIChatSessions: (limit) => ipcRenderer.invoke("db:getAIChatSessions", limit),
    getAIChatMessages: (sessionId, limit) => ipcRenderer.invoke("db:getAIChatMessages", sessionId, limit),
    addAIChatMessage: (input) => ipcRenderer.invoke("db:addAIChatMessage", input),
    renameAIChatSession: (sessionId, title) => ipcRenderer.invoke("db:renameAIChatSession", sessionId, title),
    deleteAIChatSession: (sessionId) => ipcRenderer.invoke("db:deleteAIChatSession", sessionId),
    exportAllData: () => ipcRenderer.invoke("db:exportAllData"),
    clearAllData: () => ipcRenderer.invoke("db:clearAllData"),
  },

  paper: {
    exportPdf: (payload) => ipcRenderer.invoke("paper:exportPdf", payload),
  },

  // AI API
  ai: {
    testConnection: (settings) => ipcRenderer.invoke("ai:testConnection", settings),
    recognizeQuestions: (settings, imageBase64, mimeType) =>
      ipcRenderer.invoke("ai:recognizeQuestions", { settings, imageBase64, mimeType }),
    chat: (settings, messages) =>
      ipcRenderer.invoke("ai:chat", { settings, messages }),
    chatStreamStart: (settings, messages, requestId) =>
      ipcRenderer.invoke("ai:chatStreamStart", { settings, messages, requestId }),
    chatStreamCancel: (requestId) =>
      ipcRenderer.invoke("ai:chatStreamCancel", requestId),
    onChatStreamEvent: (handler) => {
      if (typeof handler !== "function") return () => {};
      const listener = (_event, payload) => handler(payload);
      ipcRenderer.on("ai:chatStream:event", listener);
      return () => ipcRenderer.removeListener("ai:chatStream:event", listener);
    },
    generatePaper: (settings, config) =>
      ipcRenderer.invoke("ai:generatePaper", { settings, config }),
  }
});
