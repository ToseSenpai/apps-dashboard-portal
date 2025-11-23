import githubService from './github-service.js';

/**
 * Version Cache Service
 * Gestisce la cache delle versioni GitHub per evitare troppe chiamate API
 */
class VersionCacheService {
  constructor() {
    // Cache in-memory: { appId: { version, fetchedAt, ttl } }
    this.cache = new Map();

    // TTL default: 5 minuti (300000 ms)
    this.defaultTTL = 300000;
  }

  /**
   * Ottiene la versione latest da GitHub (con cache)
   * @param {string} appId - ID dell'app
   * @param {string} githubUrl - URL GitHub releases
   * @param {string} fallbackVersion - Versione fallback da apps.json
   * @returns {Promise<string>} Versione latest
   */
  async getLatestVersion(appId, githubUrl, fallbackVersion) {
    // 1. Controlla cache
    const cached = this.cache.get(appId);
    const now = Date.now();

    if (cached && (now - cached.fetchedAt < cached.ttl)) {
      console.log(`[VersionCache] Using cached version for ${appId}: ${cached.version}`);
      return cached.version;
    }

    // 2. Cache expired o non esistente - fetch da GitHub
    try {
      console.log(`[VersionCache] Fetching latest version from GitHub for ${appId}...`);

      const releaseInfo = await githubService.getAppReleaseInfo(githubUrl);

      if (releaseInfo && releaseInfo.version) {
        // Salva in cache
        this.cache.set(appId, {
          version: releaseInfo.version,
          fetchedAt: now,
          ttl: this.defaultTTL,
        });

        console.log(`[VersionCache] Cached version for ${appId}: ${releaseInfo.version}`);
        return releaseInfo.version;
      }

      // GitHub response senza version - usa fallback
      console.warn(`[VersionCache] GitHub response missing version for ${appId}, using fallback`);
      return this.useFallback(appId, fallbackVersion, now);

    } catch (error) {
      console.warn(`[VersionCache] Failed to fetch version for ${appId}:`, error.message);

      // Se abbiamo cache vecchia, usala comunque
      if (cached) {
        console.log(`[VersionCache] Using expired cache for ${appId}: ${cached.version}`);
        return cached.version;
      }

      // Altrimenti usa fallback
      return this.useFallback(appId, fallbackVersion, now);
    }
  }

  /**
   * Usa versione fallback e la mette in cache temporanea
   * @param {string} appId
   * @param {string} fallbackVersion
   * @param {number} timestamp
   * @returns {string}
   */
  useFallback(appId, fallbackVersion, timestamp) {
    console.log(`[VersionCache] Using fallback version for ${appId}: ${fallbackVersion}`);

    // Metti fallback in cache per 1 minuto (retry più frequente)
    this.cache.set(appId, {
      version: fallbackVersion,
      fetchedAt: timestamp,
      ttl: 60000, // 1 minuto
    });

    return fallbackVersion;
  }

  /**
   * Ottiene una versione specifica dalla cache (senza fetch)
   * @param {string} appId
   * @returns {string|null}
   */
  getCachedVersion(appId) {
    const cached = this.cache.get(appId);
    return cached ? cached.version : null;
  }

  /**
   * Pulisce la cache (forza refresh)
   * @param {string} appId - Se specificato, pulisce solo per quell'app
   */
  clearCache(appId = null) {
    if (appId) {
      this.cache.delete(appId);
      console.log(`[VersionCache] Cleared cache for ${appId}`);
    } else {
      this.cache.clear();
      console.log('[VersionCache] Cleared all cache');
    }
  }

  /**
   * Ottiene statistiche cache (per debugging)
   * @returns {Object}
   */
  getCacheStats() {
    const now = Date.now();
    const stats = {
      totalEntries: this.cache.size,
      entries: [],
    };

    this.cache.forEach((value, key) => {
      const age = now - value.fetchedAt;
      const isExpired = age > value.ttl;

      stats.entries.push({
        appId: key,
        version: value.version,
        ageMs: age,
        ttlMs: value.ttl,
        expired: isExpired,
      });
    });

    return stats;
  }

  /**
   * Imposta TTL personalizzato per tutte le cache future
   * @param {number} ttlMs - TTL in millisecondi
   */
  setDefaultTTL(ttlMs) {
    this.defaultTTL = ttlMs;
    console.log(`[VersionCache] Default TTL set to ${ttlMs}ms`);
  }
}

// Export singleton instance
export default new VersionCacheService();
