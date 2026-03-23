# OpenExam — AI 智能学习平台

> 🎓 不局限于考公的开源 AI 智能学习工具

一个基于 Electron + React + SQLite 的桌面端智能学习平台，集成多种 AI 大模型，提供智能出卷、AI 辅导、错题管理、学习分析等全链路学习体验。

## ✨ 核心特性

- 🧠 **AI 智能出卷** — 根据知识点/难度/考试类型自动生成试卷
- 🤖 **AI 老师** — 1对1 个性化辅导，题目讲解、举一反三、学习计划
- 📂 **多格式导入** — 支持图片 OCR / PDF / Excel / CSV / JSON 导入历史试卷
- ❌ **智能错题本** — AI 错因分析 + 艾宾浩斯遗忘曲线复习
- 📊 **AI 分析预测** — 知识点雷达图、成绩预测、智能学习报告
- 🌱 **个人成长** — 打卡热力图、成就系统、等级进阶
- 📤 **试卷分发** — 自定义组卷、PDF 导出、分享
- 🔒 **本地优先** — 数据全存本地，保护隐私

## 🛠️ 技术栈

- **桌面端**: Electron
- **前端**: React + Vite
- **数据库**: SQLite (better-sqlite3)
- **AI**: OpenAI / Claude / DeepSeek / 豆包 / Kimi / 通义千问 / 智谱GLM

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建前端
npm run build

# 本地打包 macOS
npm run dist:mac

# 本地打包 Windows
npm run dist:win
```

## 📦 自动 Release 出包

- 推送标签 `v*` 会自动触发 GitHub Actions
- 自动构建 `macOS` 和 `Windows` 安装包
- 自动把产物上传到 GitHub Release
- Release 页面会自动附带安装说明

### macOS 首次打开说明

- 当前自动构建的 `macOS` 安装包未做 Apple notarization
- 如果系统拦截，可在 Finder 里右键 `OpenExam.app` → `打开`
- 仍被拦截时可执行：`xattr -dr com.apple.quarantine /Applications/OpenExam.app`

```bash
git tag v0.1.1
git push origin v0.1.1
```

## 📖 支持的学科

不局限于公务员考试，可自定义扩展：

- 🏛️ 公务员考试 (行测 / 申论)
- 📚 教师资格证
- ⚖️ 司法考试
- 🎓 考研
- 💻 IT 认证
- 📝 自定义科目

## 📄 License

MIT
