const { app, BrowserWindow, globalShortcut, ipcMain, clipboard } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { screen } = require('electron');
const Store = require('electron-store');
const http = require('http');

// Initialize the settings store
const store = new Store();

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
      preload: path.join(__dirname, 'preload.js')
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
      // Open DevTools automatically in development
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
      
      // Register global shortcuts after window is ready
      registerShortcuts();
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
  console.log('Creating overlay window...');
  // Get the primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: width,      // full screen width
    height: Math.round(height / 2),    // half screen height
    x: 0,            // align left edge
    y: 0,            // align top edge
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    movable: true,    // allow drag
    resizable: true,  // allow resize via OS
    contentProtection: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Don't show until loaded
  });

  // Load the overlay component
  const loadOverlay = () => {
    const url = isDev
      ? `http://${REACT_DEV_HOST}:${REACT_DEV_PORT}/#/overlay` // Use updated port
      : `file://${path.join(__dirname, 'build/index.html#/overlay')}`;
    
    console.log(`Loading overlay from: ${url}`);
    overlayWindow.loadURL(url);
    
    overlayWindow.once('ready-to-show', () => {
      console.log('Overlay window ready to show');
      overlayWindow.show();
      // Initialize click-through for View Mode (forward clicks)
      overlayWindow.setIgnoreMouseEvents(overlayIgnoreMouse, { forward: overlayIgnoreMouse });
      overlayWindow.webContents.send('toggle-interactive-mode', !overlayIgnoreMouse);
    });
    
    overlayWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`Failed to load overlay: ${errorDescription} (${errorCode})`);
      // Try to reload after a short delay
      setTimeout(() => {
        console.log('Attempting to reload overlay...');
        overlayWindow.loadURL(url);
      }, 2000);
    });
  };

  if (isDev) {
    checkReactDevServerReady(loadOverlay);
  } else {
    loadOverlay();
  }

  // Prevent capture fallback and enable run‑time protection (Windows)
  if (overlayWindow) {
    overlayWindow.setContentProtection(true);
  }

  // By default allow interaction; View mode can toggle to click-through via shortcut
  // overlayWindow.setIgnoreMouseEvents(false);

  // Whenever the overlay window is shown, reapply click-through & mode, then resend suggestions
  overlayWindow.on('show', () => {
    // Apply OS-level click-through based on current mode
    overlayWindow.setIgnoreMouseEvents(overlayIgnoreMouse, { forward: overlayIgnoreMouse });
    // Update renderer's interactive flag
    overlayWindow.webContents.send('toggle-interactive-mode', !overlayIgnoreMouse);
    // Forward cached suggestions
    if (lastSuggestions && lastSuggestions.length && overlayWindow && overlayWindow.webContents) {
      console.log('Overlay window shown, sending cached suggestions');
      overlayWindow.webContents.send('update-suggestions', lastSuggestions);
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
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
    globalShortcut.register(store.get('settings').audioShortcut || 'CommandOrControl+Shift+A', () => {
      if (mainWindow) mainWindow.webContents.send('trigger-audio-capture');
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
