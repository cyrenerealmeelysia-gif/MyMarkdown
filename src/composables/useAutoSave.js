import { watch, onUnmounted } from 'vue'
import { useDocumentStore } from '../stores/document.js'
import { useEditorStore } from '../stores/editor.js'

/**
 * Auto-save composable.
 *
 * Automatically saves the current document at an interval configured in
 * editorStore.autoSaveInterval, when autoSaveEnabled is true, the document
 * is dirty, and has been saved to a file path at least once.
 */
export function useAutoSave() {
  const docStore = useDocumentStore()
  const editorStore = useEditorStore()

  let timerId = null
  let lastSavedSnapshot = docStore.content

  async function performAutoSave() {
    if (!editorStore.autoSaveEnabled) return
    if (!docStore.isDirty) return
    if (!docStore.filePath) return       // never saved yet — no path
    if (docStore.content === lastSavedSnapshot) return  // no change since last attempt

    const api = window.electronAPI
    if (!api) return

    try {
      await api.saveFile(docStore.filePath, docStore.content)
      docStore.markSaved()
      lastSavedSnapshot = docStore.content
      console.log(`[AutoSave] Saved: ${docStore.fileName}`)
    } catch (err) {
      console.error('[AutoSave] Failed:', err.message)
    }
  }

  function schedule() {
    stop()
    if (editorStore.autoSaveEnabled && editorStore.autoSaveInterval > 0) {
      timerId = setInterval(performAutoSave, editorStore.autoSaveInterval)
    }
  }

  function stop() {
    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
  }

  // React to config changes
  watch(() => editorStore.autoSaveEnabled, schedule)
  watch(() => editorStore.autoSaveInterval, schedule)

  // Start on creation
  schedule()

  onUnmounted(() => stop())

  return { stop, performAutoSave }
}
