# Apps Dashboard Portal - Development Documentation

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Setup & Installation](#setup--installation)
- [Architecture](#architecture)
- [Features](#features)
- [Known Issues](#known-issues)
- [Development Workflow](#development-workflow)
- [File Structure](#file-structure)
- [API & Services](#api--services)

---

## 🎯 Project Overview

**Apps Dashboard Portal** is a Windows Electron application that functions as a centralized launcher and management system for GitHub-hosted applications. It provides a Steam-like interface for discovering, installing, updating, and launching desktop applications.

### Key Capabilities
- 🔍 **GitHub Integration** - Fetches latest releases and version info from GitHub repositories
- 📥 **Automatic Installation** - Downloads and silently installs NSIS-based applications
- 🚀 **App Launcher** - Launch installed applications directly from the dashboard
- 🔄 **Update Management** - Detects and installs updates for installed apps
- 🎨 **Windows 11 Design** - Modern, fluent UI matching Windows 11 design system
- 🔎 **Auto-Detection** - Scans Windows Registry to detect already-installed apps

---

## 🛠️ Setup & Installation

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Git**
- **GitHub Personal Access Token** (for API rate limiting)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ToseSenpai/apps-dashboard-portal.git
   cd apps-dashboard-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure GitHub Token**
   Create a `.env` file in the root directory:
   ```env
   GITHUB_TOKEN=your_github_personal_access_token_here
   ```

   > **Why?** Without a token, GitHub API limits you to 60 requests/hour. With a token, you get 5,000 requests/hour.

   **How to create a token:**
   1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   2. Generate new token (classic)
   3. Select scope: `public_repo` (for public repositories)
   4. Copy token and paste into `.env`

4. **Start development server**
   ```bash
   npm run dev
   ```

   The app will launch in development mode with DevTools open.

### Common Setup Issues

#### ELECTRON_RUN_AS_NODE Error

If you see this error:
```
TypeError: Cannot read properties of undefined (reading 'whenReady')
```

**Cause:** The `ELECTRON_RUN_AS_NODE` environment variable is set, causing Electron to run as Node.js instead of as an Electron app.

**Solution (PowerShell):**
```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm run dev
```

**Solution (Bash/Git Bash):**
```bash
unset ELECTRON_RUN_AS_NODE
npm run dev
```

**Permanent Fix:** Use the included `start-dev.bat` script:
```bash
./start-dev.bat
```

---

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 18 + JSX
- **Backend**: Electron (Main Process)
- **Build System**: electron-vite
- **Packaging**: electron-builder
- **State Management**: React Hooks (useState, useEffect)
- **Data Persistence**: electron-store (JSON-based database)
- **HTTP Client**: Native Node.js `https` module
- **Process Management**: Node.js `child_process`

### Process Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                         │
│  (electron/main/index.js)                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Services                                         │  │
│  │ - github-service.js     (GitHub API)            │  │
│  │ - download-manager.js   (File downloads)        │  │
│  │ - install-manager.js    (NSIS installations)    │  │
│  │ - launcher-service.js   (App launching)         │  │
│  │ - auto-detect-service.js (Registry scanning)    │  │
│  │ - update-checker.js     (Update detection)      │  │
│  │ - version-cache-service.js (API caching)        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ IPC Handlers (ipc/handlers.js)                  │  │
│  │ - app:get-all                                   │  │
│  │ - app:install / app:uninstall                   │  │
│  │ - app:launch / app:update                       │  │
│  │ - settings:get / settings:update                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Data Store (store/app-store.js)                 │  │
│  │ - Installed apps metadata                       │  │
│  │ - User settings                                 │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            │ IPC Communication
                            │ (contextBridge)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Renderer Process                        │
│  (src/App.jsx + React Components)                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ UI Components                                    │  │
│  │ - AppCardList (app grid)                        │  │
│  │ - AppCard (individual app cards)                │  │
│  │ - LoadingScreen (startup screen)                │  │
│  │ - Sidebar (navigation)                          │  │
│  │ - TopNav (header + system info)                 │  │
│  │ - FilterBar (search & filters)                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ State Management                                 │  │
│  │ - apps (app list with install status)           │  │
│  │ - loading states (per app)                      │  │
│  │ - filters (search, category)                    │  │
│  │ - startup loading (initial boot)                │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### IPC Communication Flow

```javascript
// Renderer → Main
window.electronAPI.getApps() → ipcMain.handle('app:get-all')

// Main → Renderer (events)
mainWindow.webContents.send('download:progress', data)
mainWindow.webContents.send('operation:complete', data)
```

---

## ✨ Features

### 1. Loading Screen & Startup Sequence

**Files:**
- `src/components/LoadingScreen/LoadingScreen.jsx`
- `electron/main/index.js` (performStartupSequence)

**Phases:**
1. **Initializing** - Setup IPC handlers and update checker
2. **Cleanup** - Remove old temporary files from previous downloads
3. **Detecting** - Auto-detect installed apps via Windows Registry
4. **Complete** - Ready to use

**Implementation:**
```javascript
// Main process sends progress events
mainWindow.webContents.send('startup:progress', {
  phase: 'detecting',
  message: 'Detecting installed apps...'
});

// Renderer listens and updates UI
window.electronAPI.onStartupProgress((data) => {
  setStartupMessage(data.message);
});
```

### 2. GitHub Integration

**File:** `electron/main/services/github-service.js`

**Features:**
- Parses GitHub release URLs
- Fetches latest release version
- Finds Windows installer (.exe) assets
- Authenticated requests with Personal Access Token
- Rate limit monitoring

**Example:**
```javascript
const releaseInfo = await githubService.getAppReleaseInfo(
  'https://github.com/ToseSenpai/controllo-stato-nsis-electron/releases'
);
// Returns: { version: '1.0.3', downloadUrl: 'https://...', assets: [...] }
```

### 3. Installation System

**File:** `electron/main/services/install-manager.js`

**Process:**
1. Download installer to temp directory
2. Run NSIS installer with `/S` (silent mode)
3. Search for installed executable in multiple locations:
   - Installation directory
   - Program Files / Program Files (x86)
   - LocalAppData / AppData
   - Using app name, GitHub repo name, and app ID
4. Validate executable exists
5. Save installation metadata to database

**Search Strategy:**
```javascript
// Searches using multiple name variations
const searchNames = [
  options.appName,      // "NOS Check"
  repoName,             // "controllo-stato-nsis-electron"
  appId                 // "app-003"
];

// Generates paths for each name
searchPaths = [
  'C:\\Program Files\\controllo-stato-nsis-electron',
  'C:\\Users\\user\\AppData\\Local\\Programs\\ControlloStatoNSIS',
  // ... many more combinations
];
```

### 4. App Launcher

**File:** `electron/main/services/launcher-service.js`

**Features:**
- Launch installed applications
- Clean environment variables for Electron app compatibility
- Track running processes
- Detached mode (apps continue after launcher closes)
- Suspicious executable detection (setup.exe, installer.exe)

**Environment Cleaning (Critical for Electron apps):**
```javascript
const cleanEnv = { ...process.env };
delete cleanEnv.ELECTRON_RUN_AS_NODE;
delete cleanEnv.ELECTRON_NO_ATTACH_CONSOLE;
delete cleanEnv.ELECTRON_NO_ASAR;

const child = spawn(executablePath, [], {
  cwd: workingDir,
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore'],
  shell: false,
  env: cleanEnv
});
```

### 5. Auto-Detection

**File:** `electron/main/services/auto-detect-service.js`

**How it works:**
1. Reads `apps.json` for app definitions
2. Extracts GitHub repo names from URLs
3. Queries Windows Registry uninstall keys:
   - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
   - `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`
4. Matches registry DisplayName against:
   - App display name
   - GitHub repository name
   - App ID
5. Finds executable in InstallLocation
6. Validates executable exists on filesystem
7. Registers in database if found

**Example Registry Query (PowerShell):**
```powershell
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" |
  Select-Object DisplayName, DisplayVersion, InstallLocation
```

### 6. Version Caching

**File:** `electron/main/services/version-cache-service.js`

**Purpose:** Reduce GitHub API calls by caching version info

**Strategy:**
- Cache TTL: 5 minutes
- Stores: `{ version, timestamp }`
- Falls back to apps.json if GitHub API fails

### 7. Update Detection

**File:** `electron/main/services/update-checker.js`

**Features:**
- Periodic update checks (configurable interval)
- Compares installed version vs GitHub latest
- Notifies renderer of available updates

---

## ⚠️ Known Issues

### 🔴 CRITICAL: Electron Apps Show Gray Screen

**Status:** ONGOING - Not yet resolved

**Problem:**
When launching an Electron-based app (like "NOS Check") from the launcher, it opens with a gray/blank screen. The same app works perfectly when launched from:
- Desktop shortcut
- Start menu
- Directly from install folder

**Evidence:**
- Console logs show correct executable path
- Working directory is set properly
- Process spawns successfully
- Window opens but shows gray screen with app title

**Root Cause (Theory):**
Child Electron apps are inheriting environment variables from the parent Electron launcher, causing them to run in Node.js mode instead of normal Electron app mode.

**Current Mitigation Attempts:**
```javascript
// Cleaning environment variables before spawn
delete cleanEnv.ELECTRON_RUN_AS_NODE;
delete cleanEnv.ELECTRON_NO_ATTACH_CONSOLE;
delete cleanEnv.ELECTRON_NO_ASAR;
```

**Status:** Still occurs despite cleaning. May require:
- Additional environment variables to clean
- Different spawn method (exec vs spawn)
- Wrapper script to isolate environment
- Launching via cmd.exe or explorer.exe

**User Impact:** High - Users cannot launch Electron apps from the dashboard

---

## 🔧 Development Workflow

### Adding a New App to the Dashboard

1. **Edit `public/apps.json`**
   ```json
   {
     "id": "app-004",
     "name": "My App",
     "description": "App description",
     "category": "Utilities",
     "version": "1.0.0",
     "downloadUrl": "https://github.com/user/repo/releases",
     "changelogUrl": "https://github.com/user/repo/releases",
     "tags": ["tool", "utility"]
   }
   ```

2. **Restart app** - Auto-detected on next launch

3. **Install via UI** - Click "Install" button

### Running in Development

```bash
# Start dev server (React + Electron)
npm run dev

# Build for production
npm run build

# Package as Windows installer
npm run build:win
```

### Debugging

**Enable DevTools in Production:**

Edit `electron/main/index.js` line 43:
```javascript
mainWindow.webContents.openDevTools(); // Uncomment this line
```

**View Main Process Logs:**
Console output from terminal where `npm run dev` was run.

**View Renderer Process Logs:**
Press F12 in the app window to open DevTools.

**Common Debug Patterns:**
```javascript
// Check if app is installed
console.log('[Debug] Installed apps:', appStore.getAllInstalledApps());

// Check running processes
console.log('[Debug] Running apps:', launcherService.getRunningApps());

// Verify GitHub token
console.log('[Debug] Token loaded:', process.env.GITHUB_TOKEN?.substring(0, 8));
```

### Testing Scenarios

#### Test 1: Fresh Installation
1. Uninstall app from Windows Settings
2. Delete from `apps-dashboard-portal\data\apps-database.json`
3. Click "Install" in dashboard
4. Verify auto-detection finds correct executable

#### Test 2: Manual Executable Selection
1. Install app but delete `executablePath` from database
2. Click "Launch" - should show "Locate EXE" dialog
3. Select correct .exe file
4. Verify launch works

#### Test 3: Auto-Detection
1. Install app manually (not via dashboard)
2. Restart dashboard
3. Verify auto-detection finds app during startup

#### Test 4: Update Detection
1. Have app installed with older version
2. Wait for update check (or trigger manually)
3. Verify "Update" button appears
4. Click "Update" and verify it reinstalls latest version

---

## 📁 File Structure

```
apps-dashboard-portal/
├── electron/
│   ├── main/
│   │   ├── index.js                    # Main process entry point
│   │   ├── ipc/
│   │   │   └── handlers.js             # IPC request handlers
│   │   ├── services/
│   │   │   ├── github-service.js       # GitHub API integration
│   │   │   ├── download-manager.js     # File download logic
│   │   │   ├── install-manager.js      # Installation orchestration
│   │   │   ├── launcher-service.js     # App launching
│   │   │   ├── auto-detect-service.js  # Registry scanning
│   │   │   ├── update-checker.js       # Update detection
│   │   │   └── version-cache-service.js # API caching
│   │   └── store/
│   │       └── app-store.js            # Data persistence layer
│   └── preload/
│       └── index.mjs                   # Preload script (contextBridge)
│
├── src/
│   ├── App.jsx                         # Main React component
│   ├── components/
│   │   ├── AppCard/
│   │   │   ├── AppCard.jsx             # App card component
│   │   │   └── AppCard.module.css
│   │   ├── AppCardList/
│   │   │   ├── AppCardList.jsx         # App grid component
│   │   │   └── AppCardList.module.css
│   │   ├── LoadingScreen/
│   │   │   ├── LoadingScreen.jsx       # Startup loading screen
│   │   │   └── LoadingScreen.module.css
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.jsx             # Navigation sidebar
│   │   │   └── Sidebar.css
│   │   ├── TopNav/
│   │   │   ├── TopNav.jsx              # Top navigation bar
│   │   │   └── TopNav.css
│   │   └── FilterBar/
│   │       ├── FilterBar.jsx           # Search and filters
│   │       └── FilterBar.css
│   └── utils/
│       └── formatters.js               # Utility functions
│
├── public/
│   ├── apps.json                       # App definitions (source of truth)
│   └── vite.svg                        # App icon
│
├── data/
│   ├── apps-database.json              # Installed apps metadata (auto-generated)
│   └── settings.json                   # User settings (auto-generated)
│
├── temp/                                # Download cache (auto-generated)
│   └── installers/
│
├── .env                                 # Environment variables (GITIGNORED)
├── .gitignore
├── package.json                         # Dependencies and scripts
├── electron.vite.config.mjs            # Build configuration
├── electron-builder.json               # Packaging configuration
├── DEVELOPMENT.md                      # This file
└── README.md                           # User-facing documentation
```

---

## 🔌 API & Services

### electronAPI (Preload Bridge)

**File:** `electron/preload/index.mjs`

**Available Methods:**
```javascript
// App Management
window.electronAPI.getApps()                    // Get all apps
window.electronAPI.installApp(appId)            // Install app
window.electronAPI.uninstallApp(appId)          // Uninstall app
window.electronAPI.launchApp(appId)             // Launch app
window.electronAPI.updateApp(appId)             // Update app
window.electronAPI.selectExecutable(appId)      // Manual EXE selection

// Settings
window.electronAPI.getSettings()                // Get settings
window.electronAPI.updateSettings(settings)     // Update settings
window.electronAPI.selectFolder()               // Folder picker

// Updates
window.electronAPI.checkForUpdates()            // Manual update check

// System Info
window.electronAPI.getSystemInfo()              // Platform, version, etc.

// Event Listeners
window.electronAPI.onDownloadProgress(callback)  // Download progress
window.electronAPI.onInstallStatus(callback)     // Install status
window.electronAPI.onOperationComplete(callback) // Operation complete
window.electronAPI.onStartupProgress(callback)   // Startup progress
window.electronAPI.onStartupComplete(callback)   // Startup complete
window.electronAPI.onAppsAutoDetected(callback)  // Auto-detection results
window.electronAPI.onUpdatesAvailable(callback)  // Updates found
```

### App Store Schema

**File:** `data/apps-database.json` (auto-generated)

```json
{
  "installedApps": {
    "app-003": {
      "installedVersion": "1.0.3",
      "installPath": "C:\\Users\\user\\AppData\\Local\\Programs\\ControlloStatoNSIS",
      "executablePath": "C:\\Users\\user\\AppData\\Local\\Programs\\ControlloStatoNSIS\\controllo-stato-nsis-electron.exe",
      "installedAt": "2025-01-23T10:30:00.000Z",
      "lastLaunched": "2025-01-23T14:20:00.000Z"
    }
  },
  "settings": {
    "installDirectory": "C:\\Program Files",
    "autoUpdate": true,
    "checkUpdateInterval": 3600000
  }
}
```

---

## 🚀 Next Steps

### Immediate Priorities
1. **Fix Electron app gray screen issue** (CRITICAL)
2. Implement desktop shortcut creation
3. Add uninstaller detection (auto-remove from database)
4. Improve error handling and user feedback

### Future Enhancements
- [ ] App categories and filtering
- [ ] Favorites/pinning system
- [ ] Launch count statistics
- [ ] Automatic update installation
- [ ] Multiple install locations support
- [ ] App screenshots and detailed info
- [ ] Search autocomplete
- [ ] Keyboard shortcuts
- [ ] Tray icon and minimized launching
- [ ] Portable app support (ZIP downloads)

---

## 📚 References

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-vite](https://electron-vite.org/)
- [electron-builder](https://www.electron.build/)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [GitHub REST API](https://docs.github.com/en/rest)
- [NSIS Documentation](https://nsis.sourceforge.io/Docs/)

---

**Last Updated:** 2025-01-23
**Version:** Development Snapshot
