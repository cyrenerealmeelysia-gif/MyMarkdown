<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { EditorView } from '@codemirror/view'
import {
  setSearchHighlights,
  clearSearchHighlights,
  buildSearchDecorations
} from '../../utils/search-decorations.js'
import { useI18n } from '../../i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  editorView: { type: Object, default: null }
})

const emit = defineEmits(['close'])

// ── State ──────────────────────────────────────────────────────

const visible = ref(false)
const showReplace = ref(false)
const query = ref('')
const replaceText = ref('')
const caseSensitive = ref(false)
const useRegex = ref(false)
const matches = ref([])
const currentIndex = ref(0)

const searchInput = ref(null)
const replaceInput = ref(null)

// ── Computed ───────────────────────────────────────────────────

const matchLabel = computed(() => {
  if (!query.value) return ''
  if (matches.value.length === 0) return t('search.noResults')
  return t('search.matchCount', { current: currentIndex.value + 1, total: matches.value.length })
})

// ── Core: find all matches ────────────────────────────────────

function findAllMatches() {
  if (!props.editorView || !query.value) {
    matches.value = []
    currentIndex.value = 0
    clearDecorations()
    return
  }

  const text = props.editorView.state.doc.toString()

  // Build search RegExp. SearchCursor from @codemirror/search doesn't
  // accept RegExp objects (it calls .normalize() on the query, which fails
  // for RegExp), so we use standard RegExp.exec() on the plain text instead.
  let searchRegex
  if (useRegex.value) {
    // Prevent ReDoS: limit regex length and reject nested quantifiers
    if (query.value.length > 200 || /(\+\+|\*\*|\{\d+,\}\{\d+,|[+*?]\{[2-9])/.test(query.value)) {
      matches.value = []
      currentIndex.value = 0
      clearDecorations()
      return
    }
    try {
      searchRegex = new RegExp(query.value, 'gm' + (caseSensitive.value ? '' : 'i'))
    } catch {
      matches.value = []
      currentIndex.value = 0
      clearDecorations()
      return
    }
  } else {
    const escaped = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    searchRegex = new RegExp(escaped, 'gm' + (caseSensitive.value ? '' : 'i'))
  }

  const result = []
  let match
  while ((match = searchRegex.exec(text)) !== null) {
    result.push({ from: match.index, to: match.index + match[0].length })
    // Prevent infinite loop on zero-length matches
    if (match.index === searchRegex.lastIndex) searchRegex.lastIndex++
  }

  matches.value = result
  currentIndex.value = result.length > 0 ? 0 : 0
  applyDecorations()
}

// ── Decoration management ──────────────────────────────────────

function applyDecorations() {
  if (!props.editorView) return

  if (matches.value.length === 0) {
    clearDecorations()
    return
  }

  props.editorView.dispatch({
    effects: setSearchHighlights.of(
      buildSearchDecorations(matches.value, currentIndex.value)
    )
  })
}

function clearDecorations() {
  if (!props.editorView) return
  props.editorView.dispatch({
    effects: clearSearchHighlights.of(null)
  })
}

// ── Navigation ─────────────────────────────────────────────────

function findNext() {
  if (matches.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % matches.value.length
  applyDecorations()
  scrollToCurrentMatch()
}

function findPrev() {
  if (matches.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + matches.value.length) % matches.value.length
  applyDecorations()
  scrollToCurrentMatch()
}

function scrollToCurrentMatch() {
  if (!props.editorView || matches.value.length === 0) return
  const pos = matches.value[currentIndex.value].from
  props.editorView.dispatch({
    effects: EditorView.scrollIntoView(pos, { y: 'center' })
  })
}

// ── Replace ────────────────────────────────────────────────────

function replaceOne() {
  if (!props.editorView || matches.value.length === 0) return

  const match = matches.value[currentIndex.value]
  props.editorView.dispatch({
    changes: { from: match.from, to: match.to, insert: replaceText.value }
  })

  // Recompute matches after the change
  nextTick(() => {
    findAllMatches()
  })
}

function replaceAll() {
  if (!props.editorView || matches.value.length === 0) return

  // Process replacements from end to start so positions stay valid
  const changes = [...matches.value]
    .sort((a, b) => b.from - a.from)
    .map((m) => ({ from: m.from, to: m.to, insert: replaceText.value }))

  props.editorView.dispatch({ changes })

  nextTick(() => {
    findAllMatches()
  })
}

// ── Watchers ───────────────────────────────────────────────────

watch([query, caseSensitive, useRegex], () => {
  findAllMatches()
})

// ── Public API ─────────────────────────────────────────────────

function open(findOnly = true) {
  visible.value = true
  showReplace.value = !findOnly
  nextTick(() => {
    if (showReplace.value) {
      replaceInput.value?.focus()
    } else {
      searchInput.value?.focus()
      searchInput.value?.select()
    }
  })
}

function close() {
  visible.value = false
  showReplace.value = false
  query.value = ''
  replaceText.value = ''
  matches.value = []
  currentIndex.value = 0
  clearDecorations()
  emit('close')
  // Return focus to editor
  props.editorView?.focus()
}

function onSearchKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (e.shiftKey) {
      findPrev()
    } else {
      findNext()
    }
  }
}

function onReplaceKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (e.shiftKey) {
      findPrev()
    } else {
      replaceOne()
    }
  }
}

