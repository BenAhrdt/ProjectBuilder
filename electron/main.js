import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import updater from "electron-updater";

const { autoUpdater } = updater;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconPath = path.join(__dirname, "..", "icon.png");

let mainWindow;
let expressServer;
let updateStatus = { state: "idle", percent: 0 };
let appLanguage = "de";
let browserModeEnabled = false;

const nativeTexts = {
    de: {
        updateAvailable: "Update verfügbar",
        updateMessage: version => `ProjectBuilder ${version} ist verfügbar.`,
        updateDetail: "Soll das Update jetzt heruntergeladen werden? Ihre Datenbank bleibt unverändert.",
        download: "Herunterladen",
        later: "Später",
        updateReady: "Update bereit",
        downloaded: version => `ProjectBuilder ${version} wurde heruntergeladen.`,
        restartDetail: "Die Anwendung kann jetzt neu gestartet und aktualisiert werden.",
        restart: "Jetzt neu starten",
        backupFolder: "Backup-Ordner auswählen"
    },
    en: {
        updateAvailable: "Update available",
        updateMessage: version => `ProjectBuilder ${version} is available.`,
        updateDetail: "Would you like to download the update now? Your database will remain unchanged.",
        download: "Download",
        later: "Later",
        updateReady: "Update ready",
        downloaded: version => `ProjectBuilder ${version} has been downloaded.`,
        restartDetail: "The application can now be restarted and updated.",
        restart: "Restart now",
        backupFolder: "Select backup folder"
    },
    es: {
        updateAvailable: "Actualización disponible",
        updateMessage: version => `ProjectBuilder ${version} está disponible.`,
        updateDetail: "¿Desea descargar la actualización ahora? La base de datos no se modificará.",
        download: "Descargar",
        later: "Más tarde",
        updateReady: "Actualización lista",
        downloaded: version => `ProjectBuilder ${version} se ha descargado.`,
        restartDetail: "La aplicación ya se puede reiniciar y actualizar.",
        restart: "Reiniciar ahora",
        backupFolder: "Seleccionar carpeta de copia de seguridad"
    }
};

function getNativeTexts() {
    return nativeTexts[appLanguage] ?? nativeTexts.de;
}

function sendUpdateStatus(status) {
    updateStatus = { ...updateStatus, ...status };
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("update:status", updateStatus);
    }
}

async function checkForUpdates() {
    if (!app.isPackaged || process.platform !== "win32") return;

    let updateDialogPromise = Promise.resolve();
    let updateReadyDialogPromise = Promise.resolve();

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    // Temporär deaktiviert, bis das interne Zertifikat zentral vertraut wird.
    autoUpdater.verifyUpdateCodeSignature = async () => null;

    autoUpdater.on("update-available", async info => {
        updateDialogPromise = (async () => {
            const texts = getNativeTexts();
            const result = await dialog.showMessageBox(mainWindow, {
                type: "info",
                title: texts.updateAvailable,
                message: texts.updateMessage(info.version),
                detail: texts.updateDetail,
                buttons: [texts.download, texts.later],
                defaultId: 0,
                cancelId: 1,
                noLink: true
            });

            if (result.response === 0) {
                mainWindow.setProgressBar(0);
                sendUpdateStatus({
                    state: "downloading",
                    percent: 0,
                    version: info.version,
                    error: null
                });
                try {
                    await autoUpdater.downloadUpdate();
                } catch (error) {
                    sendUpdateStatus({ state: "error", error: error.message });
                }
            }
        })();
        await updateDialogPromise;
    });

    autoUpdater.on("download-progress", progress => {
        mainWindow?.setProgressBar(progress.percent / 100);
        sendUpdateStatus({
            state: "downloading",
            percent: Math.max(0, Math.min(100, progress.percent)),
            transferred: progress.transferred,
            total: progress.total,
            bytesPerSecond: progress.bytesPerSecond
        });
    });

    autoUpdater.on("update-downloaded", async info => {
        updateReadyDialogPromise = (async () => {
            const texts = getNativeTexts();
            mainWindow?.setProgressBar(-1);
            sendUpdateStatus({
                state: "ready",
                percent: 100,
                version: info.version,
                error: null
            });
            const result = await dialog.showMessageBox(mainWindow, {
                type: "info",
                title: texts.updateReady,
                message: texts.downloaded(info.version),
                detail: texts.restartDetail,
                buttons: [texts.restart, texts.later],
                defaultId: 0,
                cancelId: 1,
                noLink: true
            });

            if (result.response === 0) autoUpdater.quitAndInstall(false, true);
        })();
        await updateReadyDialogPromise;
    });

    autoUpdater.on("error", error => {
        mainWindow?.setProgressBar(-1);
        sendUpdateStatus({ state: "error", error: error.message });
        console.error("Updateprüfung fehlgeschlagen:", error);
    });

    await autoUpdater.checkForUpdates();
    await updateDialogPromise;
    await updateReadyDialogPromise;
}

