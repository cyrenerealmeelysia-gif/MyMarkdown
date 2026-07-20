import { dialog, BrowserWindow, app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { basename, join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import chokidar from 'chokidar'

const watchers = new Map()

export function registerFileHandlers(ipcMain, mainWindow) {
  // Open file dialog and read content
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Markdown File',
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    try {
      const content = await readFile(filePath, 'utf-8')
      const stat = await import('node:fs/promises').then(fs => fs.stat(filePath))
      return {
        path: filePath,
        name: basename(filePath),
        content,
        stat: {
          size: stat.size,
          mtime: stat.mtime.toISOString()
        }
      }
    } catch (err) {
      dialog.showErrorBox('Error Opening File', err.message)
      return null
    }
  })

  // Save file to path
  ipcMain.handle('file:save', async (_event, filePath, content) => {
    try {
      await writeFile(filePath, content, 'utf-8')
      const stat = await import('node:fs/promises').then(fs => fs.stat(filePath))
      return {
        path: filePath,
        stat: {
          size: stat.size,
          mtime: stat.mtime.toISOString()
        }
      }
    } catch (err) {
      dialog.showErrorBox('Error Saving File', err.message)
      throw err
    }
  })

  // Save as - show dialog then save
  ipcMain.handle('file:saveAs', async (_event, content) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Markdown File',
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    try {
      await writeFile(result.filePath, content, 'utf-8')
      const stat = await import('node:fs/promises').then(fs => fs.stat(result.filePath))
      return {
        path: result.filePath,
        name: basename(result.filePath),
        stat: {
          size: stat.size,
          mtime: stat.mtime.toISOString()
        }
      }
    } catch (err) {
      dialog.showErrorBox('Error Saving File', err.message)
      throw err
    }
  })

  // Watch file for external changes
  ipcMain.handle('file:watch', async (_event, filePath) => {
    if (watchers.has(filePath)) {
      await watchers.get(filePath).close()
    }

    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 }
    })

    watcher.on('change', () => {
      mainWindow.webContents.send('file:changed', filePath)
    })

    watchers.set(filePath, watcher)
    return true
  })

  // Stop watching file
  ipcMain.handle('file:unwatch', async (_event, filePath) => {
    if (watchers.has(filePath)) {
      await watchers.get(filePath).close()
      watchers.delete(filePath)
    }
    return true
  })

  // Open a file by direct path (no dialog) — used by drag-and-drop
  ipcMain.handle('file:openPath', async (_event, filePath) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      const stat = await import('node:fs/promises').then(fs => fs.stat(filePath))
      return {
        path: filePath,
        name: basename(filePath),
        content,
        stat: {
          size: stat.size,
          mtime: stat.mtime.toISOString()
        }
      }
    } catch (err) {
      console.error('Error opening file by path:', err.message)
      return null
    }
  })

  // Save pasted image from clipboard
  // Expects a data URL string (data:image/png;base64,...) and the md file's directory
  ipcMain.handle('file:saveImage', async (_event, dataUrl, mdFilePath) => {
    try {
      // Parse data URL: "data:image/png;base64,..."
      const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!match) throw new Error('Invalid image data URL')

      const [, ext, base64] = match
      const buffer = Buffer.from(base64, 'base64')

      // Determine save directory: next to the .md file in an images/ folder
      const baseDir = mdFilePath ? dirname(mdFilePath) : tmpdir()
      const resolvedDir = mdFilePath ? join(baseDir, 'images') : baseDir
      await mkdir(resolvedDir, { recursive: true })

      // Generate unique filename
      const now = new Date()
      const stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) // YYYYMMDDTHHmmss
      const filename = `img_${stamp}.${ext === 'jpeg' ? 'jpg' : ext}`
      const filePath = join(resolvedDir, filename)

      await writeFile(filePath, buffer)

      return {
        path: filePath,
        name: filename,
        relativePath: mdFilePath ? `images/${filename}` : filePath
      }
    } catch (err) {
      console.error('Error saving pasted image:', err.message)
      return null
    }
  })

  // ── Export: inline local images as base64 ──────────────────

  ipcMain.handle('file:inlineImages', async (_event, html, mdFilePath) => {
    try {
      const docDir = dirname(mdFilePath)
      // Match <img src="..."> with relative paths (not http:, data:, local-asset:)
      const imgRegex = /<img\s[^>]*src\s*=\s*"([^"]*)"/gi
      let result = html
      let match

      while ((match = imgRegex.exec(html)) !== null) {
        const src = match[1]
        // Skip absolute URLs and data URIs
        if (/^(https?:|data:|local-asset:|file:)\/\//i.test(src)) continue

        try {
          // Resolve relative path against the document directory
          const imgPath = resolve(docDir, src)
          const imgData = await readFile(imgPath)
          const ext = src.split('.').pop()?.toLowerCase() || 'png'
          const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext
          const base64 = imgData.toString('base64')
          const dataUrl = `data:image/${mime};base64,${base64}`

          // Replace the src attribute
          result = result.replace(match[1], dataUrl)
        } catch {
          // File not found or unreadable — leave as-is
          continue
        }
      }

      return result
    } catch (err) {
      console.error('Error inlining images:', err.message)
      return html
    }
  })

  // ── Export: save HTML file ─────────────────────────────────

  ipcMain.handle('file:exportHtml', async (_event, html, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export as HTML',
      defaultPath: defaultName || 'export.html',
      filters: [{ name: 'HTML Files', extensions: ['html', 'htm'] }]
    })

    if (result.canceled || !result.filePath) return null

    try {
      await writeFile(result.filePath, html, 'utf-8')
      return { path: result.filePath }
    } catch (err) {
      dialog.showErrorBox('Export Error', err.message)
      return null
    }
  })

  // ── Export: save PDF file ──────────────────────────────────

  ipcMain.handle('file:exportPdf', async (_event, html, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export as PDF',
      defaultPath: defaultName || 'export.pdf',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })

    if (result.canceled || !result.filePath) return null

    // Write HTML to a temp file so we can load it in a hidden window
    const tmpHtml = join(app.getPath('temp'), `md-export-${Date.now()}.html`)
    await writeFile(tmpHtml, html, 'utf-8')

    try {
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: { sandbox: true }
      })

      await win.loadURL(pathToFileURL(tmpHtml).toString())

      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true
      })

      await writeFile(result.filePath, pdfData)

      win.destroy()
      return { path: result.filePath }
    } catch (err) {
      dialog.showErrorBox('Export Error', err.message)
      return null
    }
  })
}
