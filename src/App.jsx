import { useEffect } from 'react';
import { useAppsData } from './hooks/useAppsData';
import Loading from './components/Loading';
import ErrorMessage from './components/ErrorMessage';
import AppCardList from './components/AppCardList';
import { APP_TITLE, APP_SUBTITLE } from './utils/constants';
import './App.css';

/**
 * Componente principale dell'applicazione
 * Gestisce il fetch dei dati e il rendering condizionale
 */
function App() {
  const { data, loading, error, refetch } = useAppsData();

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
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">{APP_TITLE}</h1>
        <p className="app-subtitle">{APP_SUBTITLE}</p>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {loading && <Loading />}
        {error && <ErrorMessage message={error} onRetry={refetch} />}
        {!loading && !error && <AppCardList apps={data} />}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Dashboard Applicativi Aziendali - {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
