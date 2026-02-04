const { app, BrowserWindow, nativeTheme } = require("electron");
const path = require("path");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 680,
    minWidth: 1000,
    minHeight: 580,
    backgroundColor: "#ffffff",
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 18 },
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

    // Dev-only: restart Electron when main/preload changes.
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
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
