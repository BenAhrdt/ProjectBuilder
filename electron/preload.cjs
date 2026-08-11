const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("projectBuilder", {
    selectBackupDirectory: defaultPath =>
        ipcRenderer.invoke(
            "backup:select-directory",
            defaultPath
        ),
    getUpdateStatus: () => ipcRenderer.invoke("update:get-status"),
    setLanguage: language => ipcRenderer.invoke("app:set-language", language),
    onUpdateStatus: callback => {
        const listener = (_event, status) => callback(status);
        ipcRenderer.on("update:status", listener);
        return () => ipcRenderer.removeListener("update:status", listener);
    }
});
