import https from 'https';

/**
 * Service per interagire con GitHub Releases API
 */
class GitHubService {
  constructor() {
    // Token opzionale per rate limiting aumentato (60 -> 5000 req/ora)
    this.token = process.env.GITHUB_TOKEN || null;

    if (this.token) {
      console.log(`[GitHub] Token loaded - Rate limit: 5,000 req/h (token: ${this.token.substring(0, 8)}...)`);
    } else {
      console.log('[GitHub] No token - Rate limit: 60 req/h (unauthenticated)');
    }
  }

  /**
   * Estrae owner/repo da URL GitHub
   * @param {string} url - URL GitHub (es: https://github.com/user/repo/releases)
   * @returns {Object|null} {owner, repo} o null se invalido
   */
  parseGitHubUrl(url) {
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
      return null;
    } catch (error) {
      console.error('Error parsing GitHub URL:', error);
      return null;
    }
  }

  /**
   * Effettua chiamata HTTP all'API GitHub
   * @param {string} path - Path API (es: /repos/owner/repo/releases/latest)
   * @returns {Promise<Object>} Response JSON
   */
  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: path,
        method: 'GET',
        headers: {
          'User-Agent': 'Apps-Launcher',
          'Accept': 'application/vnd.github.v3+json',
        },
      };

      // Aggiungi auth se disponibile
      if (this.token) {
        options.headers['Authorization'] = `token ${this.token}`;
      }

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Failed to parse GitHub response: ${error.message}`));
            }
          } else if (res.statusCode === 404) {
            reject(new Error('GitHub repository or release not found'));
          } else if (res.statusCode === 403) {
            reject(new Error('GitHub API rate limit exceeded. Please try again later.'));
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`GitHub API request failed: ${error.message}`));
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('GitHub API request timeout'));
      });

      req.end();
    });
  }

  /**
   * Ottiene tutte le release di un repository
   * @param {string} owner - Owner del repo
   * @param {string} repo - Nome del repo
   * @param {number} perPage - Numero di release da ottenere (default: 10)
   * @returns {Promise<Array>} Array di release
   */
  async getReleases(owner, repo, perPage = 10) {
    try {
      const releases = await this.makeRequest(
        `/repos/${owner}/${repo}/releases?per_page=${perPage}`
      );
      return releases;
    } catch (error) {
      console.error(`Failed to fetch releases for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Ottiene l'ultima release di un repository
   * @param {string} owner - Owner del repo
   * @param {string} repo - Nome del repo
   * @returns {Promise<Object>} Oggetto release
   */
  async getLatestRelease(owner, repo) {
    try {
      const release = await this.makeRequest(
        `/repos/${owner}/${repo}/releases/latest`
      );
      return release;
    } catch (error) {
      console.error(`Failed to fetch latest release for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Ottiene una release specifica per tag
   * @param {string} owner - Owner del repo
   * @param {string} repo - Nome del repo
   * @param {string} tag - Tag della release
   * @returns {Promise<Object>} Oggetto release
   */
  async getReleaseByTag(owner, repo, tag) {
    try {
      const release = await this.makeRequest(
        `/repos/${owner}/${repo}/releases/tags/${tag}`
      );
      return release;
    } catch (error) {
      console.error(`Failed to fetch release ${tag} for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Filtra asset per piattaforma Windows
   * @param {Array} assets - Array di asset dalla release
   * @returns {Array} Asset Windows (.exe, .msi, .zip)
   */
  filterWindowsAssets(assets) {
    if (!Array.isArray(assets)) return [];

    return assets.filter((asset) => {
      const name = asset.name.toLowerCase();
      // Filtra per estensioni Windows comuni
      return (
        name.endsWith('.exe') ||
        name.endsWith('.msi') ||
        (name.endsWith('.zip') && name.includes('win'))
      );
    });
  }

  /**
   * Ottiene il miglior asset per Windows da una release
   * Priorità: .exe > .msi > .zip
   * @param {Array} assets - Array di asset
   * @returns {Object|null} Asset migliore o null
   */
  getBestWindowsAsset(assets) {
    const windowsAssets = this.filterWindowsAssets(assets);

    if (windowsAssets.length === 0) return null;

    // Priorità: installer .exe, poi .msi, poi .zip
    const exeAsset = windowsAssets.find((a) => a.name.toLowerCase().endsWith('.exe'));
    if (exeAsset) return exeAsset;

    const msiAsset = windowsAssets.find((a) => a.name.toLowerCase().endsWith('.msi'));
    if (msiAsset) return msiAsset;

    return windowsAssets[0]; // Fallback al primo disponibile
  }

  /**
   * Ottiene info complete per un'app da GitHub
   * @param {string} githubUrl - URL GitHub releases
   * @returns {Promise<Object>} {version, downloadUrl, assets, releaseInfo}
   */
  async getAppReleaseInfo(githubUrl) {
    try {
      const parsed = this.parseGitHubUrl(githubUrl);
      if (!parsed) {
        throw new Error('Invalid GitHub URL');
      }

      const { owner, repo } = parsed;
      const release = await this.getLatestRelease(owner, repo);

      const windowsAsset = this.getBestWindowsAsset(release.assets);

      return {
        version: release.tag_name.replace(/^v/, ''), // Rimuovi 'v' prefix se presente
        downloadUrl: windowsAsset ? windowsAsset.browser_download_url : null,
        assets: this.filterWindowsAssets(release.assets),
        releaseInfo: {
          name: release.name,
          body: release.body, // Note di rilascio
          publishedAt: release.published_at,
          htmlUrl: release.html_url,
        },
      };
    } catch (error) {
      console.error('Failed to get app release info:', error);
      throw error;
    }
  }

  /**
   * Compara versioni semantic (es: 1.2.3)
   * @param {string} version1 - Prima versione
   * @param {string} version2 - Seconda versione
   * @returns {number} -1 se v1 < v2, 0 se uguali, 1 se v1 > v2
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.replace(/^v/, '').split('.').map(Number);
    const v2Parts = version2.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }

    return 0;
  }
}

export default new GitHubService();
