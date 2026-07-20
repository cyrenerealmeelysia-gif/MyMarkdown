<script setup>
import { useTabsStore } from '../../stores/tabs.js'
import { useI18n } from '../../i18n/index.js'

const tabsStore = useTabsStore()
const { t } = useI18n()

const emit = defineEmits(['switch-tab'])

function onTabClick(id) {
  tabsStore.switchToTab(id)
}

async function onTabClose(e, id) {
  e.stopPropagation()
  const tab = tabsStore.tabs.find((t) => t.id === id)
  if (!tab) return

  // Confirm if dirty — use async IPC dialog to avoid blocking
  // the renderer process (blocking confirm() steals window focus).
  if (tab.content !== tab.savedContent) {
    const api = window.electronAPI
    const msg = t('tabs.closeConfirm', { name: tab.fileName })
    if (api) {
      const ok = await api.confirm(msg)
      if (!ok) return
    } else {
      if (!confirm(msg)) return
    }
  }

  tabsStore.closeTab(id)
}

function onNewTab() {
  tabsStore.createTab()
}

function onWheel(e) {
  // Horizontal scroll with mouse wheel
  e.currentTarget.scrollLeft += e.deltaY
}
</script>

<template>
  <div v-if="tabsStore.tabCount > 0" class="tab-bar" @wheel="onWheel">
    <div
      v-for="tab in tabsStore.tabs"
      :key="tab.id"
      class="tab-item"
      :class="{ active: tab.id === tabsStore.activeId }"
      @click="onTabClick(tab.id)"
    >
      <span v-if="tab.content !== tab.savedContent" class="tab-dirty">●</span>
      <span class="tab-name">{{ tab.fileName }}</span>
      <button
        class="tab-close"
        @click="(e) => onTabClose(e, tab.id)"
        :title="t('tabs.closeTab')"
      >&times;</button>
    </div>
    <button class="tab-new" @click="onNewTab" :title="t('tabs.newTab') + ' (Ctrl+N)'">+</button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  height: 36px;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
  padding: 0 4px;
  gap: 2px;
}

.tab-bar::-webkit-scrollbar {
  height: 2px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 4px 4px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  border: 1px solid transparent;
  flex-shrink: 0;
}

.tab-item:hover {
  background-color: var(--color-bg-tertiary);
}

.tab-item.active {
  background-color: var(--color-bg);
  color: var(--color-text);
  border-color: var(--color-border);
  border-bottom-color: var(--color-bg);
}

.tab-dirty {
  color: var(--color-accent);
  font-size: 14px;
  line-height: 1;
}

.tab-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  margin-left: 2px;
}

.tab-close:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-danger);
}

.tab-new {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.tab-new:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text);
}
</style>
