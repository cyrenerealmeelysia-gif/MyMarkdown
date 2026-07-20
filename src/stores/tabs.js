import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

let nextId = 1
let nextUntitled = 1

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref([])
  const activeId = ref(null)

  // ── Computed ──────────────────────────────────────────────────

  const activeIndex = computed(() =>
    tabs.value.findIndex((t) => t.id === activeId.value)
  )

  const activeTab = computed(() =>
    tabs.value.find((t) => t.id === activeId.value) || null
  )

  const tabCount = computed(() => tabs.value.length)

  // ── Tab CRUD ──────────────────────────────────────────────────

  function createTab(fileData = null) {
    const id = `tab-${nextId++}`

    const normalized = fileData
      ? {
          fileName: fileData.name || fileData.path?.split(/[/\\]/).pop() || 'Untitled.md',
          filePath: fileData.path || '',
          content: fileData.content || '',
          savedContent: fileData.content || '',
          cursorLine: 1,
          cursorColumn: 1
        }
      : {
          fileName: `Untitled-${nextUntitled++}.md`,
          filePath: '',
          content: '',
          savedContent: '',
          cursorLine: 1,
          cursorColumn: 1
        }

    const tab = { id, ...normalized }
    tabs.value.push(tab)
    activeId.value = id
    return id
  }

  function closeTab(id) {
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx === -1) return false

    const isActive = id === activeId.value

    // If that was the last tab, quit the app
    if (tabs.value.length === 1) {
      window.close()
      return true
    }

    // Switch to a neighbor FIRST (before splice) so that activeId
    // never points to the tab being removed.
    if (isActive) {
      const newIdx = idx > 0 ? idx - 1 : 1
      activeId.value = tabs.value[newIdx].id
    }

    // Now remove the tab — activeId is already safe
    tabs.value.splice(idx, 1)

    return true
  }

  function switchToTab(id) {
    if (tabs.value.find((t) => t.id === id)) {
      activeId.value = id
    }
  }

  function switchToNext() {
    if (tabs.value.length < 2) return
    const idx = activeIndex.value
    const next = (idx + 1) % tabs.value.length
    activeId.value = tabs.value[next].id
  }

  function switchToPrev() {
    if (tabs.value.length < 2) return
    const idx = activeIndex.value
    const prev = (idx - 1 + tabs.value.length) % tabs.value.length
    activeId.value = tabs.value[prev].id
  }

  // ── Active tab mutations ──────────────────────────────────────

  function updateActiveContent(content) {
    const tab = activeTab.value
    if (tab) tab.content = content
  }

  function updateActiveCursor(line, col) {
    const tab = activeTab.value
    if (tab) {
      tab.cursorLine = line
      tab.cursorColumn = col
    }
  }

  function markActiveSaved() {
    const tab = activeTab.value
    if (tab) tab.savedContent = tab.content
  }

  function loadFileToActive(fileData) {
    const tab = activeTab.value
    if (tab) {
      tab.fileName = fileData.name || fileData.path?.split(/[/\\]/).pop() || tab.fileName
      tab.filePath = fileData.path || ''
      tab.content = fileData.content || ''
      tab.savedContent = fileData.content || ''
    }
  }

  function setActiveFilePath(filePath, fileName) {
    const tab = activeTab.value
    if (tab) {
      tab.filePath = filePath
      tab.fileName = fileName
    }
  }

  function resetActive() {
    const tab = activeTab.value
    if (tab) {
      tab.fileName = `Untitled-${tabs.value.length}.md`
      tab.filePath = ''
      tab.content = ''
      tab.savedContent = ''
      tab.cursorLine = 1
      tab.cursorColumn = 1
    }
  }

  // Check if a file is already open in any tab (case-insensitive on Windows)
  function findTabByPath(filePath) {
    const target = filePath.toLowerCase()
    return tabs.value.find((t) => t.filePath.toLowerCase() === target) || null
  }

  // ── Init ──────────────────────────────────────────────────────

  // Ensure at least one tab exists on first access
  function ensureTab() {
    if (tabs.value.length === 0) {
      createTab()
    }
  }

  return {
    tabs,
    activeId,
    activeIndex,
    activeTab,
    tabCount,
    createTab,
    closeTab,
    switchToTab,
    switchToNext,
    switchToPrev,
    updateActiveContent,
    updateActiveCursor,
    markActiveSaved,
    loadFileToActive,
    setActiveFilePath,
    resetActive,
    findTabByPath,
    ensureTab
  }
})
