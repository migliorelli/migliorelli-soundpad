import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readdir, stat } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { parseFile as parseMusicFile } from 'music-metadata'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minHeight: 670,
    minWidth: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Audio Folder'
    })

    return result
  })

  ipcMain.handle('get-audio-files', async (event, folderPath) => {
    try {
      const files = await readdir(folderPath)
      const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']

      const audioFiles = new Map()
      for (const file of files) {
        const filePath = join(folderPath, file)
        const stats = await stat(filePath)

        if (stats.isFile()) {
          const ext = file.toLowerCase().slice(file.lastIndexOf('.'))
          if (audioExtensions.includes(ext)) {
            const metadata = await parseMusicFile(filePath)
            const picture = metadata.common.picture?.[0]

            let cover = null

            if (picture) {
              const mime = picture.format || 'image/jpeg'

              const buffer = Buffer.from(picture.data)
              const b64 = buffer.toString('base64')

              cover = `data:${mime};base64,${b64}`
              console.log(cover)
            }

            audioFiles.set(filePath, {
              name: file,
              folderPath,
              path: filePath,
              size: stats.size,
              lastModified: stats.mtime,
              cover
            })
          }
        }
      }

      return audioFiles
    } catch (error) {
      console.error('Error reading audio files:', error)
      return new Map()
    }
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
