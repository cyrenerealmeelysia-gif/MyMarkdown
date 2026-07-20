<script setup>
import { ref, computed } from 'vue'
import { useEditorStore } from '../../stores/editor.js'
import { useI18n } from '../../i18n/index.js'
import Modal from '../common/Modal.vue'

const emit = defineEmits(['close'])
const editorStore = useEditorStore()
const { t, setLocale, currentLocale } = useI18n()

// Local copies for editing
const fontFamily = ref(editorStore.fontFamily)
const fontSize = ref(editorStore.fontSize)
const tabSize = ref(editorStore.tabSize)
const defaultMode = ref(editorStore.mode)
const customTheme = ref(editorStore.customTheme)
const spellCheckEnabled = ref(editorStore.spellCheckEnabled)
const autoSaveEnabled = ref(editorStore.autoSaveEnabled)
const autoSaveInterval = ref(editorStore.autoSaveInterval)
const locale = ref(currentLocale.value)

const FONT_OPTIONS = [
  "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
  "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
  "'Source Code Pro', 'Cascadia Code', 'Consolas', monospace",
  "'Consolas', 'Courier New', monospace",
  "'Monaco', 'Consolas', monospace",
  "'Ubuntu Mono', 'Consolas', monospace",
  "monospace"
]

const FONT_LABELS = computed(() => [
  'Cascadia Code', 'Fira Code', 'JetBrains Mono',
  'Source Code Pro', 'Consolas', 'Monaco', 'Ubuntu Mono', t('settings.systemDefault')
])

const INTERVAL_OPTIONS = computed(() => [
  { value: 10000, label: t('settings.interval10s') },
  { value: 30000, label: t('settings.interval30s') },
  { value: 60000, label: t('settings.interval1m') },
  { value: 120000, label: t('settings.interval2m') },
  { value: 300000, label: t('settings.interval5m') }
])

const MODE_OPTIONS = computed(() => [
  { id: 'split', label: t('settings.modeSplit') },
  { id: 'source', label: t('settings.modeSource') },
  { id: 'preview', label: t('settings.modePreview') }
])

const THEME_OPTIONS = computed(() => [
  { id: 'light', label: t('settings.themeLight'), colors: ['#fff','#f6f8fa','#0969da'] },
  { id: 'dark', label: t('settings.themeDark'), colors: ['#1e1e2e','#282840','#89b4fa'] },
  { id: 'sepia', label: t('settings.themeSepia'), colors: ['#fbf0d9','#f4e4c1','#b5592c'] },
  { id: 'nord', label: t('settings.themeNord'), colors: ['#eceff4','#e5e9f0','#5e81ac'] }
])

function onSave() {
  if (locale.value !== currentLocale.value) {
    setLocale(locale.value)
  }
  editorStore.setFontFamily(fontFamily.value)
  editorStore.setFontSize(fontSize.value)
  editorStore.setTabSize(tabSize.value)
  editorStore.setCustomTheme(customTheme.value)
  editorStore.setSpellCheckEnabled(spellCheckEnabled.value)
  editorStore.setAutoSaveEnabled(autoSaveEnabled.value)
  editorStore.setAutoSaveInterval(autoSaveInterval.value)

  const api = window.electronAPI
  if (api) {
    api.setPrefs('editor', {
      fontFamily: fontFamily.value,
      fontSize: fontSize.value,
      tabSize: tabSize.value,
      defaultMode: defaultMode.value,
      customTheme: customTheme.value,
      spellCheckEnabled: spellCheckEnabled.value,
      autoSaveEnabled: autoSaveEnabled.value,
      autoSaveInterval: autoSaveInterval.value
    })
  }

  emit('close')
}
</script>

