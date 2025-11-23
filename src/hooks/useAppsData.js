import { useState, useEffect } from 'react';
import { ERROR_MESSAGES } from '../utils/constants';

/**
 * Custom hook per il fetch dei dati degli applicativi tramite Electron IPC
 * @returns {Object} { data, loading, error, refetch, downloadProgress, installStatus }
 */
export const useAppsData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [installStatus, setInstallStatus] = useState({});

  const fetchApps = async () => {
    setLoading(true);
    setError(null);

    try {
      // Usa Electron IPC invece di fetch HTTP
      if (window.electronAPI) {
        const result = await window.electronAPI.getApps();

        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to load apps');
        }
      } else {
        // Fallback per sviluppo web (senza Electron)
        console.warn('Electron API not available, using fallback');
        const response = await fetch('/apps.json');
        const jsonData = await response.json();
        setData(jsonData);
      }
    } catch (err) {
      console.error('Errore nel caricamento degli applicativi:', err);
      setError(err.message || ERROR_MESSAGES.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();

    // Setup event listeners per download e installazione
    let downloadListener, installListener, operationListener, autoDetectListener;

    if (window.electronAPI) {
      // Listener per progress download
      downloadListener = window.electronAPI.onDownloadProgress((progressData) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [progressData.appId]: progressData,
        }));
      });

      // Listener per status installazione
      installListener = window.electronAPI.onInstallStatus((statusData) => {
        setInstallStatus((prev) => ({
          ...prev,
          [statusData.appId]: statusData,
        }));
      });

      // Listener per completamento operazioni
      operationListener = window.electronAPI.onOperationComplete((data) => {
        // Ricarica lista app dopo operazione completata
        if (data.success) {
          fetchApps();
        }

        // Cleanup progress/status per questa app
        setDownloadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[data.appId];
          return newProgress;
        });

        setInstallStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[data.appId];
          return newStatus;
        });
      });

      // Listener per app auto-rilevate
      autoDetectListener = window.electronAPI.onAppsAutoDetected((detectedApps) => {
        console.log('[UI] Apps auto-detected, refreshing list:', detectedApps);
        // Ricarica lista app per mostrare app rilevate
        fetchApps();
      });
    }

    // Cleanup function
    return () => {
      if (downloadListener) downloadListener();
      if (installListener) installListener();
      if (operationListener) operationListener();
      if (autoDetectListener) autoDetectListener();
    };
  }, []);

  // Funzione per ricaricare i dati
  const refetch = () => {
    fetchApps();
  };

  return {
    data,
    loading,
    error,
    refetch,
    downloadProgress,
    installStatus,
  };
};
