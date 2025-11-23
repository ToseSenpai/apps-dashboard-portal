import React from 'react';
import styles from './LoadingScreen.module.css';

/**
 * LoadingScreen - Splash screen di caricamento con stile Windows 11
 * Mostra logo, spinner e messaggi di stato durante il caricamento iniziale
 */
const LoadingScreen = ({ message = 'Loading...', progress = null }) => {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.content}>
        {/* Logo/Icon */}
        <div className={styles.logoContainer}>
          <i className="fas fa-rocket"></i>
        </div>

        {/* App Title */}
        <h1 className={styles.title}>Apps Dashboard</h1>

        {/* Spinner */}
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
        </div>

        {/* Status Message */}
        <p className={styles.message}>{message}</p>

        {/* Progress Bar (optional) */}
        {progress !== null && (
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
