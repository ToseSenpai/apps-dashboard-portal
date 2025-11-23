import PropTypes from 'prop-types';
import './FilterBar.css';

/**
 * FilterBar - Steam-style filter tabs
 */
function FilterBar({ activeFilter, onFilterChange, appCounts }) {
  const filters = [
    { id: 'all', label: 'All Games', icon: 'fas fa-th-large' },
    { id: 'installed', label: 'Installed', icon: 'fas fa-check-circle' },
    { id: 'updates', label: 'Updates', icon: 'fas fa-arrow-up' },
    { id: 'not-installed', label: 'Not Installed', icon: 'fas fa-download' },
  ];

  return (
    <div className="filter-bar">
      <div className="filter-bar__tabs">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`filter-bar__tab ${activeFilter === filter.id ? 'filter-bar__tab--active' : ''}`}
            onClick={() => onFilterChange(filter.id)}
          >
            <i className={filter.icon}></i>
            <span className="filter-bar__tab-label">{filter.label}</span>
            {appCounts[filter.id] !== undefined && (
              <span className="filter-bar__tab-count">{appCounts[filter.id]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

FilterBar.propTypes = {
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  appCounts: PropTypes.shape({
    all: PropTypes.number,
    installed: PropTypes.number,
    updates: PropTypes.number,
    'not-installed': PropTypes.number,
  }).isRequired,
};

export default FilterBar;
