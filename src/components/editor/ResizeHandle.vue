<script setup>
import { ref, onUnmounted } from 'vue'

const emit = defineEmits(['resize'])
const isDragging = ref(false)
const startX = ref(0)
const startWidth = ref(0)

function cleanupListeners() {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function onMouseDown(e) {
  isDragging.value = true
  startX.value = e.clientX
  const editorPane = document.querySelector('.editor-pane-wrapper')
  if (editorPane) {
    startWidth.value = editorPane.getBoundingClientRect().width
  }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  e.preventDefault()
}

function onMouseMove(e) {
  if (!isDragging.value) return
  const delta = e.clientX - startX.value
  const container = document.querySelector('.editor-container')
  if (container) {
    const containerWidth = container.getBoundingClientRect().width
    const handleWidth = 6
    const newWidth = startWidth.value + delta
    const ratio = Math.min(Math.max(newWidth / containerWidth, 0.2), 0.8)
    emit('resize', ratio)
  }
}

function onMouseUp() {
  isDragging.value = false
  cleanupListeners()
}

onUnmounted(() => {
  cleanupListeners()
})
</script>

<template>
  <div
    class="resize-handle"
    :class="{ active: isDragging }"
    @mousedown="onMouseDown"
  >
    <div class="resize-handle-line"></div>
  </div>
</template>

<style scoped>
.resize-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 6px;
  flex-shrink: 0;
  cursor: col-resize;
  background-color: var(--color-bg);
  transition: background-color 0.15s;
  user-select: none;
}

.resize-handle:hover,
.resize-handle.active {
  background-color: var(--color-resize-handle-hover);
}

.resize-handle-line {
  width: 2px;
  height: 40px;
  background-color: var(--color-resize-handle);
  border-radius: 1px;
  transition: background-color 0.15s;
}

.resize-handle:hover .resize-handle-line,
.resize-handle.active .resize-handle-line {
  background-color: var(--color-resize-handle-hover);
  height: 100%;
}
</style>
