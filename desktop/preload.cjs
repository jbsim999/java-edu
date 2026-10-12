const { contextBridge, ipcRenderer } = require('electron');

function storageCall(method, key, value) {
  const result = ipcRenderer.sendSync('java-edu:storage', { method, key, value });
  if (result.error) throw new Error(result.error);
  return result.value ?? null;
}

contextBridge.exposeInMainWorld('javaEduDesktop', Object.freeze({
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke('java-edu:settings'),
  chooseJdk: (version) => ipcRenderer.invoke('java-edu:choose-jdk', version),
  chooseMaven: () => ipcRenderer.invoke('java-edu:choose-maven'),
  setExecutionConsent: (accepted) => ipcRenderer.invoke('java-edu:consent', accepted),
  storage: Object.freeze({
    getItem: (key) => storageCall('getItem', key),
    setItem: (key, value) => storageCall('setItem', key, value),
    removeItem: (key) => storageCall('removeItem', key),
  }),
}));
