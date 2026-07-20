import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  const mode = ref('split')       // 'split' | 'source' | 'preview' | 'wysiwyg'
  const previousNonWysiwygMode = ref('split')
  const theme = ref('system')     // 'light' | 'dark' | 'system'
  const customTheme = ref('light') // 'light' | 'dark' | 'sepia' | 'nord'
  const fontFamily = ref("'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace")
  const fontSize = ref(16)
  const tabSize = ref(2)
  const autoSaveEnabled = ref(true)
  const autoSaveInterval = ref(30000)  // milliseconds
  const showOutline = ref(false)
  const showSettingsDialog = ref(false)
  const spellCheckEnabled = ref(false)
  const wysiwygScrollLine = ref(0) // line to scroll to when entering WYSIWYG

  function setMode(newMode) {
    // Remember last non-wysiwyg mode so we can restore it
    if (newMode !== 'wysiwyg' && mode.value !== 'wysiwyg') {
      previousNonWysiwygMode.value = newMode
    }
    mode.value = newMode
  }

  function toggleWysiwyg(cursorLine = 0) {
    if (mode.value === 'wysiwyg') {
      setMode(previousNonWysiwygMode.value)
    } else {
      if (mode.value !== 'wysiwyg') {
        previousNonWysiwygMode.value = mode.value
      }
      wysiwygScrollLine.value = cursorLine
      mode.value = 'wysiwyg'
    }
  }

  function setTheme(newTheme) {
    theme.value = newTheme
  }

  function setCustomTheme(name) {
    customTheme.value = name
  }

  function setFontFamily(family) {
    fontFamily.value = family
  }

  function setFontSize(size) {
    fontSize.value = size
  }

  function setTabSize(size) {
    tabSize.value = size
  }

  function setAutoSaveEnabled(enabled) {
    autoSaveEnabled.value = enabled
  }

  function setAutoSaveInterval(ms) {
    autoSaveInterval.value = ms
  }

  function setSpellCheckEnabled(enabled) {
    spellCheckEnabled.value = enabled
  }

  function toggleOutline() {
    showOutline.value = !showOutline.value
  }

  function openSettings() {
    showSettingsDialog.value = true
  }

  function closeSettings() {
    showSettingsDialog.value = false
  }

  return {
    mode,
    theme,
    customTheme,
    setCustomTheme,
    fontFamily,
    fontSize,
    tabSize,
    autoSaveEnabled,
    autoSaveInterval,
    showOutline,
    showSettingsDialog,
    spellCheckEnabled,
    setSpellCheckEnabled,
    wysiwygScrollLine,
    setMode,
    toggleWysiwyg,
    setTheme,
    setFontFamily,
    setFontSize,
    setTabSize,
    setAutoSaveEnabled,
    setAutoSaveInterval,
    toggleOutline,
    openSettings,
    closeSettings
  }
})
