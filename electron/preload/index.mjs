import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Espone API sicure al renderer process
 *
 * Utilizza contextBridge per esporre funzionalità IPC in modo controllato
 * senza esporre direttamente Node.js o Electron al renderer.
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // ========================================
  // Apps Management
  // ========================================

  /**
   * Ottiene la lista di tutte le app con stato installazione
   */
  getApps: () => ipcRenderer.invoke('app:get-all'),

  /**
   * Installa un'applicazione
   * @param {string} appId - ID dell'app da installare
   */
  installApp: (appId) => ipcRenderer.invoke('app:install', appId),

  /**
   * Disinstalla un'applicazione
   * @param {string} appId - ID dell'app da disinstallare
   */
  uninstallApp: (appId) => ipcRenderer.invoke('app:uninstall', appId),

  /**
   * Lancia un'applicazione installata
   * @param {string} appId - ID dell'app da lanciare
   */
  launchApp: (appId) => ipcRenderer.invoke('app:launch', appId),

  /**
   * Aggiorna un'applicazione
   * @param {string} appId - ID dell'app da aggiornare
   */
  updateApp: (appId) => ipcRenderer.invoke('app:update', appId),

  /**
   * Seleziona manualmente l'eseguibile per un'app
   * @param {string} appId - ID dell'app
   */
  selectExecutable: (appId) => ipcRenderer.invoke('app:select-executable', appId),

  // ========================================
  // Download & Installation Progress
  // ========================================

  /**
   * Ascolta eventi di progresso download
   * @param {Function} callback - Callback chiamato con {appId, progress, bytesReceived, bytesTotal}
   */
  onDownloadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('download:progress', subscription);

    // Ritorna funzione per rimuovere listener
    return () => ipcRenderer.removeListener('download:progress', subscription);
  },

  /**
   * Ascolta eventi di stato installazione
   * @param {Function} callback - Callback chiamato con {appId, status, message}
   */
  onInstallStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('install:status', subscription);

    // Ritorna funzione per rimuovere listener
    return () => ipcRenderer.removeListener('install:status', subscription);
  },

  /**
   * Ascolta eventi di completamento operazioni
   * @param {Function} callback - Callback chiamato con {appId, operation, success, error}
   */
  onOperationComplete: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('operation:complete', subscription);

    return () => ipcRenderer.removeListener('operation:complete', subscription);
  },

  // ========================================
  // Settings
  // ========================================

  /**
   * Ottiene le impostazioni correnti
   */
  getSettings: () => ipcRenderer.invoke('settings:get'),

  /**
   * Aggiorna le impostazioni
   * @param {Object} settings - Nuove impostazioni
   */
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

  /**
   * Seleziona una cartella (dialog)
   */
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),

  // ========================================
  // Updates
  // ========================================

  /**
   * Controlla aggiornamenti per tutte le app
   */
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),

  /**
   * Ascolta notifiche di aggiornamenti disponibili
   * @param {Function} callback - Callback con lista app da aggiornare
   */
  onUpdatesAvailable: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('updates:available', subscription);

    return () => ipcRenderer.removeListener('updates:available', subscription);
  },

  /**
   * Ascolta notifiche di app auto-rilevate
   * @param {Function} callback - Callback con lista app rilevate
   */
  onAppsAutoDetected: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('apps:auto-detected', subscription);

    return () => ipcRenderer.removeListener('apps:auto-detected', subscription);
  },

  // ========================================
  // Startup & Loading
  // ========================================

  /**
   * Ascolta eventi di progresso durante lo startup
   * @param {Function} callback - Callback con {phase, message}
   */
  onStartupProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('startup:progress', subscription);

    return () => ipcRenderer.removeListener('startup:progress', subscription);
  },

  /**
   * Ascolta evento di completamento startup
   * @param {Function} callback - Callback chiamato quando startup è completo
   */
  onStartupComplete: (callback) => {
    const subscription = (event) => callback();
    ipcRenderer.on('startup:complete', subscription);

    return () => ipcRenderer.removeListener('startup:complete', subscription);
  },

  // ========================================
  // System Info
  // ========================================

  /**
   * Ottiene informazioni di sistema
   */
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
});
