'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('groundsmithNative', {
  saveFile: (filename, arrayBuffer) => ipcRenderer.invoke('save-file', filename, arrayBuffer)
});
