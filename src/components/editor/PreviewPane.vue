<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useDocumentStore } from '../../stores/document.js'
import { useEditorStore } from '../../stores/editor.js'
import { useMarkdown } from '../../composables/useMarkdown.js'
import { useScrollSync } from '../../composables/useScrollSync.js'
import { highlightCodeBlocks } from '../../utils/highlighter.js'
import { renderMath } from '../../utils/math.js'
import { renderDiagrams } from '../../utils/mermaid.js'
import '../../styles/preview.css'

const docStore = useDocumentStore()
const editorStore = useEditorStore()
const { safeHtml } = useMarkdown(() => docStore.content)
const { syncEditorToPreview, syncPreviewToEditor } = useScrollSync()

const emit = defineEmits(['navigate-to-source'])

const previewEl = ref(null)
let editorEl = null

// ── WYSIWYG click-to-edit ─────────────────────────────────────

function onClick(e) {
  if (editorStore.mode !== 'wysiwyg') return

  let el = e.target
  while (el && el !== previewEl.value) {
    const line = el.getAttribute?.('data-source-line')
    if (line) {
      emit('navigate-to-source', Number(line))
      return
    }
    el = el.parentElement
  }
}

// Scroll preview to show the block closest to a source line number
async function scrollToSourceLine(targetLine) {
  if (targetLine <= 0 || !previewEl.value) return

  const blocks = previewEl.value.querySelectorAll('[data-source-line]')
  if (blocks.length === 0) return

  let best = blocks[0]
  let bestDist = Math.abs(Number(best.getAttribute('data-source-line')) - targetLine)

  for (const el of blocks) {
    const line = Number(el.getAttribute('data-source-line'))
    const dist = Math.abs(line - targetLine)
    if (dist < bestDist) {
      bestDist = dist
      best = el
    }
  }

  best.scrollIntoView({ behavior: 'instant', block: 'start' })
  if (previewEl.value.scrollTop >= 40) {
    previewEl.value.scrollTop -= 40
  }
}

// When entering WYSIWYG mode from a mode where preview was hidden
// (e.g. source mode), the component is freshly mounted so the
// watcher won't fire. We check the pending scroll target on mount.
// When already mounted (split → wysiwyg), the watcher handles it.
watch(() => editorStore.wysiwygScrollLine, (targetLine) => {
  if (targetLine > 0) {
    nextTick().then(() => nextTick().then(() => scrollToSourceLine(targetLine)))
  }
})

// Find the editor scroll element for scroll sync.
// The editor gets destroyed/recreated on mode changes (v-if),
// so we need to rediscover it each time the editor appears.
function discoverEditor() {
  // Remove old listener if any
  if (editorEl) {
    editorEl.removeEventListener('scroll', onEditorScroll)
    editorEl = null
  }

  const scroller = document.querySelector('.cm-scroller')
  if (scroller) {
    editorEl = scroller
    editorEl.addEventListener('scroll', onEditorScroll)
  }
}

function onEditorScroll() {
  syncEditorToPreview(editorEl, previewEl.value)
}

// Watch for editor appearing/disappearing
watch(() => editorStore.mode, () => {
  // The editor appears when mode is NOT preview and NOT wysiwyg
  if (editorStore.mode !== 'preview' && editorStore.mode !== 'wysiwyg') {
    // Editor will mount — wait for it
    nextTick(() => discoverEditor())
  }
})

onMounted(async () => {
  // If PreviewPane was mounted in WYSIWYG mode with a pending scroll target,
  // the watcher didn't fire (value was set before mount). Handle it here.
  if (editorStore.wysiwygScrollLine > 0) {
    await nextTick()
    await nextTick()
    await nextTick()
    scrollToSourceLine(editorStore.wysiwygScrollLine)
  }
  nextTick(() => discoverEditor())
})

onUnmounted(() => {
  // Remove scroll listener to prevent leak when PreviewPane is v-if'd off
  if (editorEl) {
    editorEl.removeEventListener('scroll', onEditorScroll)
    editorEl = null
  }
})

// Resolve relative image paths to local-asset:// protocol.
// Keeps markdown portable (relative paths) while making images
// loadable from any directory in both dev and production modes.
function resolveImagePaths() {
  if (!docStore.filePath) return  // unsaved file, nothing to resolve against

  const docDir = docStore.filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
  const images = previewEl.value?.querySelectorAll('img[src]')
  if (!images) return

  for (const img of images) {
    const src = img.getAttribute('src')
    if (!src) continue

    // Skip already-absolute URLs (http://, local-asset://, data:, file://)
    if (/^(https?:|local-asset:|data:|file:)\/\//i.test(src)) continue

    // Resolve relative path against the document's directory
    const absolutePath = src.replace(/\\/g, '/')
    // Normalize: handle paths that already have the doc dir
    const resolved = absolutePath.startsWith('/')
      ? `local-asset://${absolutePath}`
      : `local-asset:///${docDir}/${absolutePath}`

    img.setAttribute('src', resolved)
    // Keep original path as data attribute for potential export
    img.setAttribute('data-original-src', src)
  }
}

// Post-process preview after HTML is injected into DOM
watch(safeHtml, async () => {
  await nextTick()
  if (previewEl.value) {
    resolveImagePaths()
    await highlightCodeBlocks(previewEl.value)
    renderMath(previewEl.value)
    await renderDiagrams(previewEl.value)
  }
})

function onPreviewScroll() {
  if (editorEl) {
    syncPreviewToEditor(editorEl, previewEl.value)
  }
}
</script>

<template>
  <div class="preview-pane" ref="previewEl" @scroll="onPreviewScroll" @click="onClick">
    <div class="markdown-preview" v-html="safeHtml"></div>
  </div>
</template>

<style scoped>
.preview-pane {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--color-bg);
}
</style>