<template>
  <Modal :title="t('settings.title')" width="520px" @close="$emit('close')">
    <div class="settings-form">
      <!-- Font family -->
      <div class="setting-group">
        <label class="setting-label">{{ t('settings.font') }}</label>
        <select v-model="fontFamily" class="setting-select">
          <option
            v-for="(font, i) in FONT_OPTIONS"
            :key="font"
            :value="font"
          >{{ FONT_LABELS[i] }}</option>
        </select>
      </div>

      <!-- Font size -->
      <div class="setting-group">
        <label class="setting-label">{{ t('settings.fontSize') }}: <strong>{{ fontSize }}px</strong></label>
        <input
          v-model.number="fontSize"
          type="range"
          min="12"
          max="32"
          step="1"
          class="setting-range"
        />
        <div class="range-labels">
          <span>12</span><span>32</span>
        </div>
      </div>

      <!-- Tab size -->
      <div class="setting-group">
        <label class="setting-label">{{ t('settings.tabSize') }}</label>
        <div class="setting-options">
          <label
            v-for="n in [2, 4, 8]"
            :key="n"
            class="option-chip"
            :class="{ active: tabSize === n }"
          >
            <input v-model="tabSize" type="radio" :value="n" />
            {{ n }}
          </label>
        </div>
      </div>

      <!-- Default mode -->
      <div class="setting-group">
        <label class="setting-label">{{ t('settings.defaultMode') }}</label>
        <div class="setting-options">
          <label
            v-for="m in MODE_OPTIONS"
            :key="m.id"
            class="option-chip"
            :class="{ active: defaultMode === m.id }"
          >
            <input v-model="defaultMode" type="radio" :value="m.id" />
            {{ m.label }}
          </label>
        </div>
      </div>

      <!-- Theme -->
      <div class="setting-group">
        <label class="setting-label">{{ t('settings.theme') }}</label>
        <div class="theme-grid">
          <label
            v-for="th in THEME_OPTIONS"
            :key="th.id"
            class="theme-card"
            :class="{ active: customTheme === th.id }"
          >
            <input v-model="customTheme" type="radio" :value="th.id" />
            <div class="theme-preview">
              <span
                v-for="c in th.colors"
                :key="c"
                class="theme-swatch"
                :style="{ background: c }"
              ></span>
            </div>
            <span class="theme-name">{{ th.label }}</span>
          </label>
        </div>
      </div>

      <!-- Language -->
      <div class="setting-group">
        <label class="setting-label">{{ t('settings.language') }}</label>
        <select v-model="locale" class="setting-select">
          <option value="zh-CN">{{ t('settings.langZh') }}</option>
          <option value="en">{{ t('settings.langEn') }}</option>
        </select>
      </div>

      <!-- Auto-save -->
      <div class="setting-group">
        <label class="setting-label setting-switch">
          <span>{{ t('settings.autoSave') }}</span>
          <label class="toggle">
            <input v-model="autoSaveEnabled" type="checkbox" />
            <span class="toggle-track"></span>
          </label>
        </label>
      </div>

      <div class="setting-group" v-if="autoSaveEnabled">
        <label class="setting-label">{{ t('settings.autoSaveInterval') }}</label>
        <select v-model="autoSaveInterval" class="setting-select">
          <option
            v-for="opt in INTERVAL_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >{{ opt.label }}</option>
        </select>
      </div>

      <!-- Spell check -->
      <div class="setting-group">
        <label class="setting-label setting-switch">
          <span>{{ t('settings.spellCheck') }}</span>
          <label class="toggle">
            <input v-model="spellCheckEnabled" type="checkbox" />
            <span class="toggle-track"></span>
          </label>
        </label>
      </div>

      <!-- Actions -->
      <div class="settings-actions">
        <button class="btn btn-secondary" @click="$emit('close')">{{ t('settings.cancel') }}</button>
        <button class="btn btn-primary" @click="onSave">{{ t('settings.save') }}</button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.setting-label strong {
  color: var(--color-accent);
}

.setting-select {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.setting-select:focus {
  border-color: var(--color-accent);
}

.setting-range {
  width: 100%;
  accent-color: var(--color-accent);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-tertiary, #999);
}

.setting-options {
  display: flex;
  gap: 8px;
}

.option-chip {
  position: relative;
  padding: 4px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text);
  transition: all 0.15s;
}

.option-chip input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.option-chip.active {
  border-color: var(--color-accent);
  background: var(--color-active, rgba(100, 160, 255, 0.12));
  color: var(--color-accent);
  font-weight: 500;
}

.setting-switch {
  justify-content: space-between;
}

/* Toggle switch */
.toggle {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-track {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background-color: var(--color-border);
  transition: background-color 0.2s;
}

.toggle-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}

.toggle input:checked + .toggle-track {
  background-color: var(--color-accent);
}

.toggle input:checked + .toggle-track::after {
  transform: translateX(18px);
}

/* Buttons */
.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 7px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:hover { opacity: 0.85; }

.btn-primary {
  background-color: var(--color-accent);
  color: #fff;
}

.btn-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

/* Theme cards */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.theme-card input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.theme-card.active {
  border-color: var(--color-accent);
}

.theme-preview {
  display: flex;
  gap: 3px;
}

.theme-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1);
}

.theme-name {
  font-size: 12px;
  color: var(--color-text);
}
</style>
