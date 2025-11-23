import PropTypes from 'prop-types';
import AppCardHorizontal from '../AppCard/AppCardHorizontal';
import styles from './AppCardList.module.css';

/**
 * Componente lista di card applicativi con layout verticale Steam-style
 * @param {Array} apps - Array di oggetti applicativi
 * @param {Object} downloadProgress - Progress data per download in corso
 * @param {Object} installStatus - Status data per installazioni in corso
 */
const AppCardList = ({ apps, downloadProgress, installStatus }) => {
  if (!apps || apps.length === 0) {
    return (
      <div className={styles.emptyState}>
        <i className="fas fa-inbox" aria-hidden="true"></i>
        <p>Nessun applicativo disponibile al momento.</p>
      </div>
    );
  }

  return (
    <section
      className={styles.listContainer}
      aria-label="Lista applicativi aziendali"
    >
      <ul className={styles.list} role="list">
        {apps.map((app) => (
          <li key={app.id} className={styles.listItem}>
            <AppCardHorizontal
              app={app}
              downloadProgress={downloadProgress?.[app.id]}
              installStatus={installStatus?.[app.id]}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

AppCardList.propTypes = {
  apps: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      version: PropTypes.string.isRequired,
      lastUpdate: PropTypes.string.isRequired,
      downloadUrl: PropTypes.string.isRequired,
      changelogUrl: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    })
  ).isRequired,
  downloadProgress: PropTypes.object,
  installStatus: PropTypes.object,
};

export default AppCardList;
