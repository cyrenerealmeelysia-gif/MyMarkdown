<script setup>
import { ref, shallowRef, onMounted, onUnmounted, watch, nextTick, computed, useTemplateRef } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { defaultHighlightStyle, syntaxHighlighting, indentUnit } from '@codemirror/language'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { highlightSelectionMatches } from '@codemirror/search'
import { useDocumentStore } from '../../stores/document.js'
import { useEditorStore } from '../../stores/editor.js'
import { searchHighlightField } from '../../utils/search-decorations.js'
import { spellCheckPlugin, checkWord, getSuggestions } from '../../composables/useSpellCheck.js'
import { useI18n } from '../../i18n/index.js'
import '../../styles/editor.css'

const docStore = useDocumentStore()
const editorStore = useEditorStore()
const { t } = useI18n()

const editorHost = useTemplateRef('editorHost')
const editorView = shallowRef(null)
let isUpdatingFromStore = false
const tabCompartment = new Compartment()
const spellCompartment = new Compartment()

// Compartments for features disabled in large-file mode
const bracketCompartment = new Compartment()
const closeBracketsCompartment = new Compartment()
const highlightMatchesCompartment = new Compartment()
const LARGE_FILE_THRESHOLD = 100_000 // bytes

// ── Spell check context menu ──────────────────────────────────
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  word: '',
  suggestions: [],
  wordFrom: 0,
  wordTo: 0
})

function hideContextMenu() {
  contextMenu.value.visible = false
}

function getWordAtPos(view, pos) {
  const doc = view.state.doc
  const line = doc.lineAt(pos)
  const lineText = line.text
  const col = pos - line.from

  // Find word boundaries
  let start = col, end = col
  while (start > 0 && /[A-Za-z]/.test(lineText[start - 1])) start--
  while (end < lineText.length && /[A-Za-z]/.test(lineText[end])) end++

  const word = lineText.slice(start, end)
  if (word.length < 2) return null

  return {
    word,
    from: line.from + start,
    to: line.from + end
  }
}

function onEditorContextMenu(e) {
  if (!editorStore.spellCheckEnabled) return

  const view = editorView.value
  if (!view) return

  // Get document position from mouse coordinates
  const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
  if (pos === null) return

  const wordInfo = getWordAtPos(view, pos)
  if (!wordInfo) return

  // Check if misspelled
  const isCorrect = checkWord(wordInfo.word)
  if (isCorrect !== false) return // null (not loaded) or true → don't show

  // Get suggestions
  const suggestions = getSuggestions(wordInfo.word)
  if (suggestions.length === 0) return

  e.preventDefault()
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    word: wordInfo.word,
    suggestions: suggestions.slice(0, 8), // top 8 suggestions
    wordFrom: wordInfo.from,
    wordTo: wordInfo.to
  }
}

function applySuggestion(suggestion) {
  const view = editorView.value
  if (!view) return

  const { wordFrom, wordTo } = contextMenu.value
  view.dispatch({
    changes: { from: wordFrom, to: wordTo, insert: suggestion }
  })
  view.focus()
  hideContextMenu()
}

function onContextMenuMouseDown(e) {
  // Prevent the menu click from stealing focus/selection from the editor
  e.preventDefault()
}


// Create the editor
function createEditor() {
  const extensions = [
    // Markdown language
    markdown({ base: markdownLanguage }),

    // Editor features (always enabled)
    lineNumbers(),
    highlightActiveLine(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

    // Expensive features — disabled for large files via compartments
    bracketCompartment.of(bracketMatching()),
    closeBracketsCompartment.of(closeBrackets()),
    highlightMatchesCompartment.of(highlightSelectionMatches()),

    // Indent configuration (dynamic via compartment)
    tabCompartment.of(indentUnit.of(' '.repeat(editorStore.tabSize))),

    // Keymaps
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab
    ]),

    // History (undo/redo)
    history(),

    // Styling — uses CSS variables so font/size react without CodeMirror reconfiguration
    EditorView.theme({
      '&': {
        height: '100%',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)'
      },
      '.cm-content': {
        fontFamily: 'var(--cm-font-family)',
        fontSize: 'var(--cm-font-size)'
      },
      '.cm-gutters': {
        fontFamily: 'var(--cm-font-family)',
        fontSize: 'var(--cm-font-size)'
      }
    }),

    // Search highlight decorations (managed by SearchBar via StateEffects)
    searchHighlightField,

    // Spell check (togglable via Compartment)
    spellCompartment.of([]),

    // Update syncing
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !isUpdatingFromStore) {
        docStore.updateContent(update.state.doc.toString())
      }
      // Update cursor position
      if (update.selectionSet) {
        const pos = update.state.selection.main.head
        const line = update.state.doc.lineAt(pos)
        docStore.setCursor(line.number, pos - line.from + 1)
      }
    })
  ]

  const state = EditorState.create({
    doc: docStore.content,
    extensions
  })

  editorView.value = new EditorView({
    state,
    parent: editorHost.value
  })
}

