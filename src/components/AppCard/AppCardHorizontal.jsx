import { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { formatDate } from '../../utils/dateFormatter';
import { formatBytes, formatSpeed, calculateTimeRemaining } from '../../utils/formatters';
import './AppCardHorizontal.css';

/**
 * AppCardHorizontal - Steam-style horizontal app card
 */
function AppCardHorizontal({ app, downloadProgress, installStatus }) {
  // Local state per feedback visivo immediato
  const [localInstalling, setLocalInstalling] = useState(false);
  const [localUpdating, setLocalUpdating] = useState(false);
  const [localUninstalling, setLocalUninstalling] = useState(false);

  // Reset local state quando operazione completa
  useEffect(() => {
    if (app.installStatus === 'installed') {
      if (localInstalling) setLocalInstalling(false);
      if (localUpdating) setLocalUpdating(false);
    }
    if (app.installStatus === 'not_installed' && localUninstalling) {
      setLocalUninstalling(false);
    }
  }, [app.installStatus, localInstalling, localUpdating, localUninstalling]);

  // Determina lo stato dell'app
  const appState = useMemo(() => {
    const isInstalled = app.installStatus === 'installed';
    const hasUpdate = app.installedVersion && app.version !== app.installedVersion;
    const isDownloading = !!downloadProgress;
    const isInstalling = !!installStatus || localInstalling;
    const isUpdating = localUpdating;
    const isUninstalling = localUninstalling;

    return { isInstalled, hasUpdate, isDownloading, isInstalling, isUpdating, isUninstalling };
  }, [app, downloadProgress, installStatus, localInstalling, localUpdating, localUninstalling]);

  // Determina il pulsante primario
  const getPrimaryAction = () => {
    const { isInstalled, hasUpdate, isDownloading, isInstalling, isUpdating, isUninstalling } = appState;

    if (isDownloading) {
      return { label: `${downloadProgress.progress}%`, icon: 'fa-spinner fa-spin', disabled: true };
    }
    if (isInstalling) {
      return { label: 'Installing...', icon: 'fa-cog fa-spin', disabled: true };
    }
    if (isUpdating) {
      return { label: 'Updating...', icon: 'fa-sync fa-spin', disabled: true };
    }
    if (isUninstalling) {
      return { label: 'Uninstalling...', icon: 'fa-trash', disabled: true };
    }
    if (hasUpdate) {
      return { label: 'Update', icon: 'fa-download', action: 'update' };
    }
    if (isInstalled) {
      // Se installato ma exe non trovato, mostra pulsante per selezionarlo
      if (!app.executablePath) {
        return { label: 'Locate Exe', icon: 'fa-search', action: 'locate-exe' };
      }
      return { label: 'Play', icon: 'fa-play', action: 'launch' };
    }
    return { label: 'Install', icon: 'fa-download', action: 'install' };
  };

  const primaryAction = getPrimaryAction();

  // Handler azioni
  const handleAction = async (action) => {
    if (!window.electronAPI) return;

    try {
      if (action === 'install') {
        setLocalInstalling(true); // Feedback immediato
        await window.electronAPI.installApp(app.id);
      } else if (action === 'launch') {
        await window.electronAPI.launchApp(app.id);
      } else if (action === 'update') {
        setLocalUpdating(true); // Feedback immediato
        await window.electronAPI.updateApp(app.id);
      } else if (action === 'uninstall') {
        setLocalUninstalling(true); // Feedback immediato
        await window.electronAPI.uninstallApp(app.id);
      } else if (action === 'locate-exe') {
        await window.electronAPI.selectExecutable(app.id);
      }
    } catch (error) {
      console.error(`Failed to ${action} app:`, error);
      // Reset local state su errore
      setLocalInstalling(false);
      setLocalUpdating(false);
      setLocalUninstalling(false);
    }
  };

  const openChangelog = () => {
    if (app.changelogUrl && window.electronAPI) {
      // In Electron, apri in browser esterno
      window.open(app.changelogUrl, '_blank');
    }
  };

  return (
    <article className="app-card-h">
      {/* Cover Image */}
      <div
        className="app-card-h__cover"
        style={{
          background: app.coverImage ? `url(${app.coverImage})` : app.coverGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {!app.coverImage && (
          <div className="app-card-h__cover-icon">
            <i className={app.icon}></i>
          </div>
        )}
        {appState.isDownloading && (
          <>
            <div className="app-card-h__progress">
              <div
                className="app-card-h__progress-bar"
                style={{ width: `${downloadProgress.progress}%` }}
              ></div>
            </div>
            <div className="app-card-h__download-badge">
              <i className="fas fa-download"></i> Downloading
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="app-card-h__content">
        {/* Header Info */}
        <div className="app-card-h__header">
          <h3 className="app-card-h__title">{app.name}</h3>
          <div className="app-card-h__badges">
            {app.isRunning && (
              <span className="app-card-h__badge app-card-h__badge--running">
                <i className="fas fa-circle"></i> Running
              </span>
            )}
            {appState.isInstalled && (
              <span className="app-card-h__badge app-card-h__badge--installed">
                <i className="fas fa-check"></i> Installed
              </span>
            )}
            {appState.hasUpdate && (
              <span className="app-card-h__badge app-card-h__badge--update">
                <i className="fas fa-arrow-up"></i> Update Available
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="app-card-h__description">{app.description}</p>

        {/* Download Progress Details */}
        {appState.isDownloading && downloadProgress && (
          <div className="app-card-h__download-info">
            <div className="app-card-h__download-size">
              {formatBytes(downloadProgress.bytesReceived)} / {formatBytes(downloadProgress.bytesTotal)}
            </div>
            <div className="app-card-h__download-stats">
              <span className="app-card-h__download-speed">
                <i className="fas fa-tachometer-alt"></i> {formatSpeed(downloadProgress.speed)}
              </span>
              <span className="app-card-h__download-time">
                <i className="fas fa-clock"></i>{' '}
                {calculateTimeRemaining(
                  downloadProgress.bytesReceived,
                  downloadProgress.bytesTotal,
                  downloadProgress.speed
                )} remaining
              </span>
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="app-card-h__meta">
          <span className="app-card-h__meta-item">
            <i className="fas fa-code-branch"></i> v{app.version}
          </span>
          <span className="app-card-h__meta-item">
            <i className="fas fa-calendar"></i> {formatDate(app.lastUpdate)}
          </span>
          {app.developer && (
            <span className="app-card-h__meta-item">
              <i className="fas fa-user"></i> {app.developer}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="app-card-h__actions">
        {/* Primary Action */}
        <button
          className={`app-card-h__btn app-card-h__btn--primary ${primaryAction.disabled ? 'app-card-h__btn--disabled' : ''}`}
          onClick={() => !primaryAction.disabled && handleAction(primaryAction.action)}
          disabled={primaryAction.disabled}
        >
          <i className={`fas ${primaryAction.icon}`}></i>
          <span>{primaryAction.label}</span>
        </button>

        {/* Secondary Actions */}
        <div className="app-card-h__secondary">
          {appState.isInstalled && (
            <button
              className="app-card-h__btn app-card-h__btn--icon"
              onClick={() => handleAction('uninstall')}
              title="Uninstall"
            >
              <i className="fas fa-trash"></i>
            </button>
          )}
          <button
            className="app-card-h__btn app-card-h__btn--icon"
            onClick={openChangelog}
            title="View changelog"
          >
            <i className="fas fa-book"></i>
          </button>
        </div>
      </div>
    </article>
  );
}

AppCardHorizontal.propTypes = {
  app: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    coverImage: PropTypes.string,
    coverGradient: PropTypes.string,
    version: PropTypes.string.isRequired,
    lastUpdate: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    developer: PropTypes.string,
    installStatus: PropTypes.string,
    installedVersion: PropTypes.string,
    isRunning: PropTypes.bool,
    changelogUrl: PropTypes.string,
  }).isRequired,
  downloadProgress: PropTypes.shape({
    appId: PropTypes.string,
    progress: PropTypes.number,
  }),
  installStatus: PropTypes.shape({
    appId: PropTypes.string,
    status: PropTypes.string,
    message: PropTypes.string,
  }),
};

export default AppCardHorizontal;
