import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTabsStore } from './tabs.js'

export const useDocumentStore = defineStore('document', () => {
  // ── Active-tab helpers ────────────────────────────────────────

  function _tabs() {
    try { return useTabsStore() } catch { return null }
  }

  function _active() {
    return _tabs()?.activeTab ?? null
  }

  // ── State (delegates to tabs store when available) ────────────

  const filePath = computed({
    get: () => _tabs()?.activeTab?.filePath ?? '',
    set: (v) => { const t = _active(); if (t) t.filePath = v }
  })

  const fileName = computed({
    get: () => _tabs()?.activeTab?.fileName ?? 'Untitled.md',
    set: (v) => { const t = _active(); if (t) t.fileName = v }
  })

  // content and savedContent delegate to the active tab.
  // We DON'T use a computed setter here because we need
  // to be certain which tab we're writing to. Instead,
  // updateContent and markSaved directly target the correct tab.
  const _fallbackContent = ref('')
  const _fallbackSaved = ref('')

  // Read-only derived view of active tab's content
  const content = computed(() => {
    const t = _tabs()
    return t?.activeTab ? t.activeTab.content : _fallbackContent.value
  })

  const savedContent = computed(() => {
    const t = _tabs()
    return t?.activeTab ? t.activeTab.savedContent : _fallbackSaved.value
  })

  const cursorLine = computed({
    get: () => _tabs()?.activeTab?.cursorLine ?? 1,
    set: (v) => { const t = _active(); if (t) t.cursorLine = v }
  })

  const cursorColumn = computed({
    get: () => _tabs()?.activeTab?.cursorColumn ?? 1,
    set: (v) => { const t = _active(); if (t) t.cursorColumn = v }
  })

  // ── Derived ───────────────────────────────────────────────────

  const isDirty = computed(() => content.value !== savedContent.value)

  const wordCount = computed(() => {
    const text = content.value.trim()
    if (!text) return 0
    const cjk = (text.match(/[一-鿿㐀-䶿]/g) || []).length
    const words = text
      .replace(/[一-鿿㐀-䶿]/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length
    return cjk + words
  })

  // ── Actions ───────────────────────────────────────────────────

  function loadFile({ path, name, content: fileContent }) {
    const tabs = _tabs()
    if (tabs?.activeTab) {
      tabs.loadFileToActive({ path, name, content: fileContent })
    } else {
      _fallbackContent.value = fileContent
      _fallbackSaved.value = fileContent
    }
  }

  function updateContent(newContent) {
    const tab = _active()
    if (tab) {
      tab.content = newContent
    } else {
      _fallbackContent.value = newContent
    }
  }

  function markSaved() {
    const tab = _active()
    if (tab) {
      tab.savedContent = tab.content
    } else {
      _fallbackSaved.value = _fallbackContent.value
    }
  }

  function setCursor(line, column) {
    const tab = _active()
    if (tab) {
      tab.cursorLine = line
      tab.cursorColumn = column
    }
  }

  function reset() {
    const tab = _active()
    if (tab) {
      tab.fileName = `Untitled.md`
      tab.filePath = ''
      tab.content = ''
      tab.savedContent = ''
      tab.cursorLine = 1
      tab.cursorColumn = 1
    } else {
      _fallbackContent.value = ''
      _fallbackSaved.value = ''
    }
  }

  return {
    filePath,
    fileName,
    content,
    savedContent,
    cursorLine,
    cursorColumn,
    isDirty,
    wordCount,
    loadFile,
    updateContent,
    markSaved,
    setCursor,
    reset
  }
})
