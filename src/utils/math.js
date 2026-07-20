import katex from 'katex'

/**
 * Render KaTeX math expressions inside a DOM container.
 * - Display math: $$...$$ (typically in standalone paragraphs)
 * - Inline math: $...$ (within text content)
 *
 * Skips code blocks and elements already processed by KaTeX.
 */
export function renderMath(container) {
  // Phase 1: Display math — standalone paragraphs containing $$...$$
  renderDisplayMath(container)

  // Phase 2: Inline math — $...$ within text nodes
  renderInlineMath(container)
}

// ── Display Math ──────────────────────────────────────────────

function renderDisplayMath(container) {
  // Markdown-it typically wraps bare $$...$$ in <p> tags
  const paragraphs = container.querySelectorAll('p')
  for (const p of paragraphs) {
    const text = p.textContent.trim()
    if (!text.startsWith('$$') || !text.endsWith('$$')) continue
    if (text.length < 5) continue // minimum: $$x$$

    const formula = text.slice(2, -2).trim()
    if (!formula) continue

    try {
      const html = katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        trust: false
      })
      p.innerHTML = html
      p.classList.add('katex-display')
    } catch (err) {
      console.warn('KaTeX display math error:', err.message)
    }
  }
}

// ── Inline Math ───────────────────────────────────────────────

function renderInlineMath(container) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip text inside code blocks, existing KaTeX output, and script/style
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        if (parent.closest('code, pre, .katex, .katex-display, script, style')) {
          return NodeFilter.FILTER_REJECT
        }
        // Only process nodes that contain a dollar sign
        if (!node.textContent.includes('$')) return NodeFilter.FILTER_SKIP
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )

  // Collect nodes first (TreeWalker mutates during iteration)
  const textNodes = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode)
  }

  for (const node of textNodes) {
    processInlineNode(node)
  }
}

// Regex: single $ not preceded/followed by another $, content between excludes $
// Uses lookbehind/lookahead to distinguish $...$ from $$...$$
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g

function processInlineNode(node) {
  const text = node.textContent
  const parent = node.parentNode
  if (!parent) return

  INLINE_MATH_RE.lastIndex = 0

  const fragments = []
  let lastIndex = 0
  let match

  while ((match = INLINE_MATH_RE.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      fragments.push(document.createTextNode(text.slice(lastIndex, match.index)))
    }

    // Render inline math
    try {
      const html = katex.renderToString(match[1], {
        displayMode: false,
        throwOnError: false,
        trust: false
      })
      const span = document.createElement('span')
      span.innerHTML = html
      span.classList.add('katex-inline')
      fragments.push(span)
    } catch (err) {
      // Fall back to original text on error
      fragments.push(document.createTextNode(match[0]))
    }

    lastIndex = match.index + match[0].length
  }

  // Push remaining text
  if (lastIndex < text.length) {
    fragments.push(document.createTextNode(text.slice(lastIndex)))
  }

  // Replace original node with fragments
  if (fragments.length > 0) {
    for (const frag of fragments) {
      parent.insertBefore(frag, node)
    }
    parent.removeChild(node)
  }
}