// Sync store → editor (when loading files, etc.)
watch(() => docStore.content, (newContent) => {
  if (editorView.value && !isUpdatingFromStore) {
    const currentContent = editorView.value.state.doc.toString()
    if (newContent !== currentContent) {
      isUpdatingFromStore = true
      editorView.value.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: newContent
        }
      })
      nextTick(() => {
        isUpdatingFromStore = false
      })
    }
  }
})

// Toggle spell check via compartment
watch(() => editorStore.spellCheckEnabled, () => {
  syncSpellCheck()
})

// Large-file mode — disable expensive extensions when doc exceeds threshold
watch(() => docStore.content.length, () => {
  syncLargeFileMode()
})

// Dynamic tab size — use Compartment.reconfigure (safe, it IS a StateEffect)
watch(() => editorStore.tabSize, (size) => {
  if (editorView.value) {
    editorView.value.dispatch({
      effects: tabCompartment.reconfigure(indentUnit.of(' '.repeat(size)))
    })
  }
})

// Computed CSS variables for CodeMirror (reacts to store changes automatically)
const hostStyle = computed(() => ({
  '--cm-font-family': editorStore.fontFamily,
  '--cm-font-size': `${editorStore.fontSize}px`
}))

// ── Image Paste ──────────────────────────────────────────────

async function onPaste(e) {
  const items = e.clipboardData?.items
  if (!items) return

  // Find the first image item
  let imageItem = null
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      imageItem = item
      break
    }
  }
  if (!imageItem) return // no image — let CodeMirror handle text paste

  e.preventDefault()
  e.stopPropagation()

  const blob = imageItem.getAsFile()
  if (!blob) return

  // Read blob as base64 data URL
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })

  // Save the image and insert markdown reference
  const api = window.electronAPI
  if (!api) return

  if (!docStore.filePath) {
    // New unsaved file — ask user to save first
    const shouldSave = await api.confirm('Save the file first to paste images?')
    if (!shouldSave) return

    const result = await api.saveFileAs(docStore.content)
    if (!result) return

    // Update store without wiping content (saveFileAs returns no content)
    docStore.$patch({
      filePath: result.path,
      fileName: result.name,
      savedContent: docStore.content
    })
    await api.watchFile(result.path)
    await api.setTitle(`${result.name} - Markdown Editor`)
  }

  const result = await api.saveImage(dataUrl, docStore.filePath)
  if (!result) return

  const imageMd = `![${result.name}](${result.relativePath})`
  const pos = editorView.value.state.selection.main.head
  editorView.value.dispatch({
    changes: { from: pos, insert: imageMd },
    selection: { anchor: pos + imageMd.length }
  })
  editorView.value.focus()
}

// Toolbar formatting actions
function executeAction(action) {
  if (!editorView.value) return

  const view = editorView.value
  const selection = view.state.selection.main
  const selectedText = view.state.sliceDoc(selection.from, selection.to)
  const hasSelection = selection.from !== selection.to

  const wrappers = {
    bold: { prefix: '**', suffix: '**', placeholder: 'bold text' },
    italic: { prefix: '*', suffix: '*', placeholder: 'italic text' },
    strikethrough: { prefix: '~~', suffix: '~~', placeholder: 'strikethrough' },
    code: { prefix: '`', suffix: '`', placeholder: 'code' },
    link: { prefix: '[', suffix: '](url)', placeholder: 'link text' },
    image: { prefix: '![', suffix: '](url)', placeholder: 'alt text' }
  }

  const linePrefixes = {
    heading: '## ',
    quote: '> ',
    'unordered-list': '- ',
    'ordered-list': '1. ',
    'task-list': '- [ ] '
  }

  const blockWrappers = {
    codeblock: { prefix: '```\n', suffix: '\n```', placeholder: 'code' },
  }

  let transaction = null

  if (wrappers[action.id]) {
    const wrap = wrappers[action.id]
    const text = hasSelection ? selectedText : wrap.placeholder
    transaction = view.state.update({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: wrap.prefix + text + wrap.suffix
      },
      selection: hasSelection
        ? { anchor: selection.from + wrap.prefix.length + text.length + wrap.suffix.length }
        : { anchor: selection.from + wrap.prefix.length, head: selection.from + wrap.prefix.length + text.length }
    })
  } else if (linePrefixes[action.id]) {
    const prefix = linePrefixes[action.id]
    const line = view.state.doc.lineAt(selection.from)
    transaction = view.state.update({
      changes: { from: line.from, insert: prefix },
      selection: { anchor: line.from + prefix.length }
    })
  } else if (blockWrappers[action.id]) {
    const wrap = blockWrappers[action.id]
    const text = hasSelection ? selectedText : wrap.placeholder
    transaction = view.state.update({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: wrap.prefix + text + wrap.suffix
      }
    })
  } else if (action.id === 'table') {
    const tableStr = '\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n'
    transaction = view.state.update({
      changes: { from: selection.from, insert: tableStr }
    })
  } else if (action.id === 'hr') {
    const line = view.state.doc.lineAt(selection.from)
    const hrStr = line.from === 0 || view.state.doc.slice(line.from - 1, line.from) === '\n'
      ? '\n---\n'
      : '---\n'
    transaction = view.state.update({
      changes: { from: selection.from, insert: hrStr }
    })
  }

  if (transaction) {
    view.dispatch(transaction)
    view.focus()
  }
}

