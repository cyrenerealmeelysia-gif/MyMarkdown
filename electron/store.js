import Store from 'electron-store'

const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    theme: 'system',
    recentFiles: [],
    fontSize: 16,
    tabSize: 2,
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace"
  }
})

export default store
