import MarkdownIt from 'markdown-it'
import multimdTable from 'markdown-it-multimd-table'
import taskLists from 'markdown-it-task-lists'
import footnote from 'markdown-it-footnote'
import { full as emoji } from 'markdown-it-emoji'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import mark from 'markdown-it-mark'
import abbr from 'markdown-it-abbr'
import anchor from 'markdown-it-anchor'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false
})

// Plugins
md.use(multimdTable, {
  multiline: true,
  rowspan: true,
  headerless: true,
  multibody: true
})
md.use(taskLists, { enabled: true })
md.use(footnote)
md.use(emoji)
md.use(sub)
md.use(sup)
md.use(mark)
md.use(abbr)
md.use(anchor, {
  level: [2, 3, 4, 5, 6],
  permalink: anchor.permalink.headerLink({ safariReaderFix: true })
})

/**
 * Render markdown with data-source-line attributes on block elements.
 * In WYSIWYG mode, clicking a rendered block jumps to its source line.
 */
export function renderWithSourceMap(input) {
  const tokens = md.parse(input, {})

  // Inject data-source-line onto block-level opening tokens.
  // These produce the actual HTML tags (p, h1-h6, li, blockquote, etc.)
  // so the attribute ends up in the DOM for click-to-edit.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.map && token.map.length > 0 && token.type.endsWith('_open')) {
      // map[0] is the 0-based start line
      token.attrPush(['data-source-line', String(token.map[0] + 1)])
    }
  }

  return md.renderer.render(tokens, md.options, {})
}