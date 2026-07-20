<script setup>
import { ref, onMounted } from 'vue'
import { provide } from 'vue'
import Toolbar from './Toolbar.vue'
import StatusBar from './StatusBar.vue'
import EditorContainer from '../editor/EditorContainer.vue'
import SettingsDialog from '../dialogs/SettingsDialog.vue'
import TabBar from './TabBar.vue'
import { useTheme } from '../../composables/useTheme.js'
import { useKeyboard } from '../../composables/useKeyboard.js'
import { useAutoSave } from '../../composables/useAutoSave.js'
import { useFileIO } from '../../composables/useFileIO.js'
import { useEditorStore } from '../../stores/editor.js'
import { useTabsStore } from '../../stores/tabs.js'
import { useDocumentStore } from '../../stores/document.js'
import { useI18n } from '../../i18n/index.js'

const editorStore = useEditorStore()
const tabsStore = useTabsStore()
const docStore = useDocumentStore()
const { t } = useI18n()
const { cycleTheme } = useTheme()
const { setEditorView } = useKeyboard({
  onFind: () => editorRef.value?.openSearch(true),
  onReplace: () => editorRef.value?.openSearch(false)
})

// ── Tab initialization ───────────────────────────────────────

onMounted(() => {
  tabsStore.ensureTab()
})
const { openFilePath } = useFileIO()

// Auto-save reads config from editorStore
useAutoSave()

// Expose editor commands for toolbar
const editorRef = ref(null)
provide('editorRef', editorRef)

function onToolbarAction(action) {
  editorRef.value?.executeAction(action)
}

function onToggleTheme() {
  cycleTheme()
}

function onToggleOutline() {
  editorStore.toggleOutline()
}

function onOpenSettings() {
  editorStore.openSettings()
}

// ── Drag & Drop ──────────────────────────────────────────────

const isDragOver = ref(false)
let dragCounter = 0

function onDragEnter(e) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter++
  if (e.dataTransfer?.types.includes('Files')) {
    isDragOver.value = true
  }
}

function onDragOver(e) {
  e.preventDefault()
  e.stopPropagation()
}

function onDragLeave(e) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
  }
}

async function onDropCapture(e) {
  // Stop the event in the capture phase so CodeMirror's
  // built-in file-drop handler never sees it.
  e.preventDefault()
  e.stopImmediatePropagation()
  isDragOver.value = false
  dragCounter = 0

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const api = window.electronAPI
  if (!api) return

  for (const file of files) {
    try {
      const filePath = await api.getFilePath(file)
      if (filePath) {
        await openFilePath(filePath)
        break
      }
    } catch {
      continue
    }
  }
}
</script>

<template>
  <div
    class="app-shell"
    @dragenter.capture="onDragEnter"
    @dragover.capture="onDragOver"
    @dragleave.capture="onDragLeave"
    @drop.capture="onDropCapture"
  >
    <Toolbar
      @action="onToolbarAction"
      @toggle-theme="onToggleTheme"
      @toggle-outline="onToggleOutline"
      @open-settings="onOpenSettings"
    />
    <TabBar />
    <EditorContainer ref="editorRef" />
    <StatusBar />
    <SettingsDialog
      v-if="editorStore.showSettingsDialog"
      @close="editorStore.closeSettings()"
    />
    <!-- Drag overlay -->
    <div v-if="isDragOver" class="drag-overlay">
      <div class="drag-hint">
        <span class="drag-icon">📄</span>
        <span>{{ t('drag.dropHint') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-bg);
}

/* ── Drag overlay ──────────────────────────────────────────── */

.drag-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(1px);
  border: 3px dashed var(--color-accent);
  border-radius: 0;
  pointer-events: none;
}

.drag-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 48px;
  border-radius: 12px;
  background-color: var(--color-bg);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  color: var(--color-text);
  font-size: 16px;
  font-weight: 500;
}

.drag-icon {
  font-size: 40px;
}
</style>
