const { app, BrowserWindow, globalShortcut, ipcMain, clipboard } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { screen } = require('electron');
const Store = require('electron-store');
const http = require('http');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { autoUpdater } = require('electron-updater');
const { exec } = require('child_process');
const fs = require('fs');
// Load environment variables
require('dotenv').config();

// Initialize the settings store
const store = new Store();

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Keep a global reference of the window objects
let mainWindow = null;
let overlayWindow = null;

// Track whether overlay is click‑through (start in View Mode)
let overlayIgnoreMouse = true;

// Keep track of the latest suggestions so we can resend them when overlay reopens
let lastSuggestions = [];

// React development server port
const REACT_DEV_PORT = 3002; // Changed from 3001
const REACT_DEV_HOST = '127.0.0.1'; // Use IPv4 address explicitly

// Function to check if BlackHole is installed
function checkBlackHoleInstalled() {
  return new Promise((resolve) => {
    exec('pkgutil --pkgs | grep com.existential.audio.BlackHole2ch', (error, stdout) => {
      resolve(!!stdout.trim());
    });
  });
}

// Function to install BlackHole
function installBlackHole() {
  return new Promise((resolve, reject) => {
    const pkgPath = isDev 
      ? path.join(__dirname, 'resources/BlackHole2ch.v0.6.1.pkg')
      : path.join(process.resourcesPath, 'BlackHole2ch.v0.6.1.pkg');
    
    console.log(`Installing BlackHole from: ${pkgPath}`);
    
    if (!fs.existsSync(pkgPath)) {
      console.error('BlackHole package not found at path:', pkgPath);
      return reject(new Error('BlackHole package not found'));
    }

    exec(`open "${pkgPath}"`, (error) => {
      if (error) {
        console.error('Error installing BlackHole:', error);
        reject(error);
      } else {
        console.log('BlackHole installation started');
        resolve();
      }
    });
  });
}

// Check if the React development server is ready
function checkReactDevServerReady(callback) {
  if (!isDev) {
    // In production, we don't need to wait
    return callback(true);
  }

  console.log(`Checking if React server is ready at http://${REACT_DEV_HOST}:${REACT_DEV_PORT}...`);
  const checkServer = () => {
    http.get(`http://${REACT_DEV_HOST}:${REACT_DEV_PORT}`, (res) => {
      if (res.statusCode === 200) {
        console.log('React server is ready!');
        callback(true);
      } else {
        console.log(`React server returned status ${res.statusCode}, retrying in 1s...`);
        setTimeout(checkServer, 1000);
      }
    }).on('error', (err) => {
      console.log(`Error connecting to React server: ${err.message}, retrying in 1s...`);
      setTimeout(checkServer, 1000);
    });
  };

  checkServer();
}

function createMainWindow() {
  console.log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      enableBlinkFeatures: 'MediaStream',
      // media: true  // Uncomment for Electron ≥29
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false // Don't show until loaded
  });

  // Load the app
  const loadApp = () => {
    const url = isDev
      ? `http://${REACT_DEV_HOST}:${REACT_DEV_PORT}`
      : `file://${path.join(__dirname, 'build/index.html')}`;
    
    console.log(`Loading app from: ${url}`);
    mainWindow.loadURL(url);
    
    mainWindow.once('ready-to-show', () => {
      console.log('Main window ready to show');
      mainWindow.show();
      mainWindow.focus();
      
      // Check for BlackHole and install if needed
      checkBlackHoleInstalled().then(installed => {
        console.log('BlackHole installed:', installed);
        if (!installed) {
          installBlackHole().catch(err => {
            console.error('Failed to install BlackHole:', err);
          });
        }
      });
      
      // Open DevTools automatically in development
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
      
      // Register global shortcuts after window is ready
      registerShortcuts();

      // Check for updates
      if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    });
    
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`Failed to load: ${errorDescription} (${errorCode})`);
      // Try to reload after a short delay
      setTimeout(() => {
        console.log('Attempting to reload...');
        mainWindow.loadURL(url);
      }, 2000);
    });
  };

  if (isDev) {
    checkReactDevServerReady(loadApp);
  } else {
    loadApp();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (overlayWindow) {
      overlayWindow.close();
    }
  });
}

