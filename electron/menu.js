import { Menu, app } from 'electron'
import store from './store.js'

const T = {
  'zh-CN': {
    file: '文件', new: '新建标签', open: '打开...', save: '保存', saveAs: '另存为...',
    export: '导出', exportHtml: 'HTML (自包含)...', exportPdf: 'PDF...', exit: '退出',
    edit: '编辑', undo: '撤销', redo: '重做', cut: '剪切', copy: '复制', paste: '粘贴', selectAll: '全选',
    view: '视图', splitMode: '分屏模式', sourceOnly: '纯源码', previewOnly: '纯预览',
    wysiwygMode: '所见即所得', toggleTheme: '切换主题', preferences: '偏好设置...',
    toggleDevtools: '开发者工具', reload: '重新加载',
    help: '帮助', about: '关于 Markdown Editor',
  },
  en: {
    file: 'File', new: 'New', open: 'Open...', save: 'Save', saveAs: 'Save As...',
    export: 'Export', exportHtml: 'HTML (Self-contained)...', exportPdf: 'PDF...', exit: 'Exit',
    edit: 'Edit', undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All',
    view: 'View', splitMode: 'Split-Pane Mode', sourceOnly: 'Source Only', previewOnly: 'Preview Only',
    wysiwygMode: 'WYSIWYG Mode', toggleTheme: 'Toggle Theme', preferences: 'Preferences...',
    toggleDevtools: 'Toggle Developer Tools', reload: 'Reload',
    help: 'Help', about: 'About Markdown Editor',
  }
}

function tx(locale) {
  const strings = T[locale] || T.en
  return (key) => strings[key] || key
}

export function buildMenu(mainWindow) {
  const locale = store.get('i18n', {}).locale || 'en'
  const t = tx(locale)
  const isMac = process.platform === 'darwin'

  const template = [
    {
      label: t('file'),
      submenu: [
        { label: t('new'), accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu:action', 'new') },
        { label: t('open'), accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu:action', 'open') },
        { type: 'separator' },
        { label: t('save'), accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu:action', 'save') },
        { label: t('saveAs'), click: () => mainWindow.webContents.send('menu:action', 'saveAs') },
        { type: 'separator' },
        { label: t('export'), submenu: [
          { label: t('exportHtml'), click: () => mainWindow.webContents.send('menu:action', 'export:html') },
          { label: t('exportPdf'), click: () => mainWindow.webContents.send('menu:action', 'export:pdf') }
        ]},
        { type: 'separator' },
        { label: t('exit'), accelerator: isMac ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: t('edit'),
      submenu: [
        { label: t('undo'), accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: t('redo'), accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: t('cut'), accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: t('copy'), accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: t('paste'), accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: t('selectAll'), accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: t('view'),
      submenu: [
        { label: t('splitMode'), accelerator: 'CmdOrCtrl+Shift+V', click: () => mainWindow.webContents.send('menu:action', 'mode:split') },
        { label: t('sourceOnly'), accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu:action', 'mode:source') },
        { label: t('previewOnly'), accelerator: 'CmdOrCtrl+Shift+P', click: () => mainWindow.webContents.send('menu:action', 'mode:preview') },
        { label: t('wysiwygMode'), accelerator: 'CmdOrCtrl+Shift+W', click: () => mainWindow.webContents.send('menu:action', 'mode:wysiwyg') },
        { type: 'separator' },
        { label: t('toggleTheme'), click: () => mainWindow.webContents.send('menu:action', 'toggleTheme') },
        { type: 'separator' },
        { label: t('preferences'), click: () => mainWindow.webContents.send('menu:action', 'preferences') },
        { type: 'separator' },
        { label: t('toggleDevtools'), accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
        { label: t('reload'), accelerator: 'CmdOrCtrl+R', role: 'reload' }
      ]
    },
    {
      label: t('help'),
      submenu: [
        { label: t('about'), click: () => mainWindow.webContents.send('menu:action', 'about') }
      ]
    }
  ]

  if (isMac) {
    template.unshift({
      label: app.name,
      submenu: [
        { label: t('about'), role: 'about' },
        { type: 'separator' },
        { label: t('exit'), accelerator: 'Cmd+Q', role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
