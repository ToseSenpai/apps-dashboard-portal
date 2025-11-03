/**
 * Formatta una data in formato italiano leggibile
 * @param {string} dateString - Data in formato ISO (YYYY-MM-DD)
 * @returns {string} Data formattata (es: "15 gennaio 2025")
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Data non disponibile';

  try {
    const date = new Date(dateString);

    // Verifica se la data è valida
    if (isNaN(date.getTime())) {
      return dateString; // Fallback: ritorna stringa originale
    }

    // Formatta in italiano
    const formatter = new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return formatter.format(date);
  } catch (error) {
    console.error('Errore formattazione data:', error);
    return dateString;
  }
};

/**
 * Formatta una data in formato breve (es: "15/01/2025")
 * @param {string} dateString - Data in formato ISO (YYYY-MM-DD)
 * @returns {string} Data formattata in formato breve
 */
export const formatDateShort = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    const formatter = new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return formatter.format(date);
  } catch (error) {
    console.error('Errore formattazione data breve:', error);
    return dateString;
  }
};

/**
 * Calcola i giorni trascorsi da una data
 * @param {string} dateString - Data in formato ISO (YYYY-MM-DD)
 * @returns {number} Numero di giorni trascorsi
 */
export const daysAgo = (dateString) => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    const today = new Date();

    if (isNaN(date.getTime())) {
      return null;
    }

    const diffTime = Math.abs(today - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    console.error('Errore calcolo giorni:', error);
    return null;
  }
};