function syncSpellCheck() {
  if (!editorView.value) return
  editorView.value.dispatch({
    effects: spellCompartment.reconfigure(editorStore.spellCheckEnabled ? spellCheckPlugin : [])
  })
}

function syncLargeFileMode() {
  if (!editorView.value) return
  const large = editorView.value.state.doc.length >= LARGE_FILE_THRESHOLD
  editorView.value.dispatch({
    effects: [
      bracketCompartment.reconfigure(large ? [] : bracketMatching()),
      closeBracketsCompartment.reconfigure(large ? [] : closeBrackets()),
      highlightMatchesCompartment.reconfigure(large ? [] : highlightSelectionMatches())
    ]
  })
}

onMounted(() => {
  createEditor()
  // Apply spell check if already enabled (e.g. prefs loaded before mount)
  syncSpellCheck()
  // Apply large-file mode if initial doc exceeds threshold
  syncLargeFileMode()
  // Intercept paste for images
  editorHost.value?.addEventListener('paste', onPaste)
  // Spell check context menu
  editorHost.value?.addEventListener('contextmenu', onEditorContextMenu)
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  editorHost.value?.removeEventListener('paste', onPaste)
  editorHost.value?.removeEventListener('contextmenu', onEditorContextMenu)
  document.removeEventListener('click', hideContextMenu)
  if (editorView.value) {
    editorView.value.destroy()
    editorView.value = null
  }
})

function scrollToLine(line) {
  if (!editorView.value) return
  const doc = editorView.value.state.doc
  if (line < 1 || line > doc.lines) return
  const pos = doc.line(line).from
  editorView.value.dispatch({
    effects: EditorView.scrollIntoView(pos, { y: 'center' })
  })
  // Also place cursor at the start of the line
  editorView.value.dispatch({
    selection: { anchor: pos }
  })
  editorView.value.focus()
}

defineExpose({ executeAction, scrollToLine, get editorView() { return editorView } })
</script>

<template>
  <div ref="editorHost" class="editor-pane" :style="hostStyle"></div>

  <!-- Spell check context menu -->
  <Teleport to="body">
    <div
      v-if="contextMenu.visible"
      class="spell-context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @mousedown="onContextMenuMouseDown"
    >
      <div class="spell-menu-header">{{ t('spellCheck.spelling') }}: <strong>{{ contextMenu.word }}</strong></div>
      <div class="spell-menu-suggestions">
        <button
          v-for="s in contextMenu.suggestions"
          :key="s"
          class="spell-menu-item"
          @click="applySuggestion(s)"
        >{{ s }}</button>
      </div>
      <div class="spell-menu-footer">
        <button class="spell-menu-item spell-menu-dismiss" @click="hideContextMenu">
          {{ t('spellCheck.dismiss') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.editor-pane {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

<style>
/* Spell check context menu — unscoped so it works with Teleport */
.spell-context-menu {
  position: fixed;
  z-index: 99999;
  min-width: 160px;
  max-width: 240px;
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #d0d7de);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  font-size: 13px;
  color: var(--color-text, #1f2328);
}

.spell-menu-header {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-text-tertiary, #656d76);
  border-bottom: 1px solid var(--color-border, #d0d7de);
  margin-bottom: 4px;
}

.spell-menu-header strong {
  color: #e74c3c;
}

.spell-menu-suggestions {
  max-height: 240px;
  overflow-y: auto;
}

.spell-menu-item {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: none;
  color: var(--color-text, #1f2328);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.1s;
}

.spell-menu-item:hover {
  background-color: var(--color-active, rgba(100, 160, 255, 0.12));
  color: var(--color-accent, #0969da);
}

.spell-menu-footer {
  border-top: 1px solid var(--color-border, #d0d7de);
  margin-top: 4px;
  padding-top: 4px;
}

.spell-menu-dismiss {
  font-size: 12px;
  color: var(--color-text-tertiary, #656d76);
}
</style>
