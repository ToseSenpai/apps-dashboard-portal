import { useState, useEffect } from 'react';
import { APPS_JSON_URL, ERROR_MESSAGES } from '../utils/constants';

/**
 * Custom hook per il fetch dei dati degli applicativi dal file JSON
 * @returns {Object} { data, loading, error, refetch }
 */
export const useAppsData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(APPS_JSON_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonData = await response.json();

      // Validazione base dei dati
      if (!Array.isArray(jsonData)) {
        throw new Error('Formato dati non valido: atteso un array');
      }

      setData(jsonData);
    } catch (err) {
      console.error('Errore nel caricamento degli applicativi:', err);

      // Determina il tipo di errore
      let errorMessage = ERROR_MESSAGES.FETCH_FAILED;

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
      } else if (err instanceof SyntaxError) {
        errorMessage = ERROR_MESSAGES.PARSE_ERROR;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();

    // Cleanup function
    return () => {
      setData([]);
      setError(null);
      setLoading(false);
    };
  }, []);

  // Funzione per ricaricare i dati
  const refetch = () => {
    fetchApps();
  };

  return { data, loading, error, refetch };
};
