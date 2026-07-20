import DOMPurify from 'dompurify'

const sanitizeConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'a', 'img',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'em', 'strong', 'del', 'ins', 'sub', 'sup', 'mark',
    'span', 'div',
    'dl', 'dt', 'dd',
    'input', 'label',
    'section', 'figure', 'figcaption'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'target', 'rel', 'type', 'checked', 'disabled',
    'colspan', 'rowspan',
    'data-source-line'
  ],
  ALLOW_DATA_ATTR: false
}

export function sanitize(html) {
  return DOMPurify.sanitize(html, sanitizeConfig)
}
