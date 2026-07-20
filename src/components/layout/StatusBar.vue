<script setup>
import { computed } from 'vue'
import { useDocumentStore } from '../../stores/document.js'
import { useI18n } from '../../i18n/index.js'

const docStore = useDocumentStore()
const { t } = useI18n()

const dirtyIndicator = computed(() => docStore.isDirty ? '●' : '')
const displayPath = computed(() => docStore.filePath || t('tabs.untitled') + '.md')
const lineInfo = computed(() => `Ln ${docStore.cursorLine}, Col ${docStore.cursorColumn}`)
const wordInfo = computed(() => `${docStore.wordCount.toLocaleString()} ${t('statusBar.words')}`)
</script>

<template>
  <div class="statusbar">
    <div class="statusbar-left">
      <span class="statusbar-item">{{ displayPath }}</span>
      <span v-if="dirtyIndicator" class="statusbar-dirty">{{ dirtyIndicator }}</span>
    </div>
    <div class="statusbar-right">
      <span class="statusbar-item">{{ lineInfo }}</span>
      <span class="statusbar-separator">|</span>
      <span class="statusbar-item">{{ wordInfo }}</span>
    </div>
  </div>
</template>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  padding: 0 12px;
  background-color: var(--color-statusbar-bg);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  user-select: none;
}

.statusbar-left,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.statusbar-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.statusbar-dirty {
  color: var(--color-danger);
  font-size: 14px;
}

.statusbar-separator {
  color: var(--color-border);
}
</style>