async function createWindow() {
    process.env.PROJECTBUILDER_DATA_DIR = app.getPath("userData");

    const { startServer } = await import("../server.js");
    const { settings } = await import("../database/index.js");
    const getSetting = (key, fallback = "") =>
        settings.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? fallback;
    const configuredPort = Number.parseInt(getSetting("app.preferredPort", "0"), 10);
    const preferredPort = configuredPort === 0
        || (configuredPort >= 1024 && configuredPort <= 65535)
        ? configuredPort
        : 0;
    browserModeEnabled = getSetting("app.openInBrowser", "false") === "true";

    try {
        expressServer = await startServer({ port: preferredPort, host: "127.0.0.1" });
    } catch (error) {
        if (preferredPort === 0 || !["EADDRINUSE", "EACCES"].includes(error?.code)) throw error;
        console.warn(`Port ${preferredPort} ist belegt; ein freier Port wird verwendet.`);
        expressServer = await startServer({ port: 0, host: "127.0.0.1" });
    }
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
            sandbox: true,
            preload: path.join(__dirname, "preload.cjs")
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
    setTimeout(async () => {
        await checkForUpdates().catch(console.error);
        if (browserModeEnabled && mainWindow && !mainWindow.isDestroyed()) {
            await shell.openExternal(appUrl);
            mainWindow.minimize();
        }
    }, 2000);
}

app.whenReady()
    .then(() => {
        Menu.setApplicationMenu(null);
        ipcMain.handle(
            "backup:select-directory",
            async (event, defaultPath) => {
                const result = await dialog.showOpenDialog(mainWindow, {
                    title: getNativeTexts().backupFolder,
                    defaultPath:
                        typeof defaultPath === "string"
                            ? defaultPath
                            : undefined,
                    properties: ["openDirectory", "createDirectory"]
                });

                return result.canceled
                    ? null
                    : result.filePaths[0] ?? null;
            }
        );
        ipcMain.handle("update:get-status", () => updateStatus);
        ipcMain.handle("app:set-language", (_event, language) => {
            if (Object.hasOwn(nativeTexts, language)) appLanguage = language;
            return appLanguage;
        });
        ipcMain.handle("pdf:export-current-view", async (_event, suggestedName) => {
            const safeName = String(suggestedName || "Vertriebsanalyse")
                .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
                .replace(/[. ]+$/g, "") || "Vertriebsanalyse";
            const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `${safeName}.pdf`,
                filters: [{ name: "PDF", extensions: ["pdf"] }]
            });
            if (result.canceled || !result.filePath) return { canceled: true };

            const pdf = await mainWindow.webContents.printToPDF({
                pageSize: "A4",
                landscape: true,
                printBackground: true,
                margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 }
            });
            await fs.promises.writeFile(result.filePath, pdf);
            return { canceled: false, filePath: result.filePath };
        });
        return createWindow();
    })
    .catch(error => {
        console.error(error);
        app.quit();
    });

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => expressServer?.close());
