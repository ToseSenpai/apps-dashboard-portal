import { useState } from 'react';
import './Sidebar.css';

/**
 * Sidebar component - Steam-style navigation menu
 */
function Sidebar({ activeSection, onSectionChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'library', label: 'Library', icon: 'fas fa-th-large' },
    { id: 'store', label: 'Store', icon: 'fas fa-shopping-cart' },
    { id: 'community', label: 'Community', icon: 'fas fa-users' },
    { id: 'downloads', label: 'Downloads', icon: 'fas fa-download' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
      {/* App Logo/Title */}
      <div className="sidebar__header">
        <i className="fas fa-rocket sidebar__logo"></i>
        {!isCollapsed && <span className="sidebar__title">DHL Tools</span>}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar__nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__item ${activeSection === item.id ? 'sidebar__item--active' : ''}`}
            onClick={() => onSectionChange(item.id)}
            title={item.label}
          >
            <i className={`${item.icon} sidebar__item-icon`}></i>
            {!isCollapsed && <span className="sidebar__item-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        className="sidebar__toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <i className={`fas fa-angle-${isCollapsed ? 'right' : 'left'}`}></i>
      </button>
    </aside>
  );
}

export default Sidebar;
