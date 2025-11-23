import './SearchBar.css';

/**
 * SearchBar component - Steam-style search input
 */
function SearchBar({ value, onChange, placeholder = "Search your library..." }) {
  return (
    <div className="search-bar">
      <i className="fas fa-search search-bar__icon"></i>
      <input
        type="text"
        className="search-bar__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          className="search-bar__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
}

export default SearchBar;
