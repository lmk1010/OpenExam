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
    getPracticeStats: () => ipcRenderer.invoke("db:getPracticeStats")
  }
});
