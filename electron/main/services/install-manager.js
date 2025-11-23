import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { app, dialog, BrowserWindow } from 'electron';
import AdmZip from 'adm-zip';
import appStore from '../store/app-store.js';

const fsExists = promisify(fs.exists);
const fsMkdir = promisify(fs.mkdir);

/**
 * Installation Manager - Gestisce installazione/disinstallazione app
 */
class InstallManager {
  constructor() {
    this.activeInstallations = new Map();
  }

  /**
   * Rileva tipo installer dal filename
   * @param {string} filePath - Path al file
   * @returns {string} Tipo: 'exe' | 'msi' | 'zip' | 'unknown'
   */
  detectInstallerType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.exe':
        return 'exe';
      case '.msi':
        return 'msi';
      case '.zip':
        return 'zip';
      default:
        return 'unknown';
    }
  }

  /**
   * Genera parametri per installazione silenziosa
   * @param {string} installerType - Tipo installer
   * @param {string} installPath - Path di installazione desiderato (opzionale)
   * @returns {Array<string>} Array di parametri
   */
  getSilentInstallParams(installerType, installPath) {
    switch (installerType) {
      case 'exe':
        // NSIS installer (più comune)
        // NOTA: /S è case-sensitive!
        // /D deve essere l'ULTIMO parametro
        const params = ['/S'];
        if (installPath) {
          // /D= NON supporta virgolette, DEVE essere ultimo parametro
          params.push(`/D=${installPath}`);
        }
        return params;

      case 'msi':
        // MSI silent install
        const msiParams = ['/i', '/quiet', '/norestart'];
        if (installPath) {
          msiParams.push(`INSTALLDIR="${installPath}"`);
        }
        return msiParams;

      default:
        return [];
    }
  }

  /**
   * Installa applicazione
   * @param {string} appId - ID dell'app
   * @param {string} installerPath - Path al file installer
   * @param {Object} options - Opzioni installazione
   * @param {Function} statusCallback - Callback per status updates
   * @returns {Promise<Object>} Info installazione {installPath, executablePath}
   */
  async installApp(appId, installerPath, options = {}, statusCallback) {
    if (this.activeInstallations.has(appId)) {
      throw new Error('Installation already in progress for this app');
    }

    const installerType = this.detectInstallerType(installerPath);

    if (installerType === 'unknown') {
      throw new Error('Unknown installer type');
    }

    try {
      this.activeInstallations.set(appId, { status: 'installing' });

      if (statusCallback) {
        statusCallback({
          appId,
          status: 'preparing',
          message: 'Preparazione installazione...',
        });
      }

      let installInfo;

      if (installerType === 'zip') {
        // Gestione ZIP (estrazione)
        installInfo = await this.installFromZip(appId, installerPath, options, statusCallback);
      } else {
        // Gestione installer EXE/MSI
        installInfo = await this.runInstaller(appId, installerPath, installerType, options, statusCallback);
      }

      // DEBUG: Log dettagliato prima di salvare nel database
      console.log('═══════════════════════════════════════════════════');
      console.log(`[InstallManager] Saving installation data to database for ${appId}:`);
      console.log(`  - Installed version: ${options.version || '1.0.0'}`);
      console.log(`  - Install path: ${installInfo.installPath}`);
      console.log(`  - Executable path: ${installInfo.executablePath}`);
      console.log(`  - Executable filename: ${path.basename(installInfo.executablePath || 'N/A')}`);

      // Verifica se il path dell'eseguibile sembra un installer
      if (installInfo.executablePath) {
        const exeFileName = path.basename(installInfo.executablePath).toLowerCase();
        const suspiciousPatterns = ['setup', 'install', 'installer', 'unins'];
        const isSuspicious = suspiciousPatterns.some(pattern => exeFileName.includes(pattern));

        if (isSuspicious) {
          console.warn(`  ⚠️ WARNING: Executable filename appears to be an installer: ${exeFileName}`);
          console.warn(`  This may cause white screen issues when launching!`);
        }
      }
      console.log('═══════════════════════════════════════════════════');

      // Salva info nel database
      appStore.setInstalledApp(appId, {
        installedVersion: options.version || '1.0.0',
        installPath: installInfo.installPath,
        executablePath: installInfo.executablePath,
      });

      this.activeInstallations.delete(appId);

      if (statusCallback) {
        statusCallback({
          appId,
          status: 'completed',
          message: 'Installazione completata',
        });
      }

      return installInfo;
    } catch (error) {
      this.activeInstallations.delete(appId);

      if (statusCallback) {
        statusCallback({
          appId,
          status: 'error',
          message: `Errore installazione: ${error.message}`,
        });
      }

      throw error;
    }
  }

  /**
   * Esegue installer EXE o MSI
   * @param {string} appId - ID dell'app
   * @param {string} installerPath - Path installer
   * @param {string} installerType - Tipo installer
   * @param {Object} options - Opzioni
   * @param {Function} statusCallback - Callback status
   * @returns {Promise<Object>} Info installazione
   */
  async runInstaller(appId, installerPath, installerType, options, statusCallback) {
    return new Promise((resolve, reject) => {
      const settings = appStore.getSettings();
      const baseInstallDir = options.installPath || settings.installDirectory;

      // NON forziamo una directory specifica - lasciamo che l'installer scelga la migliore location
      // Molti installer moderni ignorano /D= e si installano in AppData o Program Files
      // La ricerca automatica troverà l'app ovunque sia installata
      console.log(`[InstallManager] Allowing installer to choose installation directory (base hint: ${baseInstallDir})`);

      // Parametri silenziosi SENZA path forzato (rimozione /D=)
      const params = this.getSilentInstallParams(installerType, null); // Pass null = no forced path

      if (statusCallback) {
        statusCallback({
          appId,
          status: 'installing',
          message: 'Installazione in corso...',
        });
      }

      // Determina comando
      let command;
      let args;

      if (installerType === 'msi') {
        command = 'msiexec';
        args = params.concat([installerPath]);
      } else {
        command = installerPath;
        args = params;
      }

      const installer = spawn(command, args, {
        stdio: 'ignore',
        shell: true,
        windowsHide: true,
      });

      installer.on('close', async (code) => {
        console.log(`[InstallManager] Installer process closed for ${appId} with code ${code}`);

        if (code === 0) {
          // Attendi 2 secondi per assicurarsi che l'installer sia completamente terminato
          console.log(`[InstallManager] Waiting 2 seconds for ${appId} installer to fully complete...`);
          await new Promise((res) => setTimeout(res, 2000));

          // Installazione riuscita - cerca eseguibile con polling
          console.log(`[InstallManager] Searching for executable for ${appId}...`);

          try {
            // Cerca l'eseguibile in TUTTE le location possibili (Registry, AppData, Program Files)
            // baseInstallDir è solo un hint, la ricerca è globale
            const executablePath = await this.findInstalledExecutableWithPolling(
              appId,
              baseInstallDir, // Hint generico - la ricerca cerca ovunque
              options.appName,
              10, // max attempts
              3000, // 3 seconds between attempts (30s total)
              options.githubUrl // GitHub URL per estrarre nome repo
            );

            // Estrai la directory reale dell'app dall'eseguibile trovato
            const realInstallPath = path.dirname(executablePath);

            console.log(`[InstallManager] ✓ Executable found for ${appId}: ${executablePath}`);
            console.log(`[InstallManager] ✓ Actual install location: ${realInstallPath}`);

            resolve({
              installPath: realInstallPath, // Salva il path REALE dove l'app è installata
              executablePath,
            });
          } catch (err) {
            // Se non troviamo l'exe dopo polling, chiedi all'utente di selezionarlo
            console.warn(`[InstallManager] Could not locate executable for ${appId} after polling:`, err);
            console.log(`[InstallManager] Prompting user to manually locate executable...`);

            // Ottieni riferimento alla finestra principale
            const mainWindow = BrowserWindow.getAllWindows()[0];

            // Mostra dialog per selezione file
            const result = await dialog.showOpenDialog(mainWindow, {
              title: `Locate ${options.appName || appId} Executable`,
              message: `Cannot automatically find the executable for ${options.appName || appId}. Please select it manually.`,
              properties: ['openFile'],
              filters: [
                { name: 'Executable Files', extensions: ['exe'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              defaultPath: baseInstallDir
            });

            if (result.canceled || result.filePaths.length === 0) {
              // Utente ha cancellato - fallback a null
              console.warn(`[InstallManager] User canceled executable selection for ${appId}`);
              resolve({
                installPath: baseInstallDir, // Fallback generico
                executablePath: null,
              });
            } else {
              // Utente ha selezionato un file
              const selectedPath = result.filePaths[0];
              const selectedInstallPath = path.dirname(selectedPath);
              console.log(`[InstallManager] User selected executable: ${selectedPath}`);
              console.log(`[InstallManager] Detected install path: ${selectedInstallPath}`);
              resolve({
                installPath: selectedInstallPath, // Salva directory reale del file selezionato
                executablePath: selectedPath,
              });
            }
          }
        } else {
          reject(new Error(`Installation failed with exit code: ${code}`));
        }
      });

      installer.on('error', (err) => {
        reject(new Error(`Failed to start installer: ${err.message}`));
      });
    });
  }

  /**
   * Installa da archivio ZIP (estrazione)
   * @param {string} appId - ID dell'app
   * @param {string} zipPath - Path al ZIP
   * @param {Object} options - Opzioni
   * @param {Function} statusCallback - Callback
   * @returns {Promise<Object>} Info installazione
   */
  async installFromZip(appId, zipPath, options, statusCallback) {
    console.log(`[InstallManager] Starting ZIP extraction for ${appId}...`);

    try {
      if (statusCallback) {
        statusCallback({
          appId,
          status: 'extracting',
          message: 'Estrazione archivio in corso...',
        });
      }

      // Definisci path di destinazione in AppData (nessun admin richiesto)
      const extractPath = path.join(
        app.getPath('appData'),
        'AppsLauncher',
        appId
      );

      // Crea directory se non esiste
      if (!fs.existsSync(extractPath)) {
        fs.mkdirSync(extractPath, { recursive: true });
      }

      console.log(`[InstallManager] Extracting ${zipPath} to ${extractPath}...`);

      // Estrai ZIP
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);

      console.log(`[InstallManager] ZIP extracted successfully for ${appId}`);

      if (statusCallback) {
        statusCallback({
          appId,
          status: 'searching',
          message: 'Ricerca eseguibile...',
        });
      }

      // Cerca eseguibile nell'archivio estratto
      const executablePath = await this.findInstalledExecutableWithPolling(
        appId,
        extractPath,
        options.appName,
        5, // max attempts
        500, // 0.5 second between attempts
        options.githubUrl // GitHub URL per estrarre nome repo
      );

      console.log(`[InstallManager] Executable found: ${executablePath}`);

      return {
        installPath: extractPath,
        executablePath,
      };
    } catch (error) {
      console.error(`[InstallManager] ZIP extraction failed for ${appId}:`, error);
      throw new Error(`Estrazione ZIP fallita: ${error.message}`);
    }
  }

  /**
   * Estrae il nome del repository da un URL GitHub
   * @param {string} githubUrl - URL GitHub (es. https://github.com/user/repo/releases)
   * @returns {string|null} Nome repo (es. "repo") o null se non valido
   */
  extractRepoNameFromUrl(githubUrl) {
    if (!githubUrl) return null;

    try {
      // Pattern: https://github.com/{user}/{repo}/releases o /releases/latest
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match && match[2]) {
        const repoName = match[2].replace(/\.(git)?$/, ''); // Rimuovi .git se presente
        console.log(`[InstallManager] Extracted repo name "${repoName}" from URL: ${githubUrl}`);
        return repoName;
      }
    } catch (error) {
      console.warn(`[InstallManager] Failed to extract repo name from URL:`, error.message);
    }

    return null;
  }

  /**
   * Sanitizza il nome di una cartella rimuovendo caratteri non validi
   * @param {string} name - Nome da sanitizzare
   * @returns {string} Nome pulito
   */
  sanitizeFolderName(name) {
    // Rimuovi caratteri non validi per nomi di file Windows: < > : " / \ | ? *
    return name.replace(/[<>:"/\\|?*]/g, '').trim();
  }

  /**
   * Cerca app installata nel Windows Registry
   * @param {Array<string>} searchNames - Array di nomi da cercare (app name, repo name, etc.)
   * @returns {Promise<string|null>} Path all'eseguibile se trovato, null altrimenti
   */
  async findAppInRegistry(searchNames) {
    console.log(`[InstallManager] Searching in Windows Registry for:`, searchNames);

    // Registry paths da controllare
    const registryPaths = [
      'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall', // 32-bit on 64-bit
    ];

    for (const regPath of registryPaths) {
      try {
        // PowerShell command per leggere tutte le subkeys
        const psCommand = `Get-ChildItem -Path "${regPath}" -ErrorAction SilentlyContinue | ForEach-Object {
          $props = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
          if ($props.DisplayName -or $props.InstallLocation) {
            [PSCustomObject]@{
              Name = $_.PSChildName
              DisplayName = $props.DisplayName
              InstallLocation = $props.InstallLocation
              DisplayIcon = $props.DisplayIcon
            }
          }
        } | ConvertTo-Json`;

        const { stdout } = await new Promise((resolve, reject) => {
          const proc = spawn('powershell', ['-NoProfile', '-Command', psCommand], {
            windowsHide: true,
          });

          let output = '';
          proc.stdout.on('data', (data) => (output += data.toString()));
          proc.on('close', (code) => {
            if (code === 0) resolve({ stdout: output });
            else reject(new Error(`PowerShell exited with code ${code}`));
          });
          proc.on('error', reject);
        });

        if (!stdout.trim()) continue;

        // Parse JSON output
        const apps = JSON.parse(stdout);
        const appList = Array.isArray(apps) ? apps : [apps];

        // Cerca match tra i nomi forniti
        for (const app of appList) {
          if (!app.DisplayName) continue;

          // Check se il DisplayName contiene uno dei search names
          const displayName = app.DisplayName.toLowerCase();
          const matchingName = searchNames.find(name =>
            displayName.includes(name.toLowerCase()) || name.toLowerCase().includes(displayName)
          );

          if (matchingName) {
            console.log(`[InstallManager] Found registry entry: ${app.DisplayName} (matched "${matchingName}")`);

            // Prova a estrarre path eseguibile
            let exePath = null;

            // 1. Da DisplayIcon (spesso punta all'exe)
            if (app.DisplayIcon && app.DisplayIcon.toLowerCase().endsWith('.exe')) {
              // Rimuovi eventuali parametri dopo l'exe
              exePath = app.DisplayIcon.split(',')[0].replace(/"/g, '');
              if (fs.existsSync(exePath)) {
                console.log(`[InstallManager] ✓ Found executable from DisplayIcon: ${exePath}`);
                return exePath;
              }
            }

            // 2. Da InstallLocation
            if (app.InstallLocation && fs.existsSync(app.InstallLocation)) {
              console.log(`[InstallManager] Found InstallLocation: ${app.InstallLocation}`);
              // Cerca file .exe nella directory
              const files = fs.readdirSync(app.InstallLocation);
              const exeFile = files.find(f => f.toLowerCase().endsWith('.exe'));
              if (exeFile) {
                exePath = path.join(app.InstallLocation, exeFile);
                console.log(`[InstallManager] ✓ Found executable in InstallLocation: ${exePath}`);
                return exePath;
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[InstallManager] Failed to search ${regPath}:`, error.message);
      }
    }

    console.log(`[InstallManager] No match found in Windows Registry`);
    return null;
  }

  /**
   * Cerca ricorsivamente file .exe in una directory
   * @param {string} dir - Directory da cercare
   * @param {number} maxDepth - Profondità massima (default 3)
   * @param {number} currentDepth - Profondità corrente
   * @returns {Array<string>} Array di path ai file .exe trovati
   */
  findExecutablesRecursive(dir, maxDepth = 3, currentDepth = 0) {
    const results = [];

    if (!fs.existsSync(dir) || currentDepth > maxDepth) {
      return results;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Ricorsione nelle subdirectory
          const subResults = this.findExecutablesRecursive(fullPath, maxDepth, currentDepth + 1);
          results.push(...subResults);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
          // File .exe trovato
          results.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`[InstallManager] Cannot read directory ${dir}:`, error.message);
    }

    return results;
  }

  /**
   * Cerca eseguibile installato
   * @param {string} appId - ID app
   * @param {string} installDir - Directory installazione
   * @param {string} appName - Nome app
   * @param {string} githubUrl - URL GitHub per estrarre nome repo (opzionale)
   * @returns {Promise<string>} Path all'eseguibile
   */
  async findInstalledExecutable(appId, installDir, appName, githubUrl = null) {
    console.log(`[InstallManager] Searching for executable: appId=${appId}, installDir=${installDir}, appName=${appName}, githubUrl=${githubUrl}`);

    // Estrai nome repo da GitHub URL (se disponibile)
    const repoName = this.extractRepoNameFromUrl(githubUrl);

    // Crea array di nomi da cercare (elimina duplicati e null)
    const searchNames = [...new Set([appName, repoName, appId].filter(Boolean))];
    console.log(`[InstallManager] Search names:`, searchNames);

    // FASE 0: Cerca nel Windows Registry (più accurato e veloce)
    console.log(`[InstallManager] PHASE 0: Searching in Windows Registry...`);
    try {
      const registryPath = await this.findAppInRegistry(searchNames);
      if (registryPath) {
        console.log(`[InstallManager] ✓ Found executable in Registry: ${registryPath}`);
        return registryPath;
      }
    } catch (error) {
      console.warn(`[InstallManager] Registry search failed:`, error.message);
    }

    // FASE 1: Ricerca non-ricorsiva (veloce) nelle directory comuni
    console.log(`[InstallManager] PHASE 1: Non-recursive filesystem search...`);

    // Genera search paths usando TUTTI i nomi disponibili (appName, repoName, appId)
    // Questo permette di trovare app anche quando NSIS usa il nome del repo invece del display name
    const searchPaths = [];

    for (const name of searchNames) {
      searchPaths.push(
        path.join(installDir, name),
        path.join('C:', 'Program Files', name),
        path.join('C:', 'Program Files (x86)', name),
        path.join(process.env.LOCALAPPDATA || '', name),
        path.join(process.env.APPDATA || '', name),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', name)
      );
    }

    // Aggiungi anche la base installDir
    searchPaths.push(installDir);

    // Rimuovi duplicati
    const uniqueSearchPaths = [...new Set(searchPaths)];

    // FASE 1: Ricerca non-ricorsiva (veloce) nelle directory comuni
    for (const searchPath of uniqueSearchPaths) {
      if (fs.existsSync(searchPath)) {
        console.log(`[InstallManager] Checking directory: ${searchPath}`);
        const files = fs.readdirSync(searchPath);

        // Trova tutti i file .exe
        const exeFiles = files.filter((f) => f.toLowerCase().endsWith('.exe'));

        if (exeFiles.length === 0) continue; // Nessun exe in questa directory

        // PRIORITÀ 1: Cerca exe che corrisponde al nome dell'app (es: "obsidian.exe" per "Obsidian")
        const appNameNormalized = appName.toLowerCase().replace(/\s+/g, ''); // Rimuovi spazi
        let exeFile = exeFiles.find(f => {
          const fileNameNormalized = f.toLowerCase().replace(/\s+/g, '').replace('.exe', '');
          return fileNameNormalized === appNameNormalized || fileNameNormalized.includes(appNameNormalized);
        });

        // PRIORITÀ 2: Se non trovato, cerca exe che NON sono installer/uninstaller
        if (!exeFile) {
          exeFile = exeFiles.find(f => {
            const lower = f.toLowerCase();
            return !lower.includes('setup') &&
                   !lower.includes('install') &&
                   !lower.includes('unins') &&
                   !lower.includes('updater') &&
                   !lower.includes('launcher');
          });
        }

        // PRIORITÀ 3: Fallback al primo exe disponibile (se nessun filtro ha trovato nulla)
        if (!exeFile && exeFiles.length > 0) {
          exeFile = exeFiles[0];
          console.warn(`[InstallManager] No ideal executable found, using fallback: ${exeFile}`);
        }

        if (exeFile) {
          const exePath = path.join(searchPath, exeFile);
          console.log(`[InstallManager] ✓ Found executable (non-recursive): ${exePath}`);
          return exePath;
        }
      }
    }

    // FASE 2: Ricerca ricorsiva (più lenta) nelle directory più probabili
    console.log(`[InstallManager] Non-recursive search failed, trying recursive search...`);

    // Genera recursive search paths usando TUTTI i nomi disponibili
    const recursiveSearchPaths = [installDir];

    for (const name of searchNames) {
      recursiveSearchPaths.push(
        path.join('C:', 'Program Files', name),
        path.join('C:', 'Program Files (x86)', name),
        path.join(process.env.LOCALAPPDATA || '', name),
        path.join(process.env.APPDATA || '', name)
      );
    }

    // Rimuovi duplicati
    const uniqueRecursiveSearchPaths = [...new Set(recursiveSearchPaths)];

    for (const searchPath of uniqueRecursiveSearchPaths) {
      if (fs.existsSync(searchPath)) {
        console.log(`[InstallManager] Searching recursively in: ${searchPath}`);
        const executables = this.findExecutablesRecursive(searchPath, 3);

        if (executables.length > 0) {
          console.log(`[InstallManager] ✓ Found ${executables.length} executable(s) recursively:`, executables);
          // Ritorna il primo eseguibile trovato
          return executables[0];
        }
      }
    }

    // FASE 3: Logging dettagliato se nulla è stato trovato
    console.error(`[InstallManager] ✗ Executable NOT FOUND after exhaustive search`);
    console.error(`[InstallManager] Search details:`);
    console.error(`  - appId: ${appId}`);
    console.error(`  - appName: ${appName}`);
    console.error(`  - installDir: ${installDir}`);
    console.error(`[InstallManager] Directory contents for debugging:`);

    for (const searchPath of uniqueSearchPaths) {
      if (fs.existsSync(searchPath)) {
        try {
          const files = fs.readdirSync(searchPath);
          console.error(`  - ${searchPath}: [${files.join(', ')}]`);
        } catch (err) {
          console.error(`  - ${searchPath}: ERROR - ${err.message}`);
        }
      } else {
        console.error(`  - ${searchPath}: DOES NOT EXIST`);
      }
    }

    throw new Error('Executable not found after installation');
  }

  /**
   * Cerca eseguibile installato con polling (retry)
   * @param {string} appId - ID app
   * @param {string} installDir - Directory installazione
   * @param {string} appName - Nome app
   * @param {number} maxAttempts - Numero massimo di tentativi
   * @param {number} delayMs - Delay tra tentativi in millisecondi
   * @param {string} githubUrl - URL GitHub per estrarre nome repo (opzionale)
   * @returns {Promise<string>} Path all'eseguibile
   */
  async findInstalledExecutableWithPolling(appId, installDir, appName, maxAttempts = 10, delayMs = 1000, githubUrl = null) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[InstallManager] Attempt ${attempt}/${maxAttempts} to find executable for ${appId}...`);
        const executablePath = await this.findInstalledExecutable(appId, installDir, appName, githubUrl);
        console.log(`[InstallManager] Executable found on attempt ${attempt}: ${executablePath}`);
        return executablePath;
      } catch (error) {
        if (attempt < maxAttempts) {
          console.log(`[InstallManager] Executable not found yet, waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.error(`[InstallManager] Failed to find executable after ${maxAttempts} attempts`);
          throw error;
        }
      }
    }
  }

  /**
   * Disinstalla applicazione
   * @param {string} appId - ID dell'app
   * @param {Function} statusCallback - Callback status
   * @returns {Promise<void>}
   */
  async uninstallApp(appId, statusCallback) {
    const appInfo = appStore.getInstalledApp(appId);

    if (!appInfo) {
      throw new Error('App not installed');
    }

    try {
      if (statusCallback) {
        statusCallback({
          appId,
          status: 'uninstalling',
          message: 'Disinstallazione in corso...',
        });
      }

      // Cerca uninstaller nella directory dell'app
      const uninstallerPath = this.findUninstaller(appInfo.installPath);

      if (uninstallerPath) {
        await this.runUninstaller(uninstallerPath);
      } else {
        console.warn(`No uninstaller found for ${appId}, removing from database only`);
      }

      // Rimuovi dal database
      appStore.removeInstalledApp(appId);

      if (statusCallback) {
        statusCallback({
          appId,
          status: 'completed',
          message: 'Disinstallazione completata',
        });
      }
    } catch (error) {
      if (statusCallback) {
        statusCallback({
          appId,
          status: 'error',
          message: `Errore disinstallazione: ${error.message}`,
        });
      }

      throw error;
    }
  }

  /**
   * Cerca uninstaller
   * @param {string} installPath - Path installazione
   * @returns {string|null} Path uninstaller o null
   */
  findUninstaller(installPath) {
    if (!fs.existsSync(installPath)) return null;

    const uninstallerNames = ['uninstall.exe', 'unins000.exe', 'uninst.exe'];

    for (const name of uninstallerNames) {
      const uninstallerPath = path.join(installPath, name);
      if (fs.existsSync(uninstallerPath)) {
        return uninstallerPath;
      }
    }

    return null;
  }

  /**
   * Esegue uninstaller
   * @param {string} uninstallerPath - Path uninstaller
   * @returns {Promise<void>}
   */
  async runUninstaller(uninstallerPath) {
    return new Promise((resolve, reject) => {
      const uninstaller = spawn(uninstallerPath, ['/SILENT'], {
        stdio: 'ignore',
        shell: true,
        windowsHide: true,
      });

      uninstaller.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Uninstaller failed with code: ${code}`));
        }
      });

      uninstaller.on('error', (err) => {
        reject(new Error(`Failed to run uninstaller: ${err.message}`));
      });
    });
  }

  /**
   * Verifica se installazione è in corso
   * @param {string} appId - ID app
   * @returns {boolean}
   */
  isInstalling(appId) {
    return this.activeInstallations.has(appId);
  }
}

export default new InstallManager();
