/**
 * Shiki code highlighting — tree-shakable via granular language imports.
 * Only the 23 listed languages are bundled; unused grammars are excluded.
 */
import { createHighlighterCore } from '@shikijs/core'

// ── Languages (granular imports for tree-shaking) ──────────────
import langJs from 'shiki/langs/javascript.mjs'
import langTs from 'shiki/langs/typescript.mjs'
import langPython from 'shiki/langs/python.mjs'
import langBash from 'shiki/langs/bash.mjs'
import langHtml from 'shiki/langs/html.mjs'
import langCss from 'shiki/langs/css.mjs'
import langJson from 'shiki/langs/json.mjs'
import langMarkdown from 'shiki/langs/markdown.mjs'
import langYaml from 'shiki/langs/yaml.mjs'
import langRust from 'shiki/langs/rust.mjs'
import langGo from 'shiki/langs/go.mjs'
import langJava from 'shiki/langs/java.mjs'
import langC from 'shiki/langs/c.mjs'
import langCpp from 'shiki/langs/cpp.mjs'
import langSql from 'shiki/langs/sql.mjs'
import langXml from 'shiki/langs/xml.mjs'
import langDockerfile from 'shiki/langs/dockerfile.mjs'
import langToml from 'shiki/langs/toml.mjs'
import langPhp from 'shiki/langs/php.mjs'
import langRuby from 'shiki/langs/ruby.mjs'
import langShell from 'shiki/langs/shellscript.mjs'
import langPowershell from 'shiki/langs/powershell.mjs'
import langDiff from 'shiki/langs/diff.mjs'

// ── Themes ──────────────────────────────────────────────────────
import themeDark from 'shiki/themes/github-dark.mjs'
import themeLight from 'shiki/themes/github-light.mjs'

const LANGS = [
  langJs, langTs, langPython, langBash, langHtml, langCss,
  langJson, langMarkdown, langYaml, langRust, langGo, langJava,
  langC, langCpp, langSql, langXml, langDockerfile, langToml,
  langPhp, langRuby, langShell, langPowershell, langDiff
]

let highlighter = null
let initPromise = null

async function getHighlighter() {
  if (highlighter) return highlighter
  if (initPromise) return initPromise

  initPromise = createHighlighterCore({
    langs: LANGS,
    themes: [themeDark, themeLight]
  }).then(h => {
    highlighter = h
    initPromise = null
    return h
  }).catch(err => {
    initPromise = null
    console.error('Failed to initialize Shiki:', err)
    return null
  })

  return initPromise
}

/**
 * Highlight all code blocks inside a container element.
 * Auto-detects the current theme (light/dark) from the document.
 * Skips mermaid code blocks and already-highlighted blocks.
 */
export async function highlightCodeBlocks(container) {
  const h = await getHighlighter()
  if (!h) return

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const theme = isDark ? 'github-dark' : 'github-light'

  const codeBlocks = container.querySelectorAll('pre > code')

  for (const code of codeBlocks) {
    const classes = code.className.split(/\s+/)
    const langClass = classes.find(c => c.startsWith('language-'))
    const lang = langClass ? langClass.replace('language-', '') : 'text'

    if (lang === 'mermaid') continue
    if (code.parentElement.dataset.highlighted === 'true') continue

    try {
      const text = code.textContent
      const html = h.codeToHtml(text, { lang, theme })

      const temp = document.createElement('div')
      temp.innerHTML = html
      const newPre = temp.firstElementChild
      if (newPre) {
        newPre.dataset.highlighted = 'true'
        code.parentElement.replaceWith(newPre)
      }
    } catch (err) {
      // Language not supported — leave block as plain text
    }
  }
}
