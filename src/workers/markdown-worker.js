/**
 * Web Worker for off-thread Markdown parsing.
 *
 * markdown-it's parse + render runs here so the main thread
 * stays responsive when editing large documents (>50 KB).
 *
 * DOMPurify is NOT used here because it requires a DOM.
 * Sanitization happens on the main thread after receiving the HTML.
 */

import { renderWithSourceMap } from '../utils/parser.js'

self.onmessage = (e) => {
  const { text, id } = e.data
  try {
    const html = renderWithSourceMap(text)
    self.postMessage({ id, html })
  } catch (err) {
    self.postMessage({ id, error: err.message })
  }
}
