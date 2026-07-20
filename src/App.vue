<script setup>
import { onErrorCaptured, onMounted, onUnmounted, ref } from 'vue'
import AppShell from './components/layout/AppShell.vue'
import { useEditorStore } from './stores/editor.js'
import { useTabsStore } from './stores/tabs.js'
import { useFileIO } from './composables/useFileIO.js'
import { useI18n } from './i18n/index.js'

const error = ref(null)
const preferencesLoaded = ref(false)

const { openFilePath } = useFileIO()

let unsubOpenFile = null

onErrorCaptured((err, instance, info) => {
  console.error('App error:', err, info)
  error.value = String(err)
  return false // prevent propagation
})

// Load saved preferences on startup
onMounted(async () => {
  // Ensure at least one tab exists
  useTabsStore().ensureTab()

  const api = window.electronAPI
  if (!api) {
    preferencesLoaded.value = true
    return
  }

  // Register file-open listener BEFORE any async work.
  // The main process sends 'open-file' during did-finish-load,
  // which races with onMounted — listener must be ready immediately.
  if (api.onOpenFile) {
    unsubOpenFile = api.onOpenFile(async (filePath) => {
      await openFilePath(filePath)
    })
  }

  try {
    const prefs = await api.getPrefs('editor')
    if (prefs) {
      const store = useEditorStore()
      if (prefs.fontFamily) store.setFontFamily(prefs.fontFamily)
      if (prefs.fontSize) store.setFontSize(prefs.fontSize)
      if (prefs.tabSize) store.setTabSize(prefs.tabSize)
      if (prefs.defaultMode) store.setMode(prefs.defaultMode)
      if (prefs.customTheme) store.setCustomTheme(prefs.customTheme)
      if (prefs.spellCheckEnabled !== undefined) store.setSpellCheckEnabled(prefs.spellCheckEnabled)
      if (prefs.autoSaveEnabled !== undefined) store.setAutoSaveEnabled(prefs.autoSaveEnabled)
      if (prefs.autoSaveInterval) store.setAutoSaveInterval(prefs.autoSaveInterval)
      console.log('[Preferences] Loaded from store')
    }

    // Load language preference
    const i18nPrefs = await api.getPrefs('i18n')
    if (i18nPrefs?.locale) {
      useI18n().setLocale(i18nPrefs.locale)
    }
  } catch (err) {
    console.warn('[Preferences] Failed to load:', err.message)
  }

  preferencesLoaded.value = true
})

onUnmounted(() => {
  if (unsubOpenFile) unsubOpenFile()
})
</script>

<template>
  <div v-if="error" class="app-error">
    <h2>Render Error</h2>
    <pre>{{ error }}</pre>
  </div>
  <AppShell v-else-if="preferencesLoaded" />
  <div v-else class="loading-screen">Loading...</div>
</template>

<style>
#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  padding: 40px;
  background: #1a1a2e;
  color: #e74c3c;
  font-family: monospace;
}

.app-error h2 {
  margin-bottom: 16px;
  font-size: 20px;
}

.app-error pre {
  max-width: 100%;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  color: var(--color-text-secondary);
  font-size: 14px;
  background: var(--color-bg);
}
</style>
