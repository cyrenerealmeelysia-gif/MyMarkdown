<script setup>
import { computed } from 'vue'
import IconButton from '../common/IconButton.vue'
import { useI18n } from '../../i18n/index.js'

defineEmits(['action', 'toggleTheme', 'toggleOutline', 'openSettings'])

const { t } = useI18n()

const tools = computed(() => [
  { id: 'bold', icon: 'B', title: t('toolbar.bold') + ' (Ctrl+B)' },
  { id: 'italic', icon: 'I', title: t('toolbar.italic') + ' (Ctrl+I)' },
  { id: 'strikethrough', icon: 'S̶', title: t('toolbar.strikethrough') },
  { type: 'separator' },
  { id: 'heading', icon: 'H', title: t('toolbar.heading') },
  { id: 'link', icon: '🔗', title: t('toolbar.link') },
  { id: 'image', icon: '🖼', title: t('toolbar.image') },
  { id: 'code', icon: '<>', title: t('toolbar.code') },
  { id: 'codeblock', icon: '{ }', title: t('toolbar.code') },
  { type: 'separator' },
  { id: 'quote', icon: '"', title: t('toolbar.quote') },
  { id: 'unordered-list', icon: '•', title: t('toolbar.unorderedList') },
  { id: 'ordered-list', icon: '1.', title: t('toolbar.orderedList') },
  { id: 'task-list', icon: '☑', title: t('toolbar.taskList') },
  { type: 'separator' },
  { id: 'table', icon: '⊞', title: t('toolbar.table') },
  { id: 'hr', icon: '—', title: t('toolbar.horizontalRule') }
])
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <IconButton
        v-for="tool in tools"
        :key="tool.id || tool.type"
        :icon="tool.icon"
        :title="tool.title"
        :separator="tool.type === 'separator'"
        @click="$emit('action', tool)"
      />
    </div>
    <div class="toolbar-right">
      <IconButton
        icon="☰"
        :title="t('toolbar.outline') + ' (Ctrl+Shift+O)'"
        @click="$emit('toggleOutline')"
      />
      <IconButton
        icon="⚙"
        :title="t('toolbar.settings')"
        @click="$emit('openSettings')"
      />
      <IconButton
        icon="☀"
        :title="t('toolbar.toggleTheme')"
        @click="$emit('toggleTheme')"
      />
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 8px;
  background-color: var(--color-toolbar-bg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  user-select: none;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}
</style>
