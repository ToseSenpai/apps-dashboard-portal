import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import appStore from '../store/app-store.js';

/**
 * Launcher Service - Gestisce l'avvio delle applicazioni installate
 */
class LauncherService {
  constructor() {
    this.runningProcesses = new Map();
  }

  /**
   * Lancia un'applicazione installata
   * @param {string} appId - ID dell'app da lanciare
   * @returns {Promise<void>}
   */
  async launchApp(appId) {
    const appInfo = appStore.getInstalledApp(appId);

    if (!appInfo) {
      throw new Error('Application not installed');
    }

    if (!appInfo.executablePath) {
      throw new Error('Executable path not found. Please reinstall the application.');
    }

    // Verifica che l'eseguibile esista
    if (!fs.existsSync(appInfo.executablePath)) {
      throw new Error('Executable not found at the registered path');
    }

    // Verifica se già in esecuzione
    if (this.isAppRunning(appId)) {
      throw new Error('Application is already running');
    }

    try {
      // Avvia processo
      const workingDir = path.dirname(appInfo.executablePath);
      const exeFileName = path.basename(appInfo.executablePath);

      // DEBUG: Log dettagliato per diagnosi
      console.log('═══════════════════════════════════════════════════');
      console.log(`[Launch] Starting app: ${appId}`);
      console.log(`[Launch] Executable path: ${appInfo.executablePath}`);
      console.log(`[Launch] Executable filename: ${exeFileName}`);
      console.log(`[Launch] Working directory: ${workingDir}`);
      console.log(`[Launch] Installed version: ${appInfo.installedVersion}`);
      console.log(`[Launch] Install path: ${appInfo.installPath}`);

      // Verifica se è un installer (potrebbero contenere "setup", "install", "installer" nel nome)
      const suspiciousPatterns = ['setup', 'install', 'installer', 'unins'];
      const isSuspicious = suspiciousPatterns.some(pattern =>
        exeFileName.toLowerCase().includes(pattern)
      );

      if (isSuspicious) {
        console.warn(`[Launch] ⚠️ WARNING: Executable filename contains suspicious pattern: ${exeFileName}`);
        console.warn(`[Launch] This might be an installer instead of the actual application!`);
      }
      console.log('═══════════════════════════════════════════════════');

      // Prepara ambiente pulito per app Electron
      // Rimuove variabili che potrebbero interferire con altre app Electron
      const cleanEnv = { ...process.env };
      delete cleanEnv.ELECTRON_RUN_AS_NODE;
      delete cleanEnv.ELECTRON_NO_ATTACH_CONSOLE;
      delete cleanEnv.ELECTRON_NO_ASAR;

      console.log(`[Launch] Cleaned environment variables for Electron app compatibility`);

      // Lancia direttamente senza shell (come un double-click su Windows)
      const child = spawn(appInfo.executablePath, [], {
        cwd: workingDir,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'],  // Esplicito per evitare problemi di pipe
        shell: false,  // NO shell - lancia direttamente come un desktop shortcut
        windowsHide: false,  // Non nascondere la finestra dell'app
        env: cleanEnv,  // Usa ambiente pulito senza variabili Electron interferenti
      });

      // Salva riferimento processo
      this.runningProcesses.set(appId, {
        pid: child.pid,
        startTime: new Date().toISOString(),
        executablePath: appInfo.executablePath,
      });

      // Quando processo termina, rimuovi dal tracking
      child.on('exit', () => {
        this.runningProcesses.delete(appId);
      });

      child.on('error', (err) => {
        console.error(`Failed to launch ${appId}:`, err);
        this.runningProcesses.delete(appId);
      });

      // Detach processo per permettergli di continuare dopo chiusura launcher
      child.unref();

      // Aggiorna timestamp ultimo lancio
      appStore.updateLastLaunched(appId);

      console.log(`Launched ${appId} with PID ${child.pid}`);
    } catch (error) {
      throw new Error(`Failed to launch application: ${error.message}`);
    }
  }

  /**
   * Verifica se un'app è in esecuzione
   * @param {string} appId - ID dell'app
   * @returns {boolean}
   */
  isAppRunning(appId) {
    return this.runningProcesses.has(appId);
  }

  /**
   * Ottiene info sul processo in esecuzione
   * @param {string} appId - ID dell'app
   * @returns {Object|null} Info processo o null
   */
  getRunningProcess(appId) {
    return this.runningProcesses.get(appId) || null;
  }

  /**
   * Ottiene lista di tutte le app in esecuzione
   * @returns {Array<string>} Array di appId
   */
  getRunningApps() {
    return Array.from(this.runningProcesses.keys());
  }

  /**
   * Termina un'applicazione in esecuzione
   * @param {string} appId - ID dell'app
   * @returns {boolean} True se terminato, false se non in esecuzione
   */
  killApp(appId) {
    const processInfo = this.runningProcesses.get(appId);

    if (!processInfo) {
      return false;
    }

    try {
      // Prova a terminare il processo
      process.kill(processInfo.pid, 'SIGTERM');
      this.runningProcesses.delete(appId);
      return true;
    } catch (error) {
      console.error(`Failed to kill process ${processInfo.pid}:`, error);
      // Rimuovi comunque dal tracking
      this.runningProcesses.delete(appId);
      return false;
    }
  }

  /**
   * Verifica se un eseguibile esiste ed è valido
   * @param {string} executablePath - Path all'eseguibile
   * @returns {boolean}
   */
  validateExecutable(executablePath) {
    if (!executablePath) return false;

    try {
      const stats = fs.statSync(executablePath);
      return stats.isFile() && path.extname(executablePath).toLowerCase() === '.exe';
    } catch (error) {
      return false;
    }
  }

  /**
   * Apre la cartella dell'applicazione in Explorer
   * @param {string} appId - ID dell'app
   * @returns {Promise<void>}
   */
  async openAppFolder(appId) {
    const appInfo = appStore.getInstalledApp(appId);

    if (!appInfo || !appInfo.installPath) {
      throw new Error('Application install path not found');
    }

    if (!fs.existsSync(appInfo.installPath)) {
      throw new Error('Install folder no longer exists');
    }

    return new Promise((resolve, reject) => {
      spawn('explorer', [appInfo.installPath], {
        detached: true,
        stdio: 'ignore',
      }).unref();

      resolve();
    });
  }

  /**
   * Crea shortcut desktop per un'app (opzionale)
   * @param {string} appId - ID dell'app
   * @param {string} appName - Nome dell'app
   * @returns {Promise<void>}
   */
  async createDesktopShortcut(appId, appName) {
    // Nota: Richiede libreria esterna come 'windows-shortcuts'
    // Per semplicità, lasciamo come placeholder
    throw new Error('Desktop shortcut creation not yet implemented');
  }
}

export default new LauncherService();
