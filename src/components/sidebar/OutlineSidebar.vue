<script setup>
import { computed } from 'vue'
import { useDocumentStore } from '../../stores/document.js'
import { useI18n } from '../../i18n/index.js'

const emit = defineEmits(['navigate'])

const docStore = useDocumentStore()
const { t } = useI18n()

// Parse headings from markdown content
const headings = computed(() => {
  const content = docStore.content
  if (!content) return []

  const regex = /^(#{1,6})\s+(.+)$/gm
  const result = []
  let match

  while ((match = regex.exec(content)) !== null) {
    result.push({
      level: match[1].length,
      text: match[2].trim(),
      line: content.substring(0, match.index).split('\n').length  // 1-based
    })
  }

  return result
})

// Determine which heading is "active" based on cursor line
const activeLine = computed(() => docStore.cursorLine)

function isActive(headingIndex) {
  const current = headings.value[headingIndex]
  const next = headings.value[headingIndex + 1]
  return activeLine.value >= current.line &&
    (!next || activeLine.value < next.line)
}

function onClick(line) {
  emit('navigate', line)
}
</script>

<template>
  <aside class="outline-sidebar">
    <div class="outline-header">
      <span class="outline-title">{{ t('outline.title') }}</span>
    </div>
    <div class="outline-content">
      <template v-if="headings.length === 0">
        <p class="outline-empty">{{ t('outline.empty') }}</p>
      </template>
      <ul class="outline-list" v-else>
        <li
          v-for="(h, i) in headings"
          :key="h.line"
          class="outline-item"
          :class="{ active: isActive(i) }"
          :style="{ paddingLeft: `${12 + (h.level - 1) * 16}px` }"
          :title="h.text"
          @click="onClick(h.line)"
        >
          <span class="outline-bullet">H{{ h.level }}</span>
          <span class="outline-text">{{ h.text }}</span>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.outline-sidebar {
  display: flex;
  flex-direction: column;
  width: 220px;
  min-width: 180px;
  max-width: 320px;
  height: 100%;
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  flex-shrink: 0;
}

.outline-header {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.outline-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
}

.outline-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.outline-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--color-text-tertiary, #999);
  text-align: center;
}

.outline-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.outline-item {
  display: flex;
  align-items: center;
  height: 26px;
  padding-right: 12px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
  border-left: 2px solid transparent;
  transition: background-color 0.1s;
}

.outline-item:hover {
  background-color: var(--color-hover, rgba(128, 128, 128, 0.12));
}

.outline-item.active {
  background-color: var(--color-active, rgba(100, 160, 255, 0.15));
  border-left-color: var(--color-accent);
  font-weight: 500;
}

.outline-bullet {
  flex-shrink: 0;
  width: 22px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary, #999);
}

.outline-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
