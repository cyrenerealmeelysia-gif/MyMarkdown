# Markdown

基于 Vue 3 + Node.js 的 Markdown 编辑器，支持设为系统默认 `.md` 文件打开方式。

## 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Node.js
- **桌面壳**: Electron

## 功能规划

- Markdown 实时预览
- 语法高亮
- 文件打开 / 保存
- 注册为系统默认 `.md` 打开方式
- 主题切换

## 项目结构

```
markdown/
├── src/            # Vue 前端源码
│   ├── App.vue
│   ├── main.js
│   ├── assets/
│   └── components/
├── public/         # 静态资源
├── package.json
└── vite.config.js
```

## 开发

```sh
npm install
npm run dev
```

## 构建

```sh
npm run build
```
