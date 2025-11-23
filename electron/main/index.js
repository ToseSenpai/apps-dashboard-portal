import 'dotenv/config'; // Carica variabili da .env PRIMA di tutto
import electron from 'electron';
import path from 'path';
import fs from 'fs';
import { setupIpcHandlers } from './ipc/handlers.js';
import updateChecker from './services/update-checker.js';
import downloadManager from './services/download-manager.js';
import autoDetectService from './services/auto-detect-service.js';

const { app, BrowserWindow } = electron;

// Riferimento alla finestra principale
let mainWindow = null;

/**
 * Crea la finestra principale dell'applicazione
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#FAFAFA',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    // Windows 11 specifics
    frame: true,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../public/vite.svg'),
  });

  // Carica l'app React
  if (!app.isPackaged) {
    // Development mode - electron-vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Temporarily enable DevTools for debugging
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Gestione chiusura finestra
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Esegue la sequenza di startup con progress events
 */
async function performStartupSequence() {
  try {
    // Phase 1: Inizializzazione
    console.log('[Startup] Phase 1: Initializing...');
    mainWindow.webContents.send('startup:progress', {
      phase: 'initializing',
      message: 'Initializing...',
    });

    // Setup IPC handlers
    setupIpcHandlers(mainWindow);

    // Avvia update checker periodico
    updateChecker.startPeriodicCheck();

    await new Promise(resolve => setTimeout(resolve, 500));

    // Phase 2: Cleanup
    console.log('[Startup] Phase 2: Cleaning up...');
    mainWindow.webContents.send('startup:progress', {
      phase: 'cleanup',
      message: 'Cleaning up temporary files...',
    });

    downloadManager.cleanupOldTempFiles();
    await new Promise(resolve => setTimeout(resolve, 300));

    // Phase 3: Auto-detect
    console.log('[Startup] Phase 3: Detecting installed apps...');
    mainWindow.webContents.send('startup:progress', {
      phase: 'detecting',
      message: 'Detecting installed apps...',
    });

    // Carica apps.json
    const appsJsonPath = path.join(process.cwd(), 'public', 'apps.json');

    if (fs.existsSync(appsJsonPath)) {
      const appsData = JSON.parse(fs.readFileSync(appsJsonPath, 'utf-8'));

      // Esegui scan
      const scanResults = await autoDetectService.scanForInstalledApps(appsData);

      // Se trovate app, notifica il renderer per refresh
      if (scanResults.detected.length > 0) {
        console.log(`[Startup] Auto-detected ${scanResults.detected.length} apps:`,
          scanResults.detected.map(r => r.appName).join(', '));

        mainWindow.webContents.send('apps:auto-detected', scanResults.detected);
      } else {
        console.log('[Startup] No new apps auto-detected');
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Phase 4: Complete
    console.log('[Startup] Phase 4: Loading complete');
    mainWindow.webContents.send('startup:progress', {
      phase: 'complete',
      message: 'Loading complete',
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    // Notifica completamento
    mainWindow.webContents.send('startup:complete');
    console.log('[Startup] Startup sequence completed');

  } catch (error) {
    console.error('[Startup] Startup sequence failed:', error);
    // Anche in caso di errore, completa il loading
    mainWindow.webContents.send('startup:complete');
  }
}

/**
 * Inizializzazione app
 */
app.whenReady().then(() => {
  createWindow();

  // Attendi che la finestra sia pronta, poi esegui startup sequence
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Startup] Window loaded, starting startup sequence...');
    performStartupSequence();
  });

  // macOS: ricrea finestra quando app è attivata senza finestre aperte
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Chiudi app quando tutte le finestre sono chiuse (Windows & Linux)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Security: Previeni navigazione non autorizzata
 */
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Permetti solo navigazione locale in development
    if (process.env.VITE_DEV_SERVER_URL) {
      const devUrl = new URL(process.env.VITE_DEV_SERVER_URL);
      if (parsedUrl.origin !== devUrl.origin) {
        event.preventDefault();
      }
    } else {
      // In produzione, previeni tutte le navigazioni
      event.preventDefault();
    }
  });
});