defineExpose({ open, close })
</script>

<template>
  <div v-if="visible" class="search-bar" @keydown.escape="close">
    <!-- Search row -->
    <div class="search-row">
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85-.017.016zm-5.242.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
        </svg>
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="search-input"
          placeholder="Find"
          @keydown="onSearchKeyDown"
        />
      </div>

      <!-- Toggle buttons -->
      <button
        class="search-btn"
        :class="{ active: caseSensitive }"
        :title="t('search.caseSensitive')"
        @click="caseSensitive = !caseSensitive"
      >Aa</button>
      <button
        class="search-btn"
        :class="{ active: useRegex }"
        :title="t('search.regex')"
        @click="useRegex = !useRegex"
      >.*</button>

      <!-- Navigation -->
      <span class="match-count">{{ matchLabel }}</span>
      <button class="search-btn" title="Previous match" @click="findPrev">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M8 4l5 5H3z"/></svg>
      </button>
      <button class="search-btn" title="Next match" @click="findNext">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M8 12L3 7h10z"/></svg>
      </button>

      <!-- Close -->
      <button class="search-btn" title="Close (Escape)" @click="close">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
      </button>
    </div>

    <!-- Replace row -->
    <div v-if="showReplace" class="replace-row">
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
          <path d="M1 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm10.854-4.646a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L8.5 7.293l2.646-2.647a.5.5 0 0 1 .708.208z"/>
        </svg>
        <input
          ref="replaceInput"
          v-model="replaceText"
          type="text"
          class="search-input"
          placeholder="Replace with"
          @keydown="onReplaceKeyDown"
        />
      </div>
      <button class="search-btn replace-btn" @click="replaceOne">{{ t('search.replace') }}</button>
      <button class="search-btn replace-btn" @click="replaceAll">{{ t('search.replaceAll') }}</button>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  padding: 4px 8px;
  gap: 4px;
  user-select: none;
  z-index: 10;
}

.search-row,
.replace-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  max-width: 360px;
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 28px;
  padding: 0 8px 0 26px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.search-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  min-width: 28px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.search-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text);
}

.search-btn.active {
  background-color: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.match-count {
  font-size: 12px;
  color: var(--color-text-muted);
  min-width: 60px;
  text-align: center;
  white-space: nowrap;
}

.replace-btn {
  font-size: 12px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
}

.replace-btn:hover {
  background-color: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}
</style>
