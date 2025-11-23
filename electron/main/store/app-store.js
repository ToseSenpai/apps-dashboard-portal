import Store from 'electron-store';
import { app } from 'electron';
import path from 'path';

/**
 * Schema per il database locale
 */
const schema = {
  apps: {
    type: 'object',
    default: {},
    additionalProperties: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        installedVersion: { type: 'string' },
        installPath: { type: 'string' },
        executablePath: { type: ['string', 'null'] },
        installedDate: { type: 'string' },
        lastLaunched: { type: 'string' },
        autoUpdate: { type: 'boolean', default: true },
        autoDetected: { type: 'boolean', default: false },
      },
    },
  },
  settings: {
    type: 'object',
    default: {},
  },
  lastUpdateCheck: {
    type: ['string', 'null'],
    default: null,
  },
};

/**
 * Store singleton per la persistenza dei dati
 */
class AppStore {
  constructor() {
    this.store = new Store({
      schema,
      name: 'apps-launcher-config',
      fileExtension: 'json',
    });
  }

  // ========================================
  // Apps Management
  // ========================================

  /**
   * Ottiene tutte le app installate
   * @returns {Object} Oggetto con app installate
   */
  getInstalledApps() {
    return this.store.get('apps', {});
  }

  /**
   * Ottiene info di una singola app installata
   * @param {string} appId - ID dell'app
   * @returns {Object|null} Dati app o null se non installata
   */
  getInstalledApp(appId) {
    return this.store.get(`apps.${appId}`, null);
  }

  /**
   * Salva info app installata
   * @param {string} appId - ID dell'app
   * @param {Object} appData - Dati da salvare
   */
  setInstalledApp(appId, appData) {
    this.store.set(`apps.${appId}`, {
      ...appData,
      id: appId,
      installedDate: appData.installedDate || new Date().toISOString(),
    });
  }

  /**
   * Rimuove app dal database (dopo disinstallazione)
   * @param {string} appId - ID dell'app
   */
  removeInstalledApp(appId) {
    this.store.delete(`apps.${appId}`);
  }

  /**
   * Aggiorna timestamp ultimo lancio
   * @param {string} appId - ID dell'app
   */
  updateLastLaunched(appId) {
    const app = this.getInstalledApp(appId);
    if (app) {
      this.store.set(`apps.${appId}.lastLaunched`, new Date().toISOString());
    }
  }

  /**
   * Verifica se un'app è installata
   * @param {string} appId - ID dell'app
   * @returns {boolean}
   */
  isAppInstalled(appId) {
    return this.getInstalledApp(appId) !== null;
  }

  // ========================================
  // Settings Management
  // ========================================

  /**
   * Ottiene tutte le impostazioni
   * @returns {Object} Oggetto impostazioni
   */
  getSettings() {
    const settings = this.store.get('settings');

    // Inizializza default se necessario
    if (!settings || Object.keys(settings).length === 0) {
      const defaults = {
        installDirectory: path.join(app.getPath('home'), 'AppsLauncher'),
        autoUpdate: true,
        checkUpdateInterval: 3600000,
        launchOnStartup: false,
        minimizeToTray: false,
        theme: 'system',
      };
      this.store.set('settings', defaults);
      return defaults;
    }

    return settings;
  }

  /**
   * Ottiene una singola impostazione
   * @param {string} key - Chiave impostazione
   * @returns {*} Valore impostazione
   */
  getSetting(key) {
    return this.store.get(`settings.${key}`);
  }

  /**
   * Aggiorna impostazioni
   * @param {Object} settings - Nuove impostazioni (merge)
   */
  updateSettings(settings) {
    const currentSettings = this.getSettings();
    this.store.set('settings', {
      ...currentSettings,
      ...settings,
    });
  }

  /**
   * Aggiorna singola impostazione
   * @param {string} key - Chiave impostazione
   * @param {*} value - Nuovo valore
   */
  updateSetting(key, value) {
    this.store.set(`settings.${key}`, value);
  }

  /**
   * Reset impostazioni a default
   */
  resetSettings() {
    this.store.set('settings', schema.settings.default);
  }

  // ========================================
  // Update Tracking
  // ========================================

  /**
   * Ottiene timestamp ultimo check aggiornamenti
   * @returns {string|null} ISO timestamp
   */
  getLastUpdateCheck() {
    return this.store.get('lastUpdateCheck');
  }

  /**
   * Aggiorna timestamp ultimo check
   */
  setLastUpdateCheck() {
    this.store.set('lastUpdateCheck', new Date().toISOString());
  }

  // ========================================
  // Utility
  // ========================================

  /**
   * Reset completo database
   */
  reset() {
    this.store.clear();
  }

  /**
   * Ottiene path del file store
   * @returns {string} Path assoluto
   */
  getStorePath() {
    return this.store.path;
  }
}

// Export singleton instance
export default new AppStore();
