import { ViewPlugin, Decoration } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

let dictionary = null
let dictLoadError = null

function getDictionary() {
  return dictionary || null
}

function checkWord(word) {
  const dict = getDictionary()
  if (!dict) return null
  try {
    return dict.check(word)
  } catch (e) {
    return null
  }
}

function getSuggestions(word) {
  const dict = getDictionary()
  if (!dict) return []
  try {
    return dict.suggest(word) || []
  } catch (e) {
    return []
  }
}

async function preloadDictionary() {
  if (dictionary) return true
  if (dictLoadError) return false

  try {
    const TypoMod = await import('../utils/typo-browser.js')
    const Typo = TypoMod.default || TypoMod

    if (typeof Typo !== 'function') {
      dictLoadError = 'Typo is not a constructor'
      return false
    }

    const base = '/dictionaries/en_US/'
    const affRes = await fetch(base + 'en_US.aff')
    const dicRes = await fetch(base + 'en_US.dic')

    if (!affRes.ok || !dicRes.ok) {
      dictLoadError = 'Dictionary files not found'
      return false
    }

    const affData = await affRes.text()
    const dicData = await dicRes.text()

    dictionary = new Typo('en_US', affData, dicData)
    return true
  } catch (err) {
    dictLoadError = err.message
    return false
  }
}

const WORD_RE = /\b[A-Za-z]{2,}\b/g
const spellErrorMark = Decoration.mark({ class: 'cm-spell-error' })

const spellCheckPlugin = ViewPlugin.fromClass(
  class {
    decorations

    constructor(view) {
      this.decorations = Decoration.none
      this.scan(view)
      preloadDictionary().then((ok) => {
        if (ok) {
          this.scan(view)
          view.dispatch({})
        }
      })
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.scan(update.view)
      }
    }

    scan(view) {
      const dict = getDictionary()
      if (!dict) {
        this.decorations = Decoration.none
        return
      }

      try {
        const marks = []
        const { from, to } = view.viewport
        const text = view.state.doc.sliceString(from, to)

        let match
        WORD_RE.lastIndex = 0
        while ((match = WORD_RE.exec(text)) !== null) {
          const word = match[0]
          const wordFrom = from + match.index
          const wordTo = wordFrom + word.length

          if (isInCode(view, wordFrom)) continue
          if (!dict.check(word)) {
            marks.push(spellErrorMark.range(wordFrom, wordTo))
          }
        }

        this.decorations = Decoration.set(marks)
      } catch (e) {
        this.decorations = Decoration.none
      }
    }
  },
  { decorations: (v) => v.decorations }
)

function isInCode(view, pos) {
  try {
    const tree = syntaxTree(view.state)
    if (!tree) return false
    let node = tree.resolve(pos, -1)
    while (node) {
      const name = node.type.name
      if (/^(CodeBlock|FencedCode|InlineCode|CodeMark)$/.test(name)) return true
      node = node.parent || null
    }
    return false
  } catch (e) {
    return false
  }
}

export { spellCheckPlugin, getDictionary, checkWord, getSuggestions, preloadDictionary }
