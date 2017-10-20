'use strict'
const electron = require('electron')
const ipc = require('electron').ipcMain

const app = electron.app

require('electron-debug')()

let mainWindow

function onClosed() {
  mainWindow = null
}

function createMainWindow() {
  const win = new electron.BrowserWindow({
    width: 600,
    height: 400,
    minHeight: 300,
    minWidth: 400,
    frame: false
  })

  win.loadURL(`file://${__dirname}/app/index.html`)
  win.on('closed', onClosed)
  win.maximize()
  win.webContents.openDevTools()

  return win
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  }
})

app.on('ready', () => {
  mainWindow = createMainWindow()
})

ipc.on('close', (event) => {
  console.log('closing')
  app.exit()
})
ipc.on('minimize', (event) => {
  mainWindow.minimize()
})