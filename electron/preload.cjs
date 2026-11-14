const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('graduation', {
  load: () => ipcRenderer.invoke('load'),
  preview: () => ipcRenderer.invoke('preview'),
  match: () => ipcRenderer.invoke('match'),
  saveImport: () => ipcRenderer.invoke('save-import'),
  pickLogo: () => ipcRenderer.invoke('pick-logo'),
  saveSettings: settings => ipcRenderer.invoke('save-settings', settings),
  fullscreen: () => ipcRenderer.invoke('fullscreen'),
  kiosk: () => ipcRenderer.invoke('kiosk'),
})
