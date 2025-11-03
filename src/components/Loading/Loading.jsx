import styles from './Loading.module.css';

/**
 * Componente Loading con spinner animato
 * Mostra uno stato di caricamento accessibile
 */
const Loading = () => {
  return (
    <div className={styles.loadingContainer} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true"></div>
      <p className={styles.loadingText}>Caricamento in corso...</p>
      <span className="sr-only">Caricamento dei dati degli applicativi in corso</span>
    </div>
  );
};

export default Loading;
