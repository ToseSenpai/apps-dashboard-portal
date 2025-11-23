import { useState } from 'react';
import PropTypes from 'prop-types';
import { formatDate } from '../../utils/dateFormatter';
import { ARIA_LABELS } from '../../utils/constants';
import styles from './AppCard.module.css';

/**
 * Componente Card per singolo applicativo con funzionalità launcher
 * @param {Object} app - Oggetto contenente i dati dell'applicativo
 * @param {Object} downloadProgress - Dati progresso download
 * @param {Object} installStatus - Stato installazione
 */
const AppCard = ({ app, downloadProgress, installStatus }) => {
  const {
    id,
    name,
    icon,
    version,
    lastUpdate,
    changelogUrl,
    description,
    installStatus: appInstallStatus,
    installedVersion,
    isRunning,
  } = app;

  const [isProcessing, setIsProcessing] = useState(false);
  const formattedDate = formatDate(lastUpdate);

  // Handler per installazione
  const handleInstall = async () => {
    if (!window.electronAPI || isProcessing) return;

    setIsProcessing(true);
    try {
      await window.electronAPI.installApp(id);
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler per lancio app
  const handleLaunch = async () => {
    if (!window.electronAPI || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await window.electronAPI.launchApp(id);
      if (!result.success) {
        alert(`Errore: ${result.error}`);
      }
    } catch (error) {
      console.error('Launch failed:', error);
      alert('Impossibile avviare l\'applicazione');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler per aggiornamento
  const handleUpdate = async () => {
    if (!window.electronAPI || isProcessing) return;

    setIsProcessing(true);
    try {
      await window.electronAPI.updateApp(id);
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler per disinstallazione
  const handleUninstall = async () => {
    if (!window.electronAPI || isProcessing) return;

    const confirmed = confirm(`Vuoi davvero disinstallare ${name}?`);
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await window.electronAPI.uninstallApp(id);
    } catch (error) {
      console.error('Uninstall failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Determina se mostrare update disponibile
  const hasUpdate = appInstallStatus === 'installed' &&
                    installedVersion &&
                    version !== installedVersion;

  // Rendering progress bar
  const renderProgress = () => {
    if (downloadProgress) {
      return (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${downloadProgress.progress}%` }}
            />
          </div>
          <span className={styles.progressText}>
            Download: {Math.round(downloadProgress.progress)}%
          </span>
        </div>
      );
    }

    if (installStatus) {
      return (
        <div className={styles.statusContainer}>
          <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
          <span>{installStatus.message}</span>
        </div>
      );
    }

    return null;
  };

  // Rendering pulsanti azioni
  const renderActions = () => {
    // Durante operazioni, mostra solo progress
    if (downloadProgress || installStatus || isProcessing) {
      return renderProgress();
    }

    if (appInstallStatus === 'installed') {
      return (
        <>
          <div className={styles.actionRow}>
            <button
              className={`${styles.primaryButton} ${isRunning ? styles.disabledButton : ''}`}
              onClick={handleLaunch}
              disabled={isRunning}
              aria-label={`Avvia ${name}`}
            >
              <i className={isRunning ? "fas fa-circle" : "fas fa-play"} aria-hidden="true"></i>
              {isRunning ? 'In esecuzione' : 'Avvia'}
            </button>

            {hasUpdate && (
              <button
                className={styles.updateButton}
                onClick={handleUpdate}
                aria-label={`Aggiorna ${name}`}
              >
                <i className="fas fa-sync-alt" aria-hidden="true"></i>
                Aggiorna
              </button>
            )}
          </div>

          <div className={styles.actionRow}>
            <button
              className={styles.secondaryButton}
              onClick={handleUninstall}
              aria-label={`Disinstalla ${name}`}
            >
              <i className="fas fa-trash" aria-hidden="true"></i>
              Disinstalla
            </button>

            <a
              href={changelogUrl}
              className={styles.changelogLink}
              aria-label={`Note di rilascio per ${name}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-list-ul" aria-hidden="true"></i>
              Note
            </a>
          </div>
        </>
      );
    }

    // Non installata
    return (
      <div className={styles.actionRow}>
        <button
          className={styles.installButton}
          onClick={handleInstall}
          aria-label={`Installa ${name}`}
        >
          <i className="fas fa-download" aria-hidden="true"></i>
          Installa
        </button>

        <a
          href={changelogUrl}
          className={styles.changelogLink}
          aria-label={`Note di rilascio per ${name}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fas fa-list-ul" aria-hidden="true"></i>
          Note
        </a>
      </div>
    );
  };

  return (
    <article
      className={`${styles.card} ${appInstallStatus === 'installed' ? styles.installed : ''}`}
      role="article"
      aria-label={`${ARIA_LABELS.APP_CARD}: ${name}`}
    >
      {/* Header con icona, nome e badges */}
      <div className={styles.cardHeader}>
        <div className={styles.iconContainer} aria-hidden="true">
          <i className={icon}></i>
        </div>
        <div className={styles.headerContent}>
          <h3 className={styles.appName}>{name}</h3>
          <div className={styles.badges}>
            {appInstallStatus === 'installed' && (
              <span className={styles.badgeInstalled}>
                <i className="fas fa-check-circle" aria-hidden="true"></i>
                Installata
              </span>
            )}
            {isRunning && (
              <span className={styles.badgeRunning}>
                <i className="fas fa-circle" aria-hidden="true"></i>
                Attiva
              </span>
            )}
            {hasUpdate && (
              <span className={styles.badgeUpdate}>
                <i className="fas fa-arrow-up" aria-hidden="true"></i>
                Aggiornamento
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body con informazioni */}
      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>
            <i className="fas fa-tag" aria-hidden="true"></i>
            Versione:
          </span>
          <span className={styles.infoValue}>
            {version}
            {installedVersion && installedVersion !== version && (
              <span className={styles.installedVersionText}> (installata: v{installedVersion})</span>
            )}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>
            <i className="fas fa-calendar-alt" aria-hidden="true"></i>
            Aggiornamento:
          </span>
          <span className={styles.infoValue}>{formattedDate}</span>
        </div>

        <p className={styles.description}>{description}</p>
      </div>

      {/* Footer con azioni */}
      <div className={styles.cardFooter}>
        {renderActions()}
      </div>
    </article>
  );
};

AppCard.propTypes = {
  app: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    version: PropTypes.string.isRequired,
    lastUpdate: PropTypes.string.isRequired,
    downloadUrl: PropTypes.string,
    changelogUrl: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    installStatus: PropTypes.oneOf(['installed', 'not_installed']),
    installedVersion: PropTypes.string,
    isRunning: PropTypes.bool,
  }).isRequired,
  downloadProgress: PropTypes.shape({
    progress: PropTypes.number,
    bytesReceived: PropTypes.number,
    bytesTotal: PropTypes.number,
    speed: PropTypes.number,
  }),
  installStatus: PropTypes.shape({
    appId: PropTypes.string,
    status: PropTypes.string,
    message: PropTypes.string,
  }),
};

export default AppCard;
