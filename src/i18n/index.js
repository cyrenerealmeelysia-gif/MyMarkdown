import { ref } from 'vue'
import en from './en.js'
import zhCN from './zh-CN.js'

const LOCALES = { en, 'zh-CN': zhCN }
const DEFAULT_LOCALE = 'zh-CN'

const currentLocale = ref(DEFAULT_LOCALE)

/**
 * Reactive i18n composable.
 *
 * Usage:
 *   const { t } = useI18n()
 *   t('menu.file')           // → 文件 or File
 *   t('tabs.closeConfirm', { name: 'doc.md' })
 *
 * Language is persisted via electron-store (key: 'i18n.locale').
 */
export function useI18n() {
  function t(key, params) {
    const strings = LOCALES[currentLocale.value] || LOCALES[DEFAULT_LOCALE]
    let text = strings[key]
    if (text === undefined) {
      console.warn(`[i18n] Missing key: ${key}`)
      text = key
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v))
      }
    }
    return text
  }

  function setLocale(locale) {
    if (LOCALES[locale]) {
      currentLocale.value = locale
      const api = window.electronAPI
      if (api) {
        api.setPrefs('i18n', { locale })
        api.rebuildMenu?.()
      }
    }
  }

  function loadLocale() {
    return currentLocale.value
  }

  return { t, setLocale, loadLocale, currentLocale }
}
