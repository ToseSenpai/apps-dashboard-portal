import githubService from './github-service.js';
import appStore from '../store/app-store.js';

/**
 * Update Checker Service - Controlla aggiornamenti disponibili per le app
 */
class UpdateChecker {
  constructor() {
    this.checkInterval = null;
    this.isChecking = false;
  }

  /**
   * Avvia check periodico aggiornamenti
   */
  startPeriodicCheck() {
    const settings = appStore.getSettings();
    const interval = settings.checkUpdateInterval || 3600000; // Default 1 ora

    // Stoppa check precedente se attivo
    this.stopPeriodicCheck();

    // Check immediato
    this.checkForUpdates().catch((err) => {
      console.error('Initial update check failed:', err);
    });

    // Setup intervallo
    this.checkInterval = setInterval(() => {
      if (!this.isChecking) {
        this.checkForUpdates().catch((err) => {
          console.error('Periodic update check failed:', err);
        });
      }
    }, interval);

    console.log(`Update checker started with interval: ${interval}ms`);
  }

  /**
   * Ferma check periodico
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Update checker stopped');
    }
  }

  /**
   * Controlla aggiornamenti per tutte le app installate
   * @param {Array} appsDefinitions - Array di definizioni app da apps.json
   * @returns {Promise<Array>} Array di app con aggiornamenti disponibili
   */
  async checkForUpdates(appsDefinitions = []) {
    if (this.isChecking) {
      console.log('Update check already in progress');
      return [];
    }

    this.isChecking = true;

    try {
      const installedApps = appStore.getInstalledApps();
      const appsWithUpdates = [];

      for (const appDef of appsDefinitions) {
        const installedApp = installedApps[appDef.id];

        if (!installedApp) {
          // App non installata, skip
          continue;
        }

        try {
          // Ottieni info da GitHub
          const releaseInfo = await githubService.getAppReleaseInfo(
            appDef.downloadUrl || appDef.changelogUrl
          );

          const latestVersion = releaseInfo.version;
          const installedVersion = installedApp.installedVersion;

          // Confronta versioni
          const comparison = githubService.compareVersions(latestVersion, installedVersion);

          if (comparison > 0) {
            // Aggiornamento disponibile
            appsWithUpdates.push({
              ...appDef,
              installedVersion,
              latestVersion,
              releaseInfo: releaseInfo.releaseInfo,
              downloadUrl: releaseInfo.downloadUrl,
            });
          }
        } catch (error) {
          console.error(`Failed to check updates for ${appDef.id}:`, error);
          // Continua con le altre app
        }
      }

      // Aggiorna timestamp ultimo check
      appStore.setLastUpdateCheck();

      this.isChecking = false;

      return appsWithUpdates;
    } catch (error) {
      this.isChecking = false;
      throw error;
    }
  }

  /**
   * Controlla aggiornamento per una singola app
   * @param {Object} appDefinition - Definizione app
   * @returns {Promise<Object|null>} Info update o null se non disponibile
   */
  async checkAppUpdate(appDefinition) {
    const installedApp = appStore.getInstalledApp(appDefinition.id);

    if (!installedApp) {
      return null; // Non installata
    }

    try {
      const releaseInfo = await githubService.getAppReleaseInfo(
        appDefinition.downloadUrl || appDefinition.changelogUrl
      );

      const latestVersion = releaseInfo.version;
      const installedVersion = installedApp.installedVersion;

      const comparison = githubService.compareVersions(latestVersion, installedVersion);

      if (comparison > 0) {
        return {
          available: true,
          installedVersion,
          latestVersion,
          releaseInfo: releaseInfo.releaseInfo,
          downloadUrl: releaseInfo.downloadUrl,
        };
      }

      return {
        available: false,
        installedVersion,
        latestVersion,
      };
    } catch (error) {
      console.error(`Failed to check update for ${appDefinition.id}:`, error);
      throw error;
    }
  }

  /**
   * Verifica se è necessario un check aggiornamenti
   * Basato sull'intervallo configurato
   * @returns {boolean}
   */
  shouldCheckForUpdates() {
    const lastCheck = appStore.getLastUpdateCheck();

    if (!lastCheck) return true;

    const settings = appStore.getSettings();
    const interval = settings.checkUpdateInterval || 3600000;

    const timeSinceLastCheck = Date.now() - new Date(lastCheck).getTime();

    return timeSinceLastCheck >= interval;
  }

  /**
   * Ottiene statistiche check aggiornamenti
   * @returns {Object} Stats
   */
  getUpdateStats() {
    const lastCheck = appStore.getLastUpdateCheck();
    const settings = appStore.getSettings();

    return {
      lastCheck,
      checkInterval: settings.checkUpdateInterval,
      autoUpdate: settings.autoUpdate,
      isChecking: this.isChecking,
      nextCheck: lastCheck
        ? new Date(new Date(lastCheck).getTime() + settings.checkUpdateInterval).toISOString()
        : null,
    };
  }
}

export default new UpdateChecker();
