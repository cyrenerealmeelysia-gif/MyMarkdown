import { useDocumentStore } from '../stores/document.js'
import { useAppStore } from '../stores/app.js'
import { useTabsStore } from '../stores/tabs.js'

// Deduplicate rapid calls to openFilePath (drag-and-drop may trigger
// both the HTML5 drop handler and Electron's open-file IPC event).
let _lastOpenPath = ''
let _lastOpenTime = 0

export function useFileIO() {
  const docStore = useDocumentStore()
  const appStore = useAppStore()
  const tabsStore = useTabsStore()

  async function openFile() {
    const api = window.electronAPI
    if (!api) return
    const result = await api.openFile()
    if (!result) return

    // Check if file already open
    const existing = tabsStore.findTabByPath(result.path)
    if (existing) {
      tabsStore.switchToTab(existing.id)
      return
    }

    // Reuse current tab if empty, otherwise create new
    const active = tabsStore.activeTab
    if (active && !active.filePath && !active.content && tabsStore.tabCount === 1) {
      tabsStore.loadFileToActive(result)
    } else {
      tabsStore.createTab(result)
    }

    appStore.addRecentFile({ path: result.path, name: result.name })
    await api.watchFile(result.path)
    await api.setTitle(`${result.name} - Markdown Editor`)
  }

  async function saveFile() {
    const api = window.electronAPI
    if (!api) return

    if (docStore.filePath) {
      const result = await api.saveFile(docStore.filePath, docStore.content)
      if (result) {
        docStore.markSaved()
        await api.setTitle(`${docStore.fileName} - Markdown Editor`)
        appStore.addRecentFile({ path: result.path, name: docStore.fileName })
      }
    } else {
      await saveFileAs()
    }
  }

  async function saveFileAs() {
    const api = window.electronAPI
    if (!api) return

    const result = await api.saveFileAs(docStore.content)
    if (result) {
      if (docStore.filePath) {
        await api.unwatchFile(docStore.filePath)
      }
      tabsStore.setActiveFilePath(result.path, result.name)
      docStore.markSaved()
      await api.watchFile(result.path)
      await api.setTitle(`${result.name} - Markdown Editor`)
      appStore.addRecentFile({ path: result.path, name: result.name })
    }
  }

  async function openFilePath(filePath) {
    const api = window.electronAPI
    if (!api) return null

    const ext = filePath.split('.').pop()?.toLowerCase()
    const mdExts = ['md', 'markdown', 'mdown', 'mkd', 'mdx']
    if (!mdExts.includes(ext)) return null

    // Deduplicate: drag-and-drop may fire both the drop handler AND
    // Electron's open-file event within the same frame
    const now = Date.now()
    if (filePath === _lastOpenPath && now - _lastOpenTime < 1000) return null
    _lastOpenPath = filePath
    _lastOpenTime = now

    // Check if already open in another tab
    const existing = tabsStore.findTabByPath(filePath)
    if (existing) {
      tabsStore.switchToTab(existing.id)
      return existing
    }

    const result = await api.openPath(filePath)
    if (result) {
      // If the only open tab is an empty untitled tab, reuse it
      // instead of creating a duplicate (handles file-association startup)
      const tabs = tabsStore.tabs
      if (tabs.length === 1 && !tabs[0].filePath && !tabs[0].content) {
        tabsStore.loadFileToActive(result)
      } else {
        tabsStore.createTab(result)
      }
      appStore.addRecentFile({ path: result.path, name: result.name })
      await api.watchFile(result.path)
      await api.setTitle(`${result.name} - Markdown Editor`)
    }
    return result
  }

  async function newFile() {
    const api = window.electronAPI
    if (!api) return

    tabsStore.createTab()
    await api.setTitle(`${docStore.fileName} - Markdown Editor`)
  }

  async function exportHtml() {
    const api = window.electronAPI
    if (!api) return

    const { buildExportHtml } = await import('../utils/exporter.js')
    const theme = document.documentElement.getAttribute('data-theme') || 'light'
    const html = await buildExportHtml(docStore.content, docStore.filePath, theme)
    const name = docStore.fileName.replace(/\.[^.]+$/, '') + '.html'
    await api.exportHtml(html, name)
  }

  async function exportPdf() {
    const api = window.electronAPI
    if (!api) return

    const { buildExportHtml } = await import('../utils/exporter.js')
    const theme = document.documentElement.getAttribute('data-theme') || 'light'
    const html = await buildExportHtml(docStore.content, docStore.filePath, theme)
    const name = docStore.fileName.replace(/\.[^.]+$/, '') + '.pdf'
    await api.exportPdf(html, name)
  }

  return { openFile, openFilePath, saveFile, saveFileAs, newFile, exportHtml, exportPdf }
}
