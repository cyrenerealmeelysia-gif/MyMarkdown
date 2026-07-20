import { renderWithSourceMap } from './parser.js'
import { sanitize } from './sanitizer.js'

/**
 * Build a self-contained HTML page from markdown content.
 */
export async function buildExportHtml(markdown, mdFilePath, theme = 'light') {
  const bodyHtml = sanitize(renderWithSourceMap(markdown))
  const bodyWithImages = await inlineImages(bodyHtml, mdFilePath)

  const isDark = theme === 'dark'
  const vars = isDark ? DARK_VARS : LIGHT_VARS

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exported Markdown</title>
<style>
${vars}
${PREVIEW_CSS}
</style>
</head>
<body style="background:var(--color-bg);color:var(--color-text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div class="markdown-preview" style="max-width:860px;margin:0 auto;padding:32px 48px;">
${bodyWithImages}
</div>
</body>
</html>`
}

async function inlineImages(html, mdFilePath) {
  if (!mdFilePath) return html
  const api = window.electronAPI
  if (!api?.inlineImages) return html
  try { return await api.inlineImages(html, mdFilePath) } catch { return html }
}

// ── CSS ───────────────────────────────────────────────────────

const LIGHT_VARS = `:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f6f8fa;
  --color-text: #1f2328;
  --color-text-secondary: #656d76;
  --color-border: #d0d7de;
  --color-accent: #0969da;
}`

const DARK_VARS = `:root {
  --color-bg: #0d1117;
  --color-bg-secondary: #161b22;
  --color-text: #e6edf3;
  --color-text-secondary: #8b949e;
  --color-border: #30363d;
  --color-accent: #58a6ff;
}`

const PREVIEW_CSS = `
.markdown-preview { line-height: 1.7; word-wrap: break-word; }
.markdown-preview h1,.markdown-preview h2,.markdown-preview h3,.markdown-preview h4,.markdown-preview h5,.markdown-preview h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
.markdown-preview h1 { font-size: 2em; border-bottom: 1px solid var(--color-border); padding-bottom: .3em; }
.markdown-preview h2 { font-size: 1.5em; border-bottom: 1px solid var(--color-border); padding-bottom: .3em; }
.markdown-preview h3 { font-size: 1.25em; }
.markdown-preview h4 { font-size: 1em; }
.markdown-preview p { margin-bottom: 16px; }
.markdown-preview a { color: var(--color-accent); text-decoration: none; }
.markdown-preview a:hover { text-decoration: underline; }
.markdown-preview img { max-width: 100%; height: auto; }
.markdown-preview code { background: var(--color-bg-secondary); padding: .2em .4em; border-radius: 3px; font-size: 85%; font-family: 'Cascadia Code','Fira Code','Consolas',monospace; }
.markdown-preview pre { background: var(--color-bg-secondary); padding: 16px; border-radius: 6px; overflow-x: auto; line-height: 1.45; }
.markdown-preview pre code { background: none; padding: 0; font-size: 100%; }
.markdown-preview blockquote { border-left: 4px solid var(--color-border); padding: 0 1em; color: var(--color-text-secondary); margin: 16px 0; }
.markdown-preview table { border-collapse: collapse; margin: 16px 0; width: 100%; }
.markdown-preview th,.markdown-preview td { border: 1px solid var(--color-border); padding: 6px 13px; text-align: left; }
.markdown-preview th { background: var(--color-bg-secondary); font-weight: 600; }
.markdown-preview tr:nth-child(even) { background: var(--color-bg-secondary); }
.markdown-preview ul,.markdown-preview ol { padding-left: 2em; margin-bottom: 16px; }
.markdown-preview li { margin-bottom: 4px; }
.markdown-preview hr { border: 0; border-top: 1px solid var(--color-border); margin: 24px 0; }
.markdown-preview input[type="checkbox"] { margin-right: 6px; }
`
