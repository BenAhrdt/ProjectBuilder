const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("projectBuilder", {
    selectBackupDirectory: defaultPath =>
        ipcRenderer.invoke(
            "backup:select-directory",
            defaultPath
        )
});
