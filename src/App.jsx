import { useState, useEffect, useMemo } from 'react';
import { useAppsData } from './hooks/useAppsData';
import Sidebar from './components/Sidebar/Sidebar';
import TopNav from './components/TopNav/TopNav';
import FilterBar from './components/FilterBar/FilterBar';
import Loading from './components/Loading';
import ErrorMessage from './components/ErrorMessage';
import AppCardList from './components/AppCardList';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import './App.css';

/**
 * Componente principale dell'applicazione - Steam Style
 * Layout a due colonne: Sidebar + Main Content
 */
function App() {
  const { data, loading, error, refetch, downloadProgress, installStatus } = useAppsData();

  // State per UI
  const [activeSection, setActiveSection] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // State per startup loading
  const [isStartupLoading, setIsStartupLoading] = useState(true);
  const [startupMessage, setStartupMessage] = useState('Initializing...');

  // Calcola i conteggi per ogni filtro
  const appCounts = useMemo(() => {
    const counts = {
      all: data.length,
      installed: 0,
      updates: 0,
      'not-installed': 0,
    };

    data.forEach(app => {
      const isInstalled = app.installStatus === 'installed';
      const hasUpdate = isInstalled && app.installedVersion && app.version !== app.installedVersion;

      if (isInstalled) {
        counts.installed++;
      } else {
        counts['not-installed']++;
      }

      if (hasUpdate) {
        counts.updates++;
      }
    });

    return counts;
  }, [data]);

  // Filtra le app in base a ricerca e filtro
  const filteredApps = useMemo(() => {
    let apps = data;

    // Applica filtro per categoria
    if (activeFilter === 'installed') {
      apps = apps.filter(app => app.installStatus === 'installed');
    } else if (activeFilter === 'not-installed') {
      apps = apps.filter(app => app.installStatus !== 'installed');
    } else if (activeFilter === 'updates') {
      apps = apps.filter(app => {
        const isInstalled = app.installStatus === 'installed';
        const hasUpdate = isInstalled && app.installedVersion && app.version !== app.installedVersion;
        return hasUpdate;
      });
    }

    // Applica filtro ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      apps = apps.filter(app =>
        app.name.toLowerCase().includes(query) ||
        (app.description && app.description.toLowerCase().includes(query))
      );
    }

    return apps;
  }, [data, searchQuery, activeFilter]);

  // Setup event listeners per startup loading
  useEffect(() => {
    let startupProgressListener, startupCompleteListener;

    if (window.electronAPI) {
      // Listener per progress eventi startup
      startupProgressListener = window.electronAPI.onStartupProgress((data) => {
        console.log('[UI] Startup progress:', data);
        setStartupMessage(data.message);
      });

      // Listener per completamento startup
      startupCompleteListener = window.electronAPI.onStartupComplete(() => {
        console.log('[UI] Startup complete');
        // Delay per mostrare messaggio finale
        setTimeout(() => {
          setIsStartupLoading(false);
        }, 300);
      });
    } else {
      // Fallback per sviluppo web (senza Electron)
      setTimeout(() => {
        setIsStartupLoading(false);
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (startupProgressListener) startupProgressListener();
      if (startupCompleteListener) startupCompleteListener();
    };
  }, []);

  // Rileva se l'app è in iframe
  useEffect(() => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      document.body.classList.add('iframe-mode');
    }

    return () => {
      document.body.classList.remove('iframe-mode');
    };
  }, []);

  return (
    <>
      {/* Startup Loading Screen */}
      {isStartupLoading && <LoadingScreen message={startupMessage} />}

      {/* Main App */}
      <div className="app-container">
        {/* Sidebar Navigation */}
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

      {/* Main Content Area */}
      <div className="app-content">
        {/* Top Navigation */}
        <TopNav
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Filter Bar */}
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          appCounts={appCounts}
        />

        {/* Main Content */}
        <main className="app-main">
          {loading && <Loading />}
          {error && <ErrorMessage message={error} onRetry={refetch} />}
          {!loading && !error && (
            <>
              {filteredApps.length === 0 ? (
                <div className="app-empty-state">
                  <i className="fas fa-search app-empty-icon"></i>
                  <h3>No apps found</h3>
                  <p>Try searching for something else</p>
                </div>
              ) : (
                <AppCardList
                  apps={filteredApps}
                  downloadProgress={downloadProgress}
                  installStatus={installStatus}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
    </>
  );
}

export default App;
