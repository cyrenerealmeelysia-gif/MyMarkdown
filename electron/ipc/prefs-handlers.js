export function registerPrefsHandlers(ipcMain, store) {
  ipcMain.handle('prefs:get', (_event, key) => {
    if (key) {
      return store.get(key)
    }
    return store.store
  })

  ipcMain.handle('prefs:set', (_event, key, value) => {
    store.set(key, value)
    return true
  })
}
