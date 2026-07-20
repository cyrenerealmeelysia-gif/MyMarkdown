import { ref, watch, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'
import { renderWithSourceMap } from '../utils/parser.js'
import { sanitize } from '../utils/sanitizer.js'

/** Files larger than this use a Web Worker for off-thread parsing. */
const WORKER_THRESHOLD = 50_000 // bytes (50 KB)

/** Debounce for large files — longer pause to avoid Worker spam. */
const LARGE_DEBOUNCE_MS = 500

function doRenderSync(text) {
  const raw = renderWithSourceMap(text)
  return sanitize(raw)
}

export function useMarkdown(contentRef, options = {}) {
  const safeHtml = ref('')
  const isParsing = ref(false)

  let worker = null
  let nextRequestId = 0
  let latestRequestId = 0
  let isFirstRender = true
  let currentDebounce = null
  let currentDebounceMs = 0

  function getWorker() {
    if (!worker) {
      worker = new Worker(
        new URL('../workers/markdown-worker.js', import.meta.url),
        { type: 'module' }
      )
      worker.onmessage = (e) => {
        const { id, html, error } = e.data

        // Ignore stale responses (user typed while Worker was busy)
        if (id !== latestRequestId) return

        if (error) {
          console.error('Markdown Worker error:', error)
          safeHtml.value = `<p style="color:red">Parse error: ${error}</p>`
        } else {
          safeHtml.value = sanitize(html)
        }
        isParsing.value = false
      }
      worker.onerror = (err) => {
        console.error('Markdown Worker crash:', err)
        isParsing.value = false
      }
    }
    return worker
  }

  function doRenderAsync(text) {
    isParsing.value = true
    latestRequestId = ++nextRequestId
    try {
      getWorker().postMessage({ text, id: latestRequestId })
    } catch (err) {
      // Fallback to sync if Worker creation fails
      isParsing.value = false
      safeHtml.value = doRenderSync(text)
    }
  }

  function ensureDebounce(ms) {
    if (currentDebounce && currentDebounceMs === ms) return currentDebounce
    if (currentDebounce) currentDebounce.cancel()
    currentDebounceMs = ms
    currentDebounce = debounce((text) => {
      if (text.length >= WORKER_THRESHOLD) {
        doRenderAsync(text)
      } else {
        isParsing.value = true
        try {
          safeHtml.value = doRenderSync(text)
        } catch (err) {
          console.error('Markdown parse error:', err)
          safeHtml.value = `<p style="color:red">Parse error: ${err.message}</p>`
        } finally {
          isParsing.value = false
        }
      }
    }, ms)
    return currentDebounce
  }

  watch(
    contentRef,
    (newContent) => {
      if (isFirstRender) {
        isFirstRender = false
        isParsing.value = true
        try {
          safeHtml.value = doRenderSync(newContent)
        } catch (err) {
          console.error('Markdown parse error:', err)
          safeHtml.value = `<p style="color:red">Parse error: ${err.message}</p>`
        } finally {
          isParsing.value = false
        }
      } else {
        // Use longer debounce for large files to avoid Worker thrashing
        const ms = newContent.length >= WORKER_THRESHOLD ? LARGE_DEBOUNCE_MS : 200
        ensureDebounce(ms)(newContent)
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (currentDebounce) currentDebounce.cancel()
    if (worker) {
      worker.terminate()
      worker = null
    }
  })

  return { safeHtml, isParsing }
}
