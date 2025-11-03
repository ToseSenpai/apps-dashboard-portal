import PropTypes from 'prop-types';
import AppCard from '../AppCard';
import styles from './AppCardList.module.css';

/**
 * Componente lista di card applicativi con layout grid responsive
 * @param {Array} apps - Array di oggetti applicativi
 */
const AppCardList = ({ apps }) => {
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
      <ul className={styles.grid} role="list">
        {apps.map((app) => (
          <li key={app.id} className={styles.gridItem}>
            <AppCard app={app} />
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
};

export default AppCardList;
