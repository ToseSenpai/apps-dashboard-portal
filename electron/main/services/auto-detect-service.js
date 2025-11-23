import path from 'path';
import fs from 'fs';
import installManager from './install-manager.js';
import appStore from '../store/app-store.js';

/**
 * Auto-Detect Service - Rileva automaticamente app già installate su Windows
 */
class AutoDetectService {
  /**
   * Genera variazioni del nome app per la ricerca
   * @param {string} appName - Nome app originale
   * @returns {Array<string>} Array di variazioni da provare
   */
  generateNameVariations(appName) {
    const variations = [];

    // 1. Nome completo originale
    variations.push(appName);

    // 2. Rimuovi contenuto tra parentesi: "App (Test)" -> "App"
    const withoutParentheses = appName.replace(/\s*\([^)]*\)/g, '').trim();
    if (withoutParentheses && withoutParentheses !== appName) {
      variations.push(withoutParentheses);
    }

    // 3. Rimuovi suffissi dopo trattini: "App - Test" -> "App"
    const withoutDashes = appName.split(/\s*[-–—]\s*/)[0].trim();
    if (withoutDashes && withoutDashes !== appName && !variations.includes(withoutDashes)) {
      variations.push(withoutDashes);
    }

    // 4. Prima parola (solo se non già inclusa)
    const firstWord = appName.split(/\s+/)[0].trim();
    if (firstWord && firstWord !== appName && !variations.includes(firstWord)) {
      variations.push(firstWord);
    }

    console.log(`[AutoDetect] Name variations for "${appName}":`, variations);
    return variations;
  }

  /**
   * Scansiona apps.json e cerca app già installate sul sistema
   * @param {Array} appsData - Array di definizioni app da apps.json
   * @returns {Promise<Object>} Risultati scan {detected, skipped, errors}
   */
  async scanForInstalledApps(appsData) {
    console.log('[AutoDetect] Starting automatic app detection scan...');

    const results = {
      detected: [],
      skipped: [],
      errors: [],
    };

    for (const app of appsData) {
      // Verifica app già registrate nel database
      if (appStore.isAppInstalled(app.id)) {
        const installedApp = appStore.getInstalledApp(app.id);

        // Verifica se l'eseguibile esiste ancora sul filesystem
        if (installedApp.executablePath && fs.existsSync(installedApp.executablePath)) {
          console.log(`[AutoDetect] Skipping ${app.id} - already registered and valid`);
          results.skipped.push(app.id);
          continue;
        } else {
          // Eseguibile non esiste più - rimuovi dal database e riprova a cercare
          console.warn(`[AutoDetect] ${app.id} registered but executable missing: ${installedApp.executablePath || 'null'}`);
          console.log(`[AutoDetect] Removing ${app.id} from database and retrying detection...`);
          appStore.removeInstalledApp(app.id);
          // Continua con la ricerca normale (non skip)
        }
      }

      try {
        console.log(`[AutoDetect] Searching for ${app.name} (${app.id})...`);

        // Genera variazioni del nome da provare
        const nameVariations = this.generateNameVariations(app.name);
        let executablePath = null;
        let foundWithName = null;

        // Prova ogni variazione fino a trovare l'eseguibile
        for (const nameVariation of nameVariations) {
          try {
            console.log(`[AutoDetect] Trying name variation: "${nameVariation}"`);

            executablePath = await installManager.findInstalledExecutable(
              app.id,
              '', // empty installDir - cerca solo in Program Files e AppData
              nameVariation
            );

            if (executablePath) {
              foundWithName = nameVariation;
              console.log(`[AutoDetect] Found ${app.name} using variation "${nameVariation}" at: ${executablePath}`);
              break;
            }
          } catch (error) {
            // Questa variazione non ha trovato nulla, prova la prossima
            continue;
          }
        }

        if (executablePath) {
          // Registra app nel database
          appStore.setInstalledApp(app.id, {
            installedVersion: app.version || 'unknown',
            installPath: path.dirname(executablePath),
            executablePath: executablePath,
            installedDate: new Date().toISOString(),
            autoDetected: true, // flag per indicare rilevamento automatico
          });

          results.detected.push({
            appId: app.id,
            appName: app.name,
            executablePath,
            foundWithName,
          });
        } else {
          console.log(`[AutoDetect] ${app.name} not found with any name variation`);
        }
      } catch (error) {
        // App non trovata o errore - non è un problema, semplicemente non installata
        console.log(`[AutoDetect] ${app.name} search error: ${error.message}`);
        // Non aggiungiamo agli errors, è normale che alcune app non siano installate
      }
    }

    console.log('[AutoDetect] Scan completed:', {
      detected: results.detected.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
    });

    return results;
  }

  /**
   * Scansiona una singola app specifica
   * @param {Object} appDef - Definizione app da cercare
   * @returns {Promise<boolean>} true se trovata e registrata
   */
  async scanSingleApp(appDef) {
    // Salta se già registrata
    if (appStore.isAppInstalled(appDef.id)) {
      console.log(`[AutoDetect] ${appDef.id} already registered`);
      return false;
    }

    try {
      console.log(`[AutoDetect] Searching for ${appDef.name}...`);

      // Genera variazioni del nome da provare
      const nameVariations = this.generateNameVariations(appDef.name);
      let executablePath = null;

      // Prova ogni variazione fino a trovare l'eseguibile
      for (const nameVariation of nameVariations) {
        try {
          console.log(`[AutoDetect] Trying name variation: "${nameVariation}"`);

          executablePath = await installManager.findInstalledExecutable(
            appDef.id,
            '',
            nameVariation
          );

          if (executablePath) {
            console.log(`[AutoDetect] Found ${appDef.name} using variation "${nameVariation}" at: ${executablePath}`);
            break;
          }
        } catch (error) {
          // Questa variazione non ha trovato nulla, prova la prossima
          continue;
        }
      }

      if (executablePath) {
        appStore.setInstalledApp(appDef.id, {
          installedVersion: appDef.version || 'unknown',
          installPath: path.dirname(executablePath),
          executablePath: executablePath,
          installedDate: new Date().toISOString(),
          autoDetected: true,
        });

        return true;
      }

      console.log(`[AutoDetect] ${appDef.name} not found with any name variation`);
      return false;
    } catch (error) {
      console.log(`[AutoDetect] ${appDef.name} search error: ${error.message}`);
      return false;
    }
  }
}

export default new AutoDetectService();
