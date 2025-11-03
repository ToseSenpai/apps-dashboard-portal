# Portale Applicativi Dashboard

Dashboard web moderna e professionale per la gestione e il download di applicativi aziendali. Costruita con React + Vite e deployata automaticamente su GitHub Pages.

## Caratteristiche

- **Design Moderno**: Tema corporate ispirato a Microsoft 365 con colori blu/grigio professionali
- **Responsive**: Layout ottimizzato per desktop, tablet e mobile con CSS Grid
- **Card-Based UI**: Ogni applicativo ha una card dedicata con informazioni complete
- **Accessibile**: ARIA labels completi, navigazione keyboard-friendly, color contrast WCAG 2.1 AA
- **Configurabile**: File JSON facilmente modificabile per aggiornare i dati degli applicativi
- **Deploy Automatico**: GitHub Actions CI/CD per deploy automatico ad ogni push
- **Embedding Ready**: Ottimizzato per iframe SharePoint con rilevamento automatico del contesto

## Stack Tecnologico

- **Frontend**: React 18
- **Build Tool**: Vite 5
- **Styling**: CSS Modules + CSS Variables
- **Icons**: FontAwesome 6
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions

## Setup Locale

### Prerequisiti

- Node.js 18+ installato
- npm o yarn
- Git

### Installazione

1. **Clona il repository:**

```bash
git clone https://github.com/[TUO-USERNAME]/apps-dashboard-portal.git
cd apps-dashboard-portal
```

2. **Installa le dipendenze:**

```bash
npm install
```

3. **Avvia il server di sviluppo:**

```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:3000`

### Comandi Disponibili

```bash
npm run dev       # Avvia server di sviluppo
npm run build     # Crea build di produzione
npm run preview   # Anteprima build di produzione
```

## Configurazione Applicativi

Per aggiornare i dati degli applicativi, modifica il file `public/apps.json`:

```json
[
  {
    "id": "app-001",
    "name": "Nome Applicativo",
    "icon": "fas fa-briefcase",
    "version": "2.5.1",
    "lastUpdate": "2025-01-15",
    "downloadUrl": "https://example.com/download.zip",
    "changelogUrl": "https://example.com/changelog",
    "description": "Descrizione dell'applicativo..."
  }
]
```

### Campi del File JSON

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | string | Identificativo univoco (es: "app-001") |
| `name` | string | Nome dell'applicativo |
| `icon` | string | Classe FontAwesome (es: "fas fa-briefcase") |
| `version` | string | Versione corrente (es: "2.5.1") |
| `lastUpdate` | string | Data ultimo aggiornamento formato ISO (YYYY-MM-DD) |
| `downloadUrl` | string | URL completo per il download |
| `changelogUrl` | string | URL completo per le note di rilascio |
| `description` | string | Descrizione breve dell'applicativo |

### Icone FontAwesome

Puoi utilizzare qualsiasi icona da [FontAwesome Free](https://fontawesome.com/icons):

- `fas fa-briefcase` - Valigetta
- `fas fa-users` - Utenti
- `fas fa-chart-line` - Grafico
- `fas fa-cog` - Ingranaggio
- `fas fa-database` - Database

## Deploy su GitHub Pages

### Setup Iniziale

1. **Crea un nuovo repository su GitHub:**
   - Nome: `apps-dashboard-portal`
   - Visibilità: **Pubblico** (necessario per GitHub Pages gratuito)

2. **Aggiorna il base path in `vite.config.js`:**

Assicurati che il `base` corrisponda al nome del tuo repository:

```javascript
export default defineConfig({
  base: '/apps-dashboard-portal/', // Deve corrispondere al nome repo
})
```

3. **Push del codice su GitHub:**

```bash
git remote add origin https://github.com/[TUO-USERNAME]/apps-dashboard-portal.git
git branch -M main
git push -u origin main
```

### Configurazione GitHub Pages

1. Vai su **Settings** del repository
2. Nella sezione **Pages** (menu laterale)
3. Sotto **Source**, seleziona: **GitHub Actions**
4. Salva

### Configurazione Permissions

1. Vai su **Settings** → **Actions** → **General**
2. Scorri fino a **Workflow permissions**
3. Seleziona: **Read and write permissions**
4. Salva

### Deploy Automatico

Dopo il setup, ad ogni push sul branch `main`:

1. GitHub Actions esegue automaticamente il workflow
2. Il progetto viene buildato
3. Il deploy viene effettuato su GitHub Pages
4. L'app sarà disponibile su: `https://[TUO-USERNAME].github.io/apps-dashboard-portal/`

## Embedding in SharePoint

### Codice Iframe

Aggiungi questo codice in una Web Part di SharePoint:

```html
<iframe
  src="https://[TUO-USERNAME].github.io/apps-dashboard-portal/"
  width="100%"
  height="800px"
  frameborder="0"
  scrolling="auto"
  title="Dashboard Applicativi Aziendali"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  style="border: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
></iframe>
```

### Rilevamento Iframe

L'app rileva automaticamente se è in un iframe e applica ottimizzazioni:
- Header più compatto
- Padding ridotto
- Scrolling ottimizzato

## Customizzazione Tema

### Modificare i Colori

Modifica le CSS variables in `src/assets/styles/variables.css`:

```css
:root {
  --color-primary: #0078D4;        /* Blu principale */
  --color-primary-dark: #106EBE;   /* Blu scuro */
  --color-bg-primary: #FAFAFA;     /* Sfondo pagina */
}
```

## Troubleshooting

### Build Fallisce

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### GitHub Actions Fallisce

Verifiche:
1. Repository è pubblico?
2. GitHub Pages source è "GitHub Actions"?
3. Workflow permissions sono "Read and write"?
4. Il base path corrisponde al nome repository?

### Iframe Vuoto in SharePoint

Verifiche:
1. L'URL nell'iframe è corretto?
2. L'app è deployata su GitHub Pages?
3. Controlla la console browser per errori

## Licenza

MIT License

---

**Realizzato con React + Vite**
