import { ref, onUnmounted } from 'vue'

export function useScrollSync() {
  const enabled = ref(true)
  let isEditorScrolling = false
  let isPreviewScrolling = false
  let rafId = null

  function syncEditorToPreview(editorEl, previewEl) {
    if (!editorEl || !previewEl) return
    if (!enabled.value || isPreviewScrolling) return

    isEditorScrolling = true
    const editorMax = editorEl.scrollHeight - editorEl.clientHeight
    const previewMax = previewEl.scrollHeight - previewEl.clientHeight

    if (editorMax <= 0 || previewMax <= 0) {
      isEditorScrolling = false
      return
    }

    const ratio = editorEl.scrollTop / editorMax
    previewEl.scrollTop = ratio * previewMax

    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      isEditorScrolling = false
      rafId = null
    })
  }

  function syncPreviewToEditor(editorEl, previewEl) {
    if (!editorEl || !previewEl) return
    if (!enabled.value || isEditorScrolling) return

    isPreviewScrolling = true
    const editorMax = editorEl.scrollHeight - editorEl.clientHeight
    const previewMax = previewEl.scrollHeight - previewEl.clientHeight

    if (editorMax <= 0 || previewMax <= 0) {
      isPreviewScrolling = false
      return
    }

    const ratio = previewEl.scrollTop / previewMax
    editorEl.scrollTop = ratio * editorMax

    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      isPreviewScrolling = false
      rafId = null
    })
  }

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { enabled, syncEditorToPreview, syncPreviewToEditor }
}
