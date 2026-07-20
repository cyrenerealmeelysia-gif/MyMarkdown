# Markdown Editor

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/cyrenerealmeelysia-gif/MyMarkdown/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#)
[![Electron](https://img.shields.io/badge/Electron-43-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)

基于 **Electron + Vue 3 + Vite** 的桌面 Markdown 编辑器。支持设为系统默认 `.md` 文件打开方式。

## 下载 / Download

> 最新版本：**v1.0.0** · [查看全部版本](https://github.com/cyrenerealmeelysia-gif/MyMarkdown/releases)

| 平台 | 架构 | 下载 |
|------|------|------|
| 🍎 **macOS** | Apple Silicon (arm64) | [⬇ `Markdown Editor-1.0.0-arm64.dmg`](https://github.com/cyrenerealmeelysia-gif/MyMarkdown/releases/download/v1.0.0/Markdown.Editor-1.0.0-arm64.dmg) |
| 🍎 **macOS** | Intel (x64) | [⬇ `Markdown Editor-1.0.0.dmg`](https://github.com/cyrenerealmeelysia-gif/MyMarkdown/releases/download/v1.0.0/Markdown.Editor-1.0.0.dmg) |
| 🪟 **Windows** | x64 | [⬇ `Markdown Editor Setup 1.0.0.exe`](https://github.com/cyrenerealmeelysia-gif/MyMarkdown/releases/download/v1.0.0/Markdown.Editor.Setup.1.0.0.exe) |

## 功能

- **编辑与预览**: 分屏 / 纯源码 / 纯预览 / WYSIWYG 四种模式
- **语法高亮**: Shiki 代码块高亮（23 种语言）
- **数学公式**: KaTeX 渲染（行内 + 块级）
- **图表**: Mermaid 流程图、序列图等
- **多标签页**: 同时打开多个文件，脏标记 + 关闭确认
- **拼写检查**: 英文拼写错误红色波浪线 + 右键纠正建议
- **搜索替换**: 支持正则、大小写敏感
- **导出**: 自包含 HTML / PDF
- **主题**: 亮色 / 暗色 / 护眼 / 北欧四套配色
- **国际化**: 中文 / 英文界面切换
- **自动保存**: 可配置间隔
- **大纲侧边栏**: 标题导航 + 光标跟踪
- **图片粘贴**: 剪贴板图片 → 本地保存 → 自动插入
- **拖放打开**: 拖拽 .md 文件到窗口即可打开
- **大文件优化**: >50KB 自动启用 Web Worker 解析

## 技术栈

| 层 | 技术 |
|------|------|
| 桌面壳 | Electron 43 |
| 前端 | Vue 3 (Composition API) + Vite 8 |
| 编辑器 | CodeMirror 6 |
| 解析 | markdown-it + 9 插件 |
| 高亮 | Shiki (TextMate 语法) |
| 数学 | KaTeX |
| 图表 | Mermaid |
| 状态 | Pinia |
| 持久化 | electron-store |
| 拼写 | typo-js (浏览器安全分支) |
| 国际化 | 自定义 Composable |

## 开发环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | `^20.19.0` 或 `>=22.12.0` |
| npm | 随 Node.js 附带 |
| Git | 版本控制 + CI/CD |
| 操作系统 | Windows 10+ / macOS 12+ / Linux |

```sh
git clone https://github.com/cyrenerealmeelysia-gif/MyMarkdown.git
cd MyMarkdown
npm install
npm run dev       # 启动 Vite + Electron (HMR)
```

## 构建

```sh
npm run build           # 仅构建源码 → dist/
npm run electron:build  # 构建 + 打包安装程序 → release/
```

## 项目结构

```
├── src/                    # Vue 渲染进程
│   ├── components/         # 组件 (layout/editor/sidebar/dialogs/common)
│   ├── composables/        # Composable (markdown/spellCheck/keyboard/theme...)
│   ├── stores/             # Pinia 状态 (document/editor/tabs/app)
│   ├── utils/              # 工具 (parser/sanitizer/highlighter/math/mermaid...)
│   ├── i18n/               # 国际化 (zh-CN/en)
│   ├── workers/            # Web Worker (大文件解析)
│   └── styles/             # 样式 (variables/editor/preview/global/themes)
├── electron/               # Electron 主进程
│   ├── main.js             # 入口 + 文件关联
│   ├── preload.js          # contextBridge API
│   ├── menu.js             # 应用菜单 (中英文切换)
│   ├── store.js            # electron-store
│   └── ipc/                # IPC 处理器 (file/prefs/window)
├── builds/                 # 构建配置
│   └── electron-builder.yml
├── public/dictionaries/    # 拼写检查字典
└── package.json
```

## 许可

MIT
