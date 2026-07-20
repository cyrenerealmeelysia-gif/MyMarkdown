import { onMounted, onUnmounted } from 'vue'
import { useDocumentStore } from '../stores/document.js'
import { useEditorStore } from '../stores/editor.js'
import { useTabsStore } from '../stores/tabs.js'
import { useFileIO } from './useFileIO.js'
import { useI18n } from '../i18n/index.js'

export function useKeyboard(callbacks = {}) {
  const docStore = useDocumentStore()
  const editorStore = useEditorStore()
  const tabsStore = useTabsStore()
  const { openFile, saveFile, saveFileAs, newFile, exportHtml, exportPdf } = useFileIO()
  const { onFind, onReplace } = callbacks
  const { t } = useI18n()

  // Expose view ref for editor commands (set by EditorPane)
  let editorViewRef = null

  function setEditorView(view) {
    editorViewRef = view
  }

  function onKeyDown(e) {
    const ctrl = e.ctrlKey || e.metaKey

    // Ctrl+F: Find (only when not in an input/textarea)
    if (ctrl && e.key === 'f' && !e.shiftKey) {
      if (isEditableTarget(e.target)) return  // let browser handle in inputs
      e.preventDefault()
      onFind?.()
      return
    }

    // Ctrl+H: Replace
    if (ctrl && e.key === 'h' && !e.shiftKey) {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      onReplace?.()
      return
    }

    // Ctrl+S: Save (without shift)
    if (ctrl && e.key === 's' && !e.shiftKey) {
      e.preventDefault()
      saveFile()
      return
    }

    // Ctrl+Shift+S: Source mode (per CLAUDE.md spec)
    if (ctrl && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault()
      editorStore.setMode('source')
      return
    }

    // Ctrl+O: Open
    if (ctrl && e.key === 'o') {
      e.preventDefault()
      openFile()
      return
    }

    // Ctrl+N: New tab
    if (ctrl && e.key === 'n' && !e.shiftKey) {
      e.preventDefault()
      newFile()
      return
    }

    // Ctrl+W: Close tab
    if (ctrl && e.key === 'w' && !e.shiftKey) {
      e.preventDefault()
      const active = tabsStore.activeTab
      if (active) {
        if (active.content !== active.savedContent) {
          const api = window.electronAPI
          const msg = t('tabs.closeConfirm', { name: active.fileName })
          if (api) {
            api.confirm(msg).then(yes => {
              if (yes) tabsStore.closeTab(active.id)
            })
          }
        } else {
          tabsStore.closeTab(active.id)
        }
      }
      return
    }

    // Ctrl+Tab: Next tab
    if (ctrl && e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      tabsStore.switchToNext()
      return
    }

    // Ctrl+Shift+Tab: Previous tab
    if (ctrl && e.shiftKey && e.key === 'Tab') {
      e.preventDefault()
      tabsStore.switchToPrev()
      return
    }

    // Ctrl+Shift+V: Split mode
    if (ctrl && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
      e.preventDefault()
      editorStore.setMode('split')
      return
    }

    // Ctrl+Shift+P: Preview mode
    if (ctrl && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault()
      editorStore.setMode('preview')
      return
    }

    // Ctrl+Shift+W: Toggle WYSIWYG mode
    if (ctrl && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
      e.preventDefault()
      editorStore.toggleWysiwyg(docStore.cursorLine)
      return
    }

    // Ctrl+Shift+O: Toggle outline sidebar
    if (ctrl && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
      e.preventDefault()
      editorStore.toggleOutline()
      return
    }
  }

  function isEditableTarget(el) {
    if (!el) return false
    const tag = el.tagName
    // Only skip for actual form inputs — CodeMirror uses contenteditable divs
    // and we DO want our shortcuts to work there
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  }

  // Listen for menu actions from Electron main process
  let unsubMenu = null

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)

    if (window.electronAPI?.onMenuAction) {
      unsubMenu = window.electronAPI.onMenuAction((action) => {
        switch (action) {
          case 'open':
            openFile()
            break
          case 'save':
            saveFile()
            break
          case 'saveAs':
            saveFileAs()
            break
          case 'new':
            newFile()
            break
          case 'mode:split':
            editorStore.setMode('split')
            break
          case 'mode:source':
            editorStore.setMode('source')
            break
          case 'mode:preview':
            editorStore.setMode('preview')
            break
          case 'mode:wysiwyg':
            editorStore.toggleWysiwyg(docStore.cursorLine)
            break
          case 'export:html':
            exportHtml()
            break
          case 'export:pdf':
            exportPdf()
            break
          case 'preferences':
            editorStore.openSettings()
            break
        }
      })
    }
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
    if (unsubMenu) unsubMenu()
  })

  return { setEditorView }
}
