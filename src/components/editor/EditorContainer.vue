<script setup>
import { computed, ref, nextTick } from 'vue'
import { useEditorStore } from '../../stores/editor.js'
import EditorPane from './EditorPane.vue'
import PreviewPane from './PreviewPane.vue'
import ResizeHandle from './ResizeHandle.vue'
import OutlineSidebar from '../sidebar/OutlineSidebar.vue'
import SearchBar from './SearchBar.vue'

const editorStore = useEditorStore()

const showEditor = computed(() => editorStore.mode !== 'preview' && editorStore.mode !== 'wysiwyg')
const showPreview = computed(() => editorStore.mode !== 'source')
const showHandle = computed(() => editorStore.mode === 'split')

const splitRatio = ref(0.5)

function onResize(ratio) {
  splitRatio.value = ratio
}

const editorPaneRef = ref(null)
const searchBarRef = ref(null)

function executeAction(action) {
  editorPaneRef.value?.executeAction(action)
}

function onNavigateToLine(line) {
  editorPaneRef.value?.scrollToLine(line)
}

// ── WYSIWYG click-to-edit ─────────────────────────────────────

function onWysiwygNavigateToSource(line) {
  // Switch to source mode and jump to the clicked line
  editorStore.setMode('source')
  // Need to wait a tick for the editor to become visible
  nextTick(() => {
    editorPaneRef.value?.scrollToLine(line)
  })
}

// ── Search ─────────────────────────────────────────────────────

function openSearch(findOnly = true) {
  searchBarRef.value?.open(findOnly)
}

defineExpose({ executeAction, openSearch })
</script>

<template>
  <div class="editor-container">
    <OutlineSidebar
      v-if="editorStore.showOutline"
      @navigate="onNavigateToLine"
    />
    <div class="editor-main">
      <div
        v-if="showEditor"
        class="editor-pane-wrapper"
        :style="{ flex: editorStore.mode === 'split' ? `0 0 calc(${splitRatio * 100}% - 3px)` : '1 1 100%' }"
      >
        <SearchBar
          ref="searchBarRef"
          :editor-view="editorPaneRef?.editorView"
        />
        <EditorPane ref="editorPaneRef" />
      </div>
      <ResizeHandle v-if="showHandle" @resize="onResize" />
      <div
        v-if="showPreview"
        class="preview-pane-wrapper"
        :style="{ flex: '1 1 0%' }"
      >
        <PreviewPane @navigate-to-source="onWysiwygNavigateToSource" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-main {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.editor-pane-wrapper,
.preview-pane-wrapper {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
</style>
