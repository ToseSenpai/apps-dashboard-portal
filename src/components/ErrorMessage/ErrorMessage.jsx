import PropTypes from 'prop-types';
import styles from './ErrorMessage.module.css';

/**
 * Componente per visualizzare messaggi di errore
 * @param {string} message - Il messaggio di errore da mostrare
 * @param {function} onRetry - Callback per il pulsante di riprova (opzionale)
 */
const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className={styles.errorContainer} role="alert" aria-live="assertive">
      <div className={styles.errorIcon} aria-hidden="true">
        <i className="fas fa-exclamation-triangle"></i>
      </div>
      <h3 className={styles.errorTitle}>Si è verificato un errore</h3>
      <p className={styles.errorMessage}>{message}</p>
      {onRetry && (
        <button
          className={styles.retryButton}
          onClick={onRetry}
          aria-label="Riprova a caricare i dati"
        >
          <i className="fas fa-redo" aria-hidden="true"></i>
          Riprova
        </button>
      )}
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
};

export default ErrorMessage;
