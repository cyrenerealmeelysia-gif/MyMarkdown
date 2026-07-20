import { dialog } from 'electron'
import { buildMenu } from '../menu.js'

export function registerWindowHandlers(ipcMain, mainWindow) {
  ipcMain.handle('window:setTitle', (_event, title) => {
    mainWindow.setTitle(title)
    return true
  })

  ipcMain.handle('dialog:confirm', async (_event, message) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      defaultId: 0,
      title: 'Confirm',
      message
    })
    return result.response === 0
  })

  ipcMain.handle('menu:rebuild', () => {
    buildMenu(mainWindow)
    return true
  })
}
