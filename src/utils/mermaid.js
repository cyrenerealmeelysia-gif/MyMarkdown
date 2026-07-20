import mermaid from 'mermaid'

let initialized = false
let renderCounter = 0

const DEFAULT_CONFIG = {
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
  darkTheme: 'dark',
  fontFamily: 'inherit'
}

/**
 * Initialize Mermaid once with the current theme.
 */
function ensureInit() {
  if (!initialized) {
    mermaid.initialize(DEFAULT_CONFIG)
    initialized = true
  }
}

/**
 * Render all Mermaid code blocks inside a DOM container.
 * Finds <pre><code class="language-mermaid"> blocks and replaces them with rendered SVGs.
 */
export async function renderDiagrams(container) {
  ensureInit()

  const mermaidBlocks = container.querySelectorAll('pre > code.language-mermaid')

  if (mermaidBlocks.length === 0) return

  // Collect blocks before mutating the DOM
  const blocks = Array.from(mermaidBlocks)

  for (const code of blocks) {
    const pre = code.parentElement
    if (!pre || pre.dataset.mermaidRendered === 'true') continue

    const source = code.textContent.trim()
    if (!source) continue

    const id = `mermaid-${Date.now()}-${++renderCounter}`

    try {
      // Validate syntax first
      await mermaid.parse(source)

      // Render to SVG
      const { svg } = await mermaid.render(id, source)

      // Replace the <pre> block with rendered output
      const wrapper = document.createElement('div')
      wrapper.className = 'mermaid-diagram'
      wrapper.innerHTML = svg
      pre.replaceWith(wrapper)
    } catch (err) {
      console.warn('Mermaid render error:', err.message)
      // Mark as attempted so we don't retry on every keystroke
      pre.dataset.mermaidRendered = 'error'
      // Optionally show a user-visible error
      const errorDiv = document.createElement('div')
      errorDiv.className = 'mermaid-error'
      errorDiv.textContent = `Diagram error: ${err.message}`
      pre.insertAdjacentElement('afterend', errorDiv)
    }
  }
}
