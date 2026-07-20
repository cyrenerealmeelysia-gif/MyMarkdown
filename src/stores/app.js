import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const recentFiles = ref([])
  const preferences = ref({})

  function addRecentFile(file) {
    recentFiles.value = [
      file,
      ...recentFiles.value.filter(f => f.path !== file.path)
    ].slice(0, 10)
  }

  function removeRecentFile(filePath) {
    recentFiles.value = recentFiles.value.filter(f => f.path !== filePath)
  }

  function loadPreferences(prefs) {
    preferences.value = { ...preferences.value, ...prefs }
  }

  return {
    recentFiles,
    preferences,
    addRecentFile,
    removeRecentFile,
    loadPreferences
  }
})
