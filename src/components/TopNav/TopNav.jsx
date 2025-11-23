import SearchBar from '../SearchBar/SearchBar';
import './TopNav.css';

/**
 * TopNav component - Steam-style top navigation bar
 */
function TopNav({ searchQuery, onSearchChange }) {
  return (
    <header className="top-nav">
      {/* Logo/Title Section */}
      <div className="top-nav__brand">
        <h1 className="top-nav__title">Library</h1>
      </div>

      {/* Search Bar */}
      <div className="top-nav__search">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search your library..."
        />
      </div>

      {/* User Actions */}
      <div className="top-nav__actions">
        <button className="top-nav__btn" title="View">
          <i className="fas fa-th"></i>
        </button>
        <button className="top-nav__btn" title="Settings">
          <i className="fas fa-cog"></i>
        </button>
        <button className="top-nav__btn top-nav__btn--user" title="User">
          <i className="fas fa-user"></i>
        </button>
      </div>
    </header>
  );
}

export default TopNav;
