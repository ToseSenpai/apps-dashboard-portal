import PropTypes from 'prop-types';
import { formatDate } from '../../utils/dateFormatter';
import { ARIA_LABELS } from '../../utils/constants';
import styles from './AppCard.module.css';

/**
 * Componente Card per singolo applicativo
 * @param {Object} app - Oggetto contenente i dati dell'applicativo
 */
const AppCard = ({ app }) => {
  const {
    id,
    name,
    icon,
    version,
    lastUpdate,
    downloadUrl,
    changelogUrl,
    description,
  } = app;

  const formattedDate = formatDate(lastUpdate);

  return (
    <article
      className={styles.card}
      role="article"
      aria-label={`${ARIA_LABELS.APP_CARD}: ${name}`}
    >
      {/* Header con icona e nome */}
      <div className={styles.cardHeader}>
        <div className={styles.iconContainer} aria-hidden="true">
          <i className={icon}></i>
        </div>
        <h3 className={styles.appName}>{name}</h3>
      </div>

      {/* Body con informazioni */}
      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>
            <i className="fas fa-tag" aria-hidden="true"></i>
            Versione:
          </span>
          <span className={styles.infoValue}>{version}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>
            <i className="fas fa-calendar-alt" aria-hidden="true"></i>
            Ultimo aggiornamento:
          </span>
          <span className={styles.infoValue}>{formattedDate}</span>
        </div>

        <p className={styles.description}>{description}</p>
      </div>

      {/* Footer con azioni */}
      <div className={styles.cardFooter}>
        <a
          href={downloadUrl}
          className={styles.downloadButton}
          download
          aria-label={`${ARIA_LABELS.DOWNLOAD_BUTTON} ${name}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fas fa-download" aria-hidden="true"></i>
          Scarica
        </a>

        <a
          href={changelogUrl}
          className={styles.changelogLink}
          aria-label={`${ARIA_LABELS.CHANGELOG_LINK} per ${name}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fas fa-list-ul" aria-hidden="true"></i>
          Note di rilascio
        </a>
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
    downloadUrl: PropTypes.string.isRequired,
    changelogUrl: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
};

export default AppCard;
