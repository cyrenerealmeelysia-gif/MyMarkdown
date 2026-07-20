import { StateField, StateEffect, RangeSet, RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'

export const setSearchHighlights = StateEffect.define()
export const clearSearchHighlights = StateEffect.define()

/**
 * StateField that holds the current set of search-match decorations.
 * SearchBar dispatches effects to update this field; the editor
 * re-renders decorations automatically.
 */
export const searchHighlightField = StateField.define({
  create() {
    return RangeSet.empty
  },
  update(highlights, tr) {
    for (const e of tr.effects) {
      if (e.is(setSearchHighlights)) return e.value
      if (e.is(clearSearchHighlights)) return RangeSet.empty
    }
    return highlights
  },
  provide: (f) => EditorView.decorations.from(f)
})

/**
 * Build a Decoration RangeSet from an array of {from, to} match positions.
 * The match at `currentIndex` gets the "current" highlight class;
 * all others get the normal "match" class.
 */
export function buildSearchDecorations(matches, currentIndex) {
  const builder = new RangeSetBuilder()
  for (let i = 0; i < matches.length; i++) {
    const cls = i === currentIndex ? 'cm-search-match-current' : 'cm-search-match'
    builder.add(matches[i].from, matches[i].to, Decoration.mark({ class: cls }))
  }
  return builder.finish()
}
