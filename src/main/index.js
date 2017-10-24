'use strict'

import { app, BrowserWindow } from 'electron'

const isDevelopment = process.env.NODE_ENV !== 'production'

let mainWindow

function createMainWindow() {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 300,
    minWidth: 400,
    frame: false
  })

  const url = isDevelopment
    ? `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`
    : `file://${__dirname}/index.html`

  if (isDevelopment) {
    window.webContents.openDevTools()
  }

  window.loadURL(url)

  window.on('closed', () => {
    mainWindow = null
  })

  return window
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) mainWindow = createMainWindow()
})

app.on('ready', () => {
  mainWindow = createMainWindow()
})
