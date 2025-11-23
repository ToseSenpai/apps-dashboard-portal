import https from 'https';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';

/**
 * Download Manager - Gestisce download con progress tracking
 */
class DownloadManager {
  constructor() {
    this.activeDownloads = new Map();
    this._tempDir = null;
  }

  /**
   * Getter per tempDir con lazy initialization
   */
  get tempDir() {
    if (!this._tempDir) {
      this._tempDir = path.join(app.getPath('temp'), 'apps-launcher-downloads');
      this.ensureTempDir();
    }
    return this._tempDir;
  }

  /**
   * Assicura che la directory temporanea esista
   */
  ensureTempDir() {
    if (!fs.existsSync(this._tempDir)) {
      fs.mkdirSync(this._tempDir, { recursive: true });
    }
  }

  /**
   * Genera nome file univoco per il download
   * @param {string} url - URL da scaricare
   * @returns {string} Path completo al file
   */
  generateTempFilePath(url) {
    const urlHash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    const fileName = path.basename(new URL(url).pathname);
    const uniqueFileName = `${urlHash}_${fileName}`;
    return path.join(this.tempDir, uniqueFileName);
  }

  /**
   * Scarica file da URL con progress tracking
   * @param {string} appId - ID dell'app
   * @param {string} url - URL da scaricare
   * @param {Function} progressCallback - Callback per progresso (appId, progress, bytesReceived, bytesTotal, speed)
   * @param {string} originalFileName - Nome file originale (usato per preservare estensione dopo redirect)
   * @returns {Promise<string>} Path al file scaricato
   */
  async downloadFile(appId, url, progressCallback, originalFileName = null) {
    // Usa originalFileName se fornito, altrimenti estrai dall'URL
    const fileName = originalFileName || path.basename(new URL(url).pathname);
    const urlHash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    const uniqueFileName = `${urlHash}_${fileName}`;
    const filePath = path.join(this.tempDir, uniqueFileName);

    console.log(`[DEBUG] Download for ${appId}:`, { url, filePath, originalFileName });

    // Controlla se già in download
    if (this.activeDownloads.has(appId)) {
      throw new Error('Download already in progress for this app');
    }

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      let receivedBytes = 0;
      let totalBytes = 0;
      let startTime = Date.now();
      let lastProgressTime = Date.now();

      const request = https.get(url, (response) => {
        // Gestisci redirect
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          file.close();
          fs.unlinkSync(filePath);
          // Preserva il nome file originale attraverso il redirect
          this.downloadFile(appId, redirectUrl, progressCallback, fileName)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filePath);
          reject(new Error(`Download failed with status: ${response.statusCode}`));
          return;
        }

        totalBytes = parseInt(response.headers['content-length'], 10);

        // Salva riferimento download attivo
        this.activeDownloads.set(appId, { request, filePath });

        response.on('data', (chunk) => {
          receivedBytes += chunk.length;

          // Emetti progresso ogni 200ms per evitare troppi eventi
          const now = Date.now();
          if (now - lastProgressTime >= 200) {
            const progress = totalBytes ? (receivedBytes / totalBytes) * 100 : 0;
            const elapsedSeconds = (now - startTime) / 1000;
            const speed = receivedBytes / elapsedSeconds; // bytes/sec

            if (progressCallback) {
              progressCallback({
                appId,
                progress: Math.round(progress * 100) / 100,
                bytesReceived: receivedBytes,
                bytesTotal: totalBytes,
                speed: Math.round(speed),
              });
            }

            lastProgressTime = now;
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            this.activeDownloads.delete(appId);

            // Progresso finale al 100%
            if (progressCallback) {
              progressCallback({
                appId,
                progress: 100,
                bytesReceived: totalBytes,
                bytesTotal: totalBytes,
                speed: 0,
              });
            }

            resolve(filePath);
          });
        });
      });

      request.on('error', (err) => {
        file.close();
        this.activeDownloads.delete(appId);

        // Rimuovi file parziale
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error('Failed to delete partial download:', e);
          }
        }

        reject(new Error(`Download failed: ${err.message}`));
      });

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Cancella download attivo
   * @param {string} appId - ID dell'app
   * @returns {boolean} True se cancellato, false se non trovato
   */
  cancelDownload(appId) {
    const download = this.activeDownloads.get(appId);
    if (!download) return false;

    const { request, filePath } = download;

    // Distruggi richiesta HTTP
    request.destroy();

    // Rimuovi file parziale
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete partial download:', e);
      }
    }

    this.activeDownloads.delete(appId);
    return true;
  }

  /**
   * Verifica se un download è attivo
   * @param {string} appId - ID dell'app
   * @returns {boolean}
   */
  isDownloadActive(appId) {
    return this.activeDownloads.has(appId);
  }

  /**
   * Ottiene lista download attivi
   * @returns {Array<string>} Array di appId
   */
  getActiveDownloads() {
    return Array.from(this.activeDownloads.keys());
  }

  /**
   * Pulisce file temporanei vecchi (più di 24 ore)
   */
  cleanupOldTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > oneDayMs) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up old temp file: ${file}`);
          } catch (e) {
            console.error(`Failed to delete temp file ${file}:`, e);
          }
        }
      });
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * Formatta byte in formato leggibile
   * @param {number} bytes - Numero di byte
   * @returns {string} Formato leggibile (es: "1.5 MB")
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Formatta velocità in formato leggibile
   * @param {number} bytesPerSecond - Bytes al secondo
   * @returns {string} Formato leggibile (es: "1.5 MB/s")
   */
  formatSpeed(bytesPerSecond) {
    return this.formatBytes(bytesPerSecond) + '/s';
  }
}

export default new DownloadManager();
