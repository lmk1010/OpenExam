const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("path");

module.exports = defineConfig({
  base: "./",
  plugins: [react()],
  root: path.resolve(__dirname, "src/renderer"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    // 必须写死 127.0.0.1。不写的话 Vite 5 在这台机器上只监听 IPv6（[::1]），
    // 而 npm run dev 里的 wait-on 走 IPv4 —— 它会一直等不到，electron 那半边
    // 永远不启动，表现就是「跑了 npm run dev，什么都没出来」。
    host: "127.0.0.1",
    port: 5189,
    strictPort: true
  }
});