function createOverlayWindow() {
  // Get screen dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create overlay window
  overlayWindow = new BrowserWindow({
    width: width,
    height: Math.round(height * 0.9),  // 90% of screen height instead of half
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,            // keep above normal windows
    visibleOnAllWorkspaces: true, // follow across Spaces
    skipTaskbar: true,
    movable: true,
    resizable: true,
    contentProtection: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      worldSafeExecuteJavaScript: true,
      spellcheck: false
    }
  });

  // Pin to *every* workspace & full-screen window, plus highest "screen-saver" level
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setAlwaysOnTop(true, 'floating');

  // Load the overlay URL
  const overlayUrl = isDev
    ? `http://${REACT_DEV_HOST}:${REACT_DEV_PORT}/#/overlay`
    : `file://${path.join(__dirname, '../build/index.html')}#/overlay`;
  
  console.log(`Loading overlay URL: ${overlayUrl}`);
  overlayWindow.loadURL(overlayUrl);

  // Start in click-through mode
  overlayWindow.setIgnoreMouseEvents(true);
  overlayIgnoreMouse = true;

  // Handle window close
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  // Log when overlay is ready
  overlayWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] preload ran →', overlayWindow.webContents.getURL());
  });

  // Handle errors
  overlayWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Overlay window failed to load: ${errorDescription} (${errorCode})`);
    
    // If in development and failed to connect, it might be that the dev server isn't ready yet
    if (isDev && errorCode === -102) {
      console.log('Retrying overlay connection in 1 second...');
      setTimeout(() => {
        if (overlayWindow) {
          overlayWindow.loadURL(overlayUrl);
        }
      }, 1000);
    }
  });

  return overlayWindow;
}

// Register global shortcuts
function registerShortcuts() {
  console.log('Registering global shortcuts...');
  
  // Unregister any existing shortcuts first to avoid conflicts
  globalShortcut.unregisterAll();
  
  // Shortcut for screen capture (Cmd+Shift+Space on macOS, Ctrl+Shift+Space on Windows/Linux)
  const screenCaptureRegistered = globalShortcut.register('CommandOrControl+Shift+Space', () => {
    console.log('Screen capture shortcut triggered');
    if (mainWindow) {
      mainWindow.webContents.send('trigger-screen-capture');
    }
  });
  
  if (!screenCaptureRegistered) {
    console.error('Failed to register screen capture shortcut');
  }

  // Shortcut to toggle overlay visibility (Cmd+Shift+O on macOS, Ctrl+Shift+O on Windows/Linux)
  const overlayToggleRegistered = globalShortcut.register('CommandOrControl+Shift+O', () => {
    console.log('Overlay toggle shortcut triggered');
    if (overlayWindow) {
      if (overlayWindow.isVisible()) {
        console.log('Hiding overlay window');
        overlayWindow.hide();
      } else {
        console.log('Showing overlay window');
        overlayWindow.show();
        overlayWindow.focus();
      }
    } else {
      console.log('Creating overlay window');
      createOverlayWindow();
    }
  });
  
  if (!overlayToggleRegistered) {
    console.error('Failed to register overlay toggle shortcut');
  }

  // Shortcut to toggle overlay click-through (Cmd+Shift+I on macOS, Ctrl+Shift+I on Windows/Linux)
  const interactiveModeRegistered = globalShortcut.register('CommandOrControl+Shift+I', () => {
    console.log('Interactive mode toggle shortcut triggered');
    if (overlayWindow) {
      overlayIgnoreMouse = !overlayIgnoreMouse;
      // Toggle click-through: forward clicks in view, block in interactive
      overlayWindow.setIgnoreMouseEvents(overlayIgnoreMouse, { forward: overlayIgnoreMouse });
      console.log(`Overlay mode: ${overlayIgnoreMouse ? 'View (click‑through)' : 'Interactive (click‑enabled)'}`);
      overlayWindow.webContents.send('toggle-interactive-mode', !overlayIgnoreMouse); // true means interactive
    } else {
      console.log('Overlay window not available for interactive mode toggle');
    }
  });
  
  if (!interactiveModeRegistered) {
    console.error('Failed to register interactive mode shortcut');
  }

  try {
    // Audio capture shortcut - send to all windows
    globalShortcut.register('CommandOrControl+Shift+A', () => {
      console.log('Audio capture shortcut triggered');
      // Send to all windows instead of just mainWindow
      BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
          window.webContents.send('toggle-audio');
        }
      });
    });
    console.log('- Audio Capture Shortcut registered');
  } catch (e) {
    console.error('Failed to register audio capture shortcut', e);
  }
  
  // Keyboard move shortcuts for overlay (Cmd/Ctrl+Shift+Arrow)
  const moveStep = 20;
  globalShortcut.register('CommandOrControl+Shift+Left', () => {
    if (overlayWindow) {
      const [x, y] = overlayWindow.getPosition();
      overlayWindow.setPosition(x - moveStep, y);
    }
  });
  globalShortcut.register('CommandOrControl+Shift+Right', () => {
    if (overlayWindow) {
      const [x, y] = overlayWindow.getPosition();
      overlayWindow.setPosition(x + moveStep, y);
    }
  });
  globalShortcut.register('CommandOrControl+Shift+Up', () => {
    if (overlayWindow) {
      const [x, y] = overlayWindow.getPosition();
      overlayWindow.setPosition(x, y - moveStep);
    }
  });
  globalShortcut.register('CommandOrControl+Shift+Down', () => {
    if (overlayWindow) {
      const [x, y] = overlayWindow.getPosition();
      overlayWindow.setPosition(x, y + moveStep);
    }
  });

  // Register global "Ask Sneaky" shortcut (Cmd/Ctrl + Return)
  globalShortcut.register('CommandOrControl+Return', () => {
    console.log('Global "Ask Sneaky" shortcut triggered');
    if (overlayWindow && overlayWindow.webContents) {
      overlayWindow.webContents.send('ask-sneaky');
    }
  });

  console.log('Global shortcuts registered:');
  console.log('- Screen Capture: CommandOrControl+Shift+Space');
  console.log('- Toggle Overlay: CommandOrControl+Shift+O');
  console.log('- Toggle Interactive Mode: CommandOrControl+Shift+I');
}

// IPC handlers
function setupIPC() {
  // Handle screen capture requests
  ipcMain.handle('capture-screen', async () => {
    console.log('IPC: capture-screen called');
    // This will be implemented with robotjs in the preload script
    return { success: true };
  });

  // Handle copying text to clipboard
  ipcMain.handle('copy-to-clipboard', (event, text) => {
    console.log('IPC: copy-to-clipboard called');
    clipboard.writeText(text);
    return true;
  });

  // Handle settings updates
  ipcMain.handle('save-settings', (event, settings) => {
    console.log('IPC: save-settings called');
    store.set('settings', settings);
    return true;
  });

  // Handle settings retrieval
  ipcMain.handle('get-settings', () => {
    console.log('IPC: get-settings called');
    return store.get('settings', {
      apiKey: '',
      modelName: 'gpt-4',
      enableAudio: false,
      enableScreen: true,
      opacity: 0.8
    });
  });
  
  // Handle manual screen capture trigger
  ipcMain.handle('trigger-screen-capture-manually', () => {
    console.log('IPC: trigger-screen-capture-manually called');
    if (mainWindow) {
      mainWindow.webContents.send('trigger-screen-capture');
      return true;
    }
    return false;
  });

  // Handle suggestions update from main window renderer and forward to overlay
  ipcMain.on('suggestions-update', (_, suggestions) => {
    console.log('IPC: suggestions-update received in main process');
    // Cache the latest suggestions
    lastSuggestions = suggestions;
    if (overlayWindow && overlayWindow.webContents) {
      console.log('IPC: Forwarding suggestions to overlay window:', suggestions);
      overlayWindow.webContents.send('update-suggestions', suggestions);
    } else {
      console.log('IPC: Overlay window or webContents not available, cannot forward suggestions');
    }
  });

  // Handle chat messages from main window and forward to overlay
  ipcMain.on('chat-message', (_, msg) => {
    if (overlayWindow && overlayWindow.webContents) {
      overlayWindow.webContents.send('chat-message-forward', msg);
    }
  });

  // Handle audio capture trigger from main/renderer
  ipcMain.on('trigger-audio-capture', (_, ) => {
    if (mainWindow) mainWindow.webContents.send('trigger-audio-capture');
  });

  // IPC listener to nudge overlay from renderer
  ipcMain.on('move-overlay', (_, {dx, dy}) => {
    if (overlayWindow) {
      const [x, y] = overlayWindow.getPosition();
      overlayWindow.setPosition(x + dx, y + dy);
    }
  });

  // Handle audio transcription requests
  ipcMain.handle('transcribe-audio', async (event, audioBuffer) => {
    try {
      const formData = new FormData();
      formData.append('file', Buffer.from(audioBuffer), {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${error}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  });

  // Handle quit app request
  ipcMain.handle('quit-app', () => {
    app.quit();
  });

  // Handle history request
  ipcMain.on('request-history', () => {
    if (overlayWindow && overlayWindow.webContents) {
      overlayWindow.webContents.send('show-history');
    }
  });
}

// App lifecycle events
app.whenReady().then(() => {
  console.log('App is ready, launching overlay only...');
  setupIPC();
  // Register shortcuts for overlay interactions
  registerShortcuts();
  // Directly create the overlay window
  createOverlayWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  console.log('Unregistering all shortcuts');
  globalShortcut.unregisterAll();
});

// Add auto-updater event handlers
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
});

// Handle IPC messages for updates
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});
