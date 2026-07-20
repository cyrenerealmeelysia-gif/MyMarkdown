import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openPath: (filePath) => ipcRenderer.invoke('file:openPath', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),
  saveFileAs: (content) => ipcRenderer.invoke('file:saveAs', content),
  saveImage: (dataUrl, mdFilePath) => ipcRenderer.invoke('file:saveImage', dataUrl, mdFilePath),
  watchFile: (filePath) => ipcRenderer.invoke('file:watch', filePath),
  unwatchFile: (filePath) => ipcRenderer.invoke('file:unwatch', filePath),
  // Get absolute path from a dropped File object (Electron webUtils)
  getFilePath: (file) => webUtils.getPathForFile(file),

  // Preferences
  getPrefs: (key) => ipcRenderer.invoke('prefs:get', key),
  setPrefs: (key, value) => ipcRenderer.invoke('prefs:set', key, value),

  // Export
  inlineImages: (html, mdFilePath) => ipcRenderer.invoke('file:inlineImages', html, mdFilePath),
  exportHtml: (html, defaultName) => ipcRenderer.invoke('file:exportHtml', html, defaultName),
  exportPdf: (html, defaultName) => ipcRenderer.invoke('file:exportPdf', html, defaultName),

  // Window
  setTitle: (title) => ipcRenderer.invoke('window:setTitle', title),
  confirm: (message) => ipcRenderer.invoke('dialog:confirm', message),
  rebuildMenu: () => ipcRenderer.invoke('menu:rebuild'),

  // File watch events
  onFileChanged: (callback) => {
    const handler = (_event, filePath) => callback(filePath)
    ipcRenderer.on('file:changed', handler)
    return () => ipcRenderer.removeListener('file:changed', handler)
  },

  // Menu events from main process
  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action)
    ipcRenderer.on('menu:action', handler)
    return () => ipcRenderer.removeListener('menu:action', handler)
  },

  // File opened via OS file association (double-click, open-file, etc.)
  onOpenFile: (callback) => {
    const handler = (_event, filePath) => callback(filePath)
    ipcRenderer.on('open-file', handler)
    return () => ipcRenderer.removeListener('open-file', handler)
  }
})
