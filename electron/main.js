import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import updater from "electron-updater";

const { autoUpdater } = updater;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconPath = path.join(__dirname, "..", "icon.png");

let mainWindow;
let expressServer;

async function checkForUpdates() {
    if (!app.isPackaged || process.platform !== "win32") return;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("update-available", async info => {
        const result = await dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Update verfügbar",
            message: `ProjectBuilder ${info.version} ist verfügbar.`,
            detail: "Soll das Update jetzt heruntergeladen werden? Ihre Datenbank bleibt unverändert.",
            buttons: ["Herunterladen", "Später"],
            defaultId: 0,
            cancelId: 1,
            noLink: true
        });

        if (result.response === 0) {
            mainWindow.setProgressBar(0);
            await autoUpdater.downloadUpdate();
        }
    });

    autoUpdater.on("download-progress", progress => {
        mainWindow?.setProgressBar(progress.percent / 100);
    });

    autoUpdater.on("update-downloaded", async info => {
        mainWindow?.setProgressBar(-1);
        const result = await dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Update bereit",
            message: `ProjectBuilder ${info.version} wurde heruntergeladen.`,
            detail: "Die Anwendung kann jetzt neu gestartet und aktualisiert werden.",
            buttons: ["Jetzt neu starten", "Später"],
            defaultId: 0,
            cancelId: 1,
            noLink: true
        });

        if (result.response === 0) autoUpdater.quitAndInstall(false, true);
    });

    autoUpdater.on("error", error => {
        mainWindow?.setProgressBar(-1);
        console.error("Updateprüfung fehlgeschlagen:", error);
    });

    await autoUpdater.checkForUpdates();
}

async function createWindow() {
    process.env.PROJECTBUILDER_DATA_DIR = app.getPath("userData");

    const { startServer } = await import("../server.js");
    expressServer = await startServer({ port: 0, host: "127.0.0.1" });
    const appUrl = `http://127.0.0.1:${expressServer.address().port}`;

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        show: false,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    mainWindow.removeMenu();

    mainWindow.once("ready-to-show", () => mainWindow.show());
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.startsWith(appUrl)) shell.openExternal(url);
        return { action: "deny" };
    });
    mainWindow.webContents.on("will-navigate", (event, url) => {
        if (!url.startsWith(appUrl)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    await mainWindow.loadURL(appUrl);
    setTimeout(() => checkForUpdates().catch(console.error), 2000);
}

app.whenReady()
    .then(() => {
        Menu.setApplicationMenu(null);
        return createWindow();
    })
    .catch(error => {
        console.error(error);
        app.quit();
    });

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => expressServer?.close());
