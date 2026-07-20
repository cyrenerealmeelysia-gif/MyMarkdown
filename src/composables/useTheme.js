import { watch, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editor.js'

// Theme CSS for injection (only the custom themes — light/dark are in variables.css)
const THEME_CSS = {
  sepia: `:root,[data-theme='light']{--color-bg:#fbf0d9;--color-bg-secondary:#f4e4c1;--color-bg-tertiary:#e8d5a8;--color-text:#5b4636;--color-text-secondary:#7d6b5c;--color-text-muted:#a39080;--color-border:#d6c5a9;--color-border-light:#e8d5a8;--color-accent:#b5592c;--color-accent-hover:#8b4513;--color-danger:#c0392b;--color-toolbar-bg:#f4e4c1;--color-toolbar-hover:#e8d5a8;--color-toolbar-active:#d6c5a9;--color-statusbar-bg:#f4e4c1;--color-resize-handle:#d6c5a9;--color-resize-handle-hover:#b5592c;--color-scrollbar:#d6c5a9;--color-scrollbar-hover:#b5592c}[data-theme='dark']{--color-bg:#3b3226;--color-bg-secondary:#4a3f31;--color-bg-tertiary:#5c4f3f;--color-text:#e8dcc8;--color-text-secondary:#c4b49a;--color-text-muted:#9a8b74;--color-border:#6b5c4a;--color-border-light:#5c4f3f;--color-accent:#e8965c;--color-accent-hover:#f5b887;--color-danger:#e74c3c;--color-toolbar-bg:#4a3f31;--color-toolbar-hover:#5c4f3f;--color-toolbar-active:#6b5c4a;--color-statusbar-bg:#4a3f31;--color-resize-handle:#6b5c4a;--color-resize-handle-hover:#e8965c;--color-scrollbar:#6b5c4a;--color-scrollbar-hover:#8a7660}`,
  nord: `:root,[data-theme='light']{--color-bg:#eceff4;--color-bg-secondary:#e5e9f0;--color-bg-tertiary:#d8dee9;--color-text:#2e3440;--color-text-secondary:#4c566a;--color-text-muted:#81a1c1;--color-border:#d8dee9;--color-border-light:#e5e9f0;--color-accent:#5e81ac;--color-accent-hover:#81a1c1;--color-danger:#bf616a;--color-toolbar-bg:#e5e9f0;--color-toolbar-hover:#d8dee9;--color-toolbar-active:#c8d0e0;--color-statusbar-bg:#e5e9f0;--color-resize-handle:#d8dee9;--color-resize-handle-hover:#5e81ac;--color-scrollbar:#d8dee9;--color-scrollbar-hover:#81a1c1}[data-theme='dark']{--color-bg:#2e3440;--color-bg-secondary:#3b4252;--color-bg-tertiary:#434c5e;--color-text:#eceff4;--color-text-secondary:#d8dee9;--color-text-muted:#81a1c1;--color-border:#4c566a;--color-border-light:#434c5e;--color-accent:#88c0d0;--color-accent-hover:#8fbcbb;--color-danger:#bf616a;--color-toolbar-bg:#3b4252;--color-toolbar-hover:#434c5e;--color-toolbar-active:#4c566a;--color-statusbar-bg:#3b4252;--color-resize-handle:#4c566a;--color-resize-handle-hover:#88c0d0;--color-scrollbar:#4c566a;--color-scrollbar-hover:#5e81ac}`,
  dark: `:root,[data-theme='light']{--color-bg:#1e1e2e;--color-bg-secondary:#282840;--color-bg-tertiary:#333350;--color-text:#cdd6f4;--color-text-secondary:#9399b2;--color-text-muted:#6c7086;--color-border:#45475a;--color-border-light:#333350;--color-accent:#89b4fa;--color-accent-hover:#b4d0fb;--color-danger:#f38ba8;--color-toolbar-bg:#282840;--color-toolbar-hover:#333350;--color-toolbar-active:#45475a;--color-statusbar-bg:#282840;--color-resize-handle:#45475a;--color-resize-handle-hover:#89b4fa;--color-scrollbar:#45475a;--color-scrollbar-hover:#585b70}[data-theme='dark']{--color-bg:#1e1e2e;--color-bg-secondary:#181825;--color-bg-tertiary:#313244;--color-text:#cdd6f4;--color-text-secondary:#a6adc8;--color-text-muted:#6c7086;--color-border:#45475a;--color-border-light:#313244;--color-accent:#89b4fa;--color-accent-hover:#b4d0fb;--color-danger:#f38ba8;--color-toolbar-bg:#181825;--color-toolbar-hover:#313244;--color-toolbar-active:#45475a;--color-statusbar-bg:#181825;--color-resize-handle:#45475a;--color-resize-handle-hover:#89b4fa;--color-scrollbar:#45475a;--color-scrollbar-hover:#585b70}`
}

export function useTheme() {
  const editorStore = useEditorStore()
  let mediaQuery = null
  let customStyleEl = null

  function applyColorScheme(scheme) {
    if (scheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', scheme)
    }
    // Shiki / CodeMirror pick up data-theme automatically via CSS variables
  }

  function applyCustomTheme(themeName) {
    // Remove previous custom style
    if (customStyleEl) {
      customStyleEl.remove()
      customStyleEl = null
    }

    if (themeName === 'light') return // light is the default in variables.css

    const css = THEME_CSS[themeName]
    if (!css) return

    customStyleEl = document.createElement('style')
    customStyleEl.id = 'custom-theme'
    customStyleEl.textContent = css
    document.head.appendChild(customStyleEl)
  }

  function onSystemThemeChange(e) {
    if (editorStore.theme === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
  }

  watch(() => editorStore.theme, applyColorScheme, { immediate: true })
  watch(() => editorStore.customTheme, applyCustomTheme, { immediate: true })

  onMounted(() => {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemThemeChange)
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', onSystemThemeChange)
    }
    if (customStyleEl) {
      customStyleEl.remove()
      customStyleEl = null
    }
  })

  function cycleTheme() {
    const themes = ['light', 'dark', 'sepia', 'nord']
    const current = editorStore.customTheme || 'light'
    const idx = themes.indexOf(current)
    const next = themes[(idx + 1) % themes.length]
    editorStore.setCustomTheme(next)
  }

  return { applyColorScheme, cycleTheme }
}
