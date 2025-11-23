import { ipcMain, dialog, app as electronApp } from 'electron';
import fs from 'fs';
import path from 'path';

// Import services
import appStore from '../store/app-store.js';
import githubService from '../services/github-service.js';
import downloadManager from '../services/download-manager.js';
import installManager from '../services/install-manager.js';
import launcherService from '../services/launcher-service.js';
import updateChecker from '../services/update-checker.js';
import versionCacheService from '../services/version-cache-service.js';

/**
 * Carica apps.json dal filesystem
 */
function loadAppsJson() {
  const appsJsonPath = path.join(process.cwd(), 'public', 'apps.json');

  if (!fs.existsSync(appsJsonPath)) {
    throw new Error('apps.json not found');
  }

  const data = fs.readFileSync(appsJsonPath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Arricchisce dati app con stato installazione e versione da GitHub
 */
async function enrichAppData(app) {
  const installedApp = appStore.getInstalledApp(app.id);
  const isRunning = launcherService.isAppRunning(app.id);

  // Fetch latest version from GitHub (with cache)
  let latestVersion = app.version; // fallback to apps.json version
  try {
    latestVersion = await versionCacheService.getLatestVersion(
      app.id,
      app.downloadUrl || app.changelogUrl,
      app.version
    );
  } catch (error) {
    console.warn(`[EnrichAppData] Failed to fetch GitHub version for ${app.id}, using fallback:`, error.message);
  }

  if (installedApp) {
    // Verifica se l'eseguibile è valido (path esiste E file esiste sul filesystem)
    if (!installedApp.executablePath || !fs.existsSync(installedApp.executablePath)) {
      const reason = !installedApp.executablePath
        ? 'no executable path registered'
        : `executable not found: ${installedApp.executablePath}`;

      console.warn(`[EnrichAppData] App ${app.id} registered as installed but ${reason}`);
      console.log(`[EnrichAppData] Removing ${app.id} from database (invalid installation)`);

      // Rimuovi app dal database
      appStore.removeInstalledApp(app.id);

      // Tratta come non installata
      return {
        ...app,
        version: latestVersion,
        installStatus: 'not_installed',
        installedVersion: null,
        isRunning: false,
      };
    }

    return {
      ...app,
      version: latestVersion, // Use GitHub version as source of truth
      installStatus: 'installed',
      installedVersion: installedApp.installedVersion,
      installPath: installedApp.installPath,
      executablePath: installedApp.executablePath,
      lastLaunched: installedApp.lastLaunched,
      isRunning,
    };
  }

  return {
    ...app,
    version: latestVersion, // Use GitHub version as source of truth
    installStatus: 'not_installed',
    installedVersion: null,
    isRunning: false,
  };
}

/**
 * Setup di tutti gli IPC handlers
 */
export function setupIpcHandlers(mainWindow) {
  // ========================================
  // Apps Management
  // ========================================

  /**
   * Ottiene lista app con stato installazione e versioni aggiornate da GitHub
   */
  ipcMain.handle('app:get-all', async () => {
    try {
      const appsData = loadAppsJson();

      // Enrichment in parallel for performance (async version fetching)
      const enrichedApps = await Promise.all(
        appsData.map(app => enrichAppData(app))
      );

      return { success: true, data: enrichedApps };
    } catch (error) {
      console.error('Failed to load apps:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Installa un'applicazione
   */
  ipcMain.handle('app:install', async (event, appId) => {
    try {
      const appsData = loadAppsJson();
      const appDef = appsData.find((a) => a.id === appId);

      if (!appDef) {
        throw new Error('App not found');
      }

      // Ottieni info release da GitHub
      console.log(`[DEBUG] Fetching release info for ${appId} from:`, appDef.downloadUrl || appDef.changelogUrl);
      const releaseInfo = await githubService.getAppReleaseInfo(
        appDef.downloadUrl || appDef.changelogUrl
      );

      console.log(`[DEBUG] Release info for ${appId}:`, {
        version: releaseInfo.version,
        downloadUrl: releaseInfo.downloadUrl,
        assetsCount: releaseInfo.assets?.length || 0,
      });

      if (!releaseInfo.downloadUrl) {
        throw new Error('No installer found for this app');
      }

      // Download con progress
      const installerPath = await downloadManager.downloadFile(
        appId,
        releaseInfo.downloadUrl,
        (progressData) => {
          mainWindow.webContents.send('download:progress', progressData);
        }
      );

      // Installazione
      await installManager.installApp(
        appId,
        installerPath,
        {
          version: releaseInfo.version,
          appName: appDef.name,
          githubUrl: appDef.downloadUrl || appDef.changelogUrl, // Pass GitHub URL for repo name extraction
        },
        (statusData) => {
          mainWindow.webContents.send('install:status', statusData);
        }
      );

      console.log(`[IPC] Installation completed for ${appId}, waiting before sending operation:complete...`);
      // Attendi un momento per assicurarsi che tutto sia salvato e pronto
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Emetti evento completamento
      console.log(`[IPC] Sending operation:complete event for ${appId}`);
      mainWindow.webContents.send('operation:complete', {
        appId,
        operation: 'install',
        success: true,
      });

      return { success: true, version: releaseInfo.version };
    } catch (error) {
      console.error(`Installation failed for ${appId}:`, error);

      mainWindow.webContents.send('operation:complete', {
        appId,
        operation: 'install',
        success: false,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  });

  /**
   * Disinstalla un'applicazione
   */
  ipcMain.handle('app:uninstall', async (event, appId) => {
    try {
      await installManager.uninstallApp(appId, (statusData) => {
        mainWindow.webContents.send('install:status', statusData);
      });

      mainWindow.webContents.send('operation:complete', {
        appId,
        operation: 'uninstall',
        success: true,
      });

      return { success: true };
    } catch (error) {
      console.error(`Uninstall failed for ${appId}:`, error);

      mainWindow.webContents.send('operation:complete', {
        appId,
        operation: 'uninstall',
        success: false,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  });

  /**
   * Lancia un'applicazione
   */
  ipcMain.handle('app:launch', async (event, appId) => {
    try {
      await launcherService.launchApp(appId);
      return { success: true };
    } catch (error) {
      console.error(`Launch failed for ${appId}:`, error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Seleziona manualmente l'eseguibile per un'app installata
   */
  ipcMain.handle('app:select-executable', async (event, appId) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        title: 'Seleziona eseguibile applicazione',
        filters: [
          { name: 'Eseguibili', extensions: ['exe'] },
          { name: 'Tutti i file', extensions: ['*'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const executablePath = result.filePaths[0];

      // Aggiorna il database con il path selezionato
      const installedApp = appStore.getInstalledApp(appId);
      if (installedApp) {
        appStore.setInstalledApp(appId, {
          ...installedApp,
          executablePath
        });
      }

      // Notifica il renderer dell'aggiornamento
      mainWindow.webContents.send('operation:complete', {
        appId,
        operation: 'locate-exe',
        success: true,
      });

      return { success: true, path: executablePath };
    } catch (error) {
      console.error(`Failed to select executable for ${appId}:`, error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Aggiorna un'applicazione
   */
  ipcMain.handle('app:update', async (event, appId) => {
    try {
      // Disinstalla versione esistente
      await installManager.uninstallApp(appId, (statusData) => {
        mainWindow.webContents.send('install:status', statusData);
      });

      // Reinstalla ultima versione
      const appsData = loadAppsJson();
      const appDef = appsData.find((a) => a.id === appId);

      if (!appDef) {
        throw new Error('App not found');
      }

      const releaseInfo = await githubService.getAppReleaseInfo(
        appDef.downloadUrl || appDef.changelogUrl
      );

      const installerPath = await downloadManager.downloadFile(
        appId,
        releaseInfo.downloadUrl,
        (progressData) => {
          mainWindow.webContents.send('download:progress', progressData);
        }
      );

      await installManager.installApp(
        appId,
        installerPath,
        {
          version: releaseInfo.version,
          appName: appDef.name,
          githubUrl: appDef.downloadUrl || appDef.changelogUrl, // Pass GitHub URL for repo name extraction
        },
        (statusData) => {
          mainWindow.webContents.send('install:status', statusData);
        }
      );

      console.log(`[IPC] Update completed for ${appId}, waiting before sending operation:complete...`);
      // Attendi un momento per assicurarsi che tutto sia salvato e pronto
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Emetti evento completamento
      console.log(`[IPC] Sending operation:complete event for ${appId}`);
      mainWindow.webContents.send('operation:complete', {
        appId,
        operation: 'update',
        success: true,
      });

      return { success: true, version: releaseInfo.version };
    } catch (error) {
      console.error(`Update failed for ${appId}:`, error);

      mainWindow.webContents.send('operation:complete', {
        appId,
        operation: 'update',
        success: false,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  });

  // ========================================
  // Settings
  // ========================================

  /**
   * Ottiene impostazioni
   */
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = appStore.getSettings();
      return { success: true, data: settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Aggiorna impostazioni
   */
  ipcMain.handle('settings:update', async (event, newSettings) => {
    try {
      appStore.updateSettings(newSettings);

      // Se cambia intervallo check, riavvia periodic checker
      if (newSettings.checkUpdateInterval) {
        updateChecker.startPeriodicCheck();
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Dialog per selezionare cartella
   */
  ipcMain.handle('dialog:select-folder', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Seleziona cartella di installazione',
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      return { success: true, path: result.filePaths[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ========================================
  // Updates
  // ========================================

  /**
   * Controlla aggiornamenti per tutte le app
   */
  ipcMain.handle('updates:check', async () => {
    try {
      const appsData = loadAppsJson();
      const updates = await updateChecker.checkForUpdates(appsData);

      if (updates.length > 0) {
        mainWindow.webContents.send('updates:available', updates);
      }

      return { success: true, updates };
    } catch (error) {
      console.error('Update check failed:', error);
      return { success: false, error: error.message };
    }
  });

  // ========================================
  // System Info
  // ========================================

  /**
   * Ottiene info di sistema
   */
  ipcMain.handle('system:info', async () => {
    try {
      return {
        success: true,
        data: {
          platform: process.platform,
          arch: process.arch,
          version: electronApp.getVersion(),
          electronVersion: process.versions.electron,
          chromeVersion: process.versions.chrome,
          nodeVersion: process.versions.node,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('IPC handlers setup complete');
}
