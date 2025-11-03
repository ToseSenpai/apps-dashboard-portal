// Costanti applicazione

// URL del file di configurazione applicativi
// Usa import.meta.env.BASE_URL per supportare sia sviluppo che produzione
export const APPS_JSON_URL = `${import.meta.env.BASE_URL}apps.json`;

// Titolo applicazione
export const APP_TITLE = 'DHL Tools Portal';
export const APP_SUBTITLE = 'Strumenti professionali per operazioni DHL';

// Breakpoints responsive (in pixel)
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

// Messaggi di errore
export const ERROR_MESSAGES = {
  FETCH_FAILED: 'Impossibile caricare i dati degli applicativi. Riprova più tardi.',
  NETWORK_ERROR: 'Errore di connessione. Verifica la tua connessione internet.',
  PARSE_ERROR: 'Errore nel caricamento dei dati. Contatta il supporto tecnico.',
};

// Label ARIA per accessibilità
export const ARIA_LABELS = {
  DOWNLOAD_BUTTON: 'Scarica applicativo',
  CHANGELOG_LINK: 'Visualizza note di rilascio',
  APP_CARD: 'Scheda applicativo',
  MAIN_CONTAINER: 'Contenitore principale applicativi',
};
