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
    getQuestionsByIds: (ids) => ipcRenderer.invoke("db:getQuestionsByIds", ids),
    savePracticeRecord: (record) => ipcRenderer.invoke("db:savePracticeRecord", record),
    getPracticeRecords: () => ipcRenderer.invoke("db:getPracticeRecords"),
    addWrongQuestion: (data) => ipcRenderer.invoke("db:addWrongQuestion", data),
    getWrongQuestions: (options) => ipcRenderer.invoke("db:getWrongQuestions", options),
    reviewWrongQuestion: (input) => ipcRenderer.invoke("db:reviewWrongQuestion", input),
    getCategoryStats: () => ipcRenderer.invoke("db:getCategoryStats"),
    getSmartRecommend: (options) => ipcRenderer.invoke("db:getSmartRecommend", options),
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
    getCategoryMaterialStats: (category) =>
      ipcRenderer.invoke("db:getCategoryMaterialStats", category || "ziliao"),
    getDailyStats: (days) => ipcRenderer.invoke("db:getDailyStats", days),
    getStreakDays: () => ipcRenderer.invoke("db:getStreakDays"),
    getTodayStats: () => ipcRenderer.invoke("db:getTodayStats"),
    getHeatmapData: (days) => ipcRenderer.invoke("db:getHeatmapData", days),
    getGrowthData: () => ipcRenderer.invoke("db:getGrowthData"),
    getAppSetting: (key) => ipcRenderer.invoke("db:getAppSetting", key),
    setAppSetting: (key, value) => ipcRenderer.invoke("db:setAppSetting", { key, value }),
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
    exportBackupFile: (clientState) => ipcRenderer.invoke("db:exportBackupFile", clientState),
    importBackupFile: () => ipcRenderer.invoke("db:importBackupFile"),
    resetUserData: () => ipcRenderer.invoke("db:resetUserData"),
    clearAllData: () => ipcRenderer.invoke("db:clearAllData"),
  },

  // 备考待办
  todo: {
    getTemplates: () => ipcRenderer.invoke("todo:getTemplates"),
    saveTemplate: (input) => ipcRenderer.invoke("todo:saveTemplate", input),
    deleteTemplate: (templateId) => ipcRenderer.invoke("todo:deleteTemplate", templateId),
    reorderTemplates: (ids) => ipcRenderer.invoke("todo:reorderTemplates", ids),
    getDaily: (date) => ipcRenderer.invoke("todo:getDaily", date),
    addInstance: (input) => ipcRenderer.invoke("todo:addInstance", input),
    updateInstance: (input) => ipcRenderer.invoke("todo:updateInstance", input),
    deleteInstance: (id) => ipcRenderer.invoke("todo:deleteInstance", id),
    bumpProgress: (kind, amount, date) => ipcRenderer.invoke("todo:bumpProgress", { kind, amount, date }),
    carryOver: (ids, date) => ipcRenderer.invoke("todo:carryOver", { ids, date }),
    getStreak: (days) => ipcRenderer.invoke("todo:getStreak", days),
  },

  // 笔记与知识库
  note: {
    save: (input) => ipcRenderer.invoke("note:save", input),
    list: (options) => ipcRenderer.invoke("note:list", options),
    get: (id) => ipcRenderer.invoke("note:get", id),
    remove: (id) => ipcRenderer.invoke("note:delete", id),
    search: (keyword, options) => ipcRenderer.invoke("note:search", { keyword, options }),
    tags: () => ipcRenderer.invoke("note:tags"),
  },

  // 申论
  essay: {
    savePrompt: (input) => ipcRenderer.invoke("essay:savePrompt", input),
    listPrompts: (options) => ipcRenderer.invoke("essay:listPrompts", options),
    getPrompt: (id) => ipcRenderer.invoke("essay:getPrompt", id),
    deletePrompt: (id) => ipcRenderer.invoke("essay:deletePrompt", id),
    saveAttempt: (input) => ipcRenderer.invoke("essay:saveAttempt", input),
    listAttempts: (options) => ipcRenderer.invoke("essay:listAttempts", options),
    getAttempt: (id) => ipcRenderer.invoke("essay:getAttempt", id),
    deleteAttempt: (id) => ipcRenderer.invoke("essay:deleteAttempt", id),
    recommend: (options) => ipcRenderer.invoke("essay:recommend", options),
  },

  app: {
    getInfo: () => ipcRenderer.invoke("app:getInfo"),
    getUpdateState: () => ipcRenderer.invoke("app:getUpdateState"),
    checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
    quitAndInstallUpdate: () => ipcRenderer.invoke("app:quitAndInstallUpdate"),
    openReleasePage: () => ipcRenderer.invoke("app:openReleasePage"),
    openExternal: (targetUrl) => ipcRenderer.invoke("app:openExternal", targetUrl),
    getProfile: () => ipcRenderer.invoke("app:getProfile"),
    saveProfile: (input) => ipcRenderer.invoke("app:saveProfile", input),
    onUpdateState: (handler) => {
      if (typeof handler !== "function") return () => {};
      const listener = (_event, payload) => handler(payload);
      ipcRenderer.on("app:update-state", listener);
      return () => ipcRenderer.removeListener("app:update-state", listener);
    },
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
    gradeEssay: (settings, payload) =>
      ipcRenderer.invoke("ai:gradeEssay", { settings, payload }),
    recognizeEssay: (settings, imageBase64, mimeType) =>
      ipcRenderer.invoke("ai:recognizeEssay", { settings, imageBase64, mimeType }),
  }
});
