const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Log that preload script is running
console.log('[Preload] Script started');

// Function to check if BlackHole is installed
const hasBlackHole = () => {
  try {
    const output = execSync('system_profiler SPAudioDataType').toString();
    return output.includes('BlackHole 2ch');
  } catch (error) {
    console.error('[Preload] Error checking BlackHole:', error);
    return false;
  }
};

// Try to load robotjs, screenshot-desktop, and Tesseract, but don't fail if they're not available
let robot = null;
let screenshot = null;
let Tesseract = null;
let tesseractConfig = {
  lang: 'eng',
  oem: 1,
  psm: 3,
};

try {
  robot = require('robotjs');
  console.log('[Preload] Successfully loaded robotjs');
} catch (error) {
  console.error('[Preload] Failed to load robotjs:', error.message);
}

try {
  screenshot = require('screenshot-desktop');
  console.log('[Preload] Successfully loaded screenshot-desktop');
} catch (error) {
  console.error('[Preload] Failed to load screenshot-desktop:', error.message);
}

try {
  Tesseract = require('node-tesseract-ocr');
  console.log('[Preload] Successfully loaded node-tesseract-ocr');
} catch (error) {
  console.error('[Preload] Failed to load node-tesseract-ocr:', error.message);
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // Audio environment functions
    audioEnv: {
      hasBlackHole: () => hasBlackHole()
    },
    
    // Screen capture and OCR functions
    captureScreen: async () => {
      console.log('[Preload] captureScreen called');
      
      // Try robotjs first if available
      if (robot && Tesseract) {
        try {
          // Get screen size
          const screenSize = robot.getScreenSize();
          console.log(`[Preload] Screen size: ${screenSize.width}x${screenSize.height}`);
          
          // Capture screen
          const img = robot.screen.capture(0, 0, screenSize.width, screenSize.height);
          console.log('[Preload] Screen captured with robotjs');
          
          // Convert the bitmap to a format Tesseract can use
          const buffer = Buffer.from(img.image);
          
          // Perform OCR
          console.log('[Preload] Starting OCR...');
          const text = await Tesseract.recognize(buffer, tesseractConfig);
          console.log('[Preload] OCR completed');
          
          return { success: true, text };
        } catch (error) {
          console.error('[Preload] robotjs screen capture error:', error);
          // Fall through to try screenshot-desktop
        }
      }
      
      // Try screenshot-desktop as fallback
      if (screenshot && Tesseract) {
        try {
          console.log('[Preload] Trying screenshot-desktop fallback');
          // Create a temp file path
          const tmpDir = os.tmpdir();
          const tmpFile = path.join(tmpDir, `screenshot-${Date.now()}.png`);
          
          // Take screenshot and save to temp file
          await screenshot({ filename: tmpFile });
          console.log(`[Preload] Screenshot saved to ${tmpFile}`);
          
          // Perform OCR on the image file
          console.log('[Preload] Starting OCR...');
          const text = await Tesseract.recognize(tmpFile, tesseractConfig);
          console.log('[Preload] OCR completed');
          
          // Clean up temp file
          try {
            fs.unlinkSync(tmpFile);
            console.log(`[Preload] Deleted temp file ${tmpFile}`);
          } catch (cleanupErr) {
            console.error('[Preload] Error deleting temp file:', cleanupErr);
          }
          
          return { success: true, text };
        } catch (error) {
          console.error('[Preload] screenshot-desktop error:', error);
        }
      }
      
      // If we get here, both methods failed
      console.error('[Preload] Screen capture unavailable: required modules not loaded or failed');
      return { 
        success: false, 
        error: 'Screen capture unavailable: required modules not loaded or failed' 
      };
    },
    
    // Clipboard functions
    copyToClipboard: (text) => {
      console.log('[Preload] copyToClipboard called');
      return ipcRenderer.invoke('copy-to-clipboard', text);
    },
    
    // Settings functions
    saveSettings: (settings) => {
      console.log('[Preload] saveSettings called');
      return ipcRenderer.invoke('save-settings', settings);
    },
    getSettings: () => {
      console.log('[Preload] getSettings called');
      return ipcRenderer.invoke('get-settings');
    },
    
    // Event listeners
    onScreenCaptureTrigger: (callback) => {
      console.log('[Preload] Setting up screen capture trigger listener');
      const listener = () => {
        console.log('[Preload] Screen capture trigger received');
        callback();
      };
      ipcRenderer.on('trigger-screen-capture', listener);
      return () => {
        console.log('[Preload] Removing screen capture trigger listener');
        ipcRenderer.removeListener('trigger-screen-capture', listener);
      };
    },
    
    onToggleInteractiveMode: (callback) => {
      console.log('[Preload] Setting up toggle interactive mode listener');
      const listener = (_, isInteractive) => {
        console.log(`[Preload] Toggle interactive mode received: ${isInteractive}`);
        callback(isInteractive);
      };
      ipcRenderer.on('toggle-interactive-mode', listener);
      return () => {
        console.log('[Preload] Removing toggle interactive mode listener');
        ipcRenderer.removeListener('toggle-interactive-mode', listener);
      };
    },
    
    // Send suggestions from main window renderer to main process
    sendSuggestions: (suggestions) => {
      console.log('[Preload] sendSuggestions called');
      ipcRenderer.send('suggestions-update', suggestions);
    },
    
    // Listener for suggestions updates (used in overlay window)
    onSuggestionsUpdate: (callback) => {
      console.log('[Preload - Overlay] Setting up suggestions update listener');
      const listener = (_, suggestions) => {
        console.log('[Preload - Overlay] Suggestions update received via IPC:', suggestions);
        callback(suggestions);
      }; 
      ipcRenderer.on('update-suggestions', listener);
      ipcRenderer.on('ping', () => {
        console.log('[Preload - Overlay] ping received');
      });
      return () => {
        console.log('[Preload - Overlay] Removing suggestions update listener');
        ipcRenderer.removeListener('update-suggestions', listener);
      };
    },
    
    // Send chat message from renderer to main
    sendChatMessage: (msg) => {
      console.log('[Preload] sendChatMessage called');
      ipcRenderer.send('chat-message', msg);
    },
    
    // Move overlay window by given delta
    moveOverlay: (dx, dy) => {
      console.log('[Preload] moveOverlay called:', dx, dy);
      ipcRenderer.send('move-overlay', { dx, dy });
    },
    
    // Overlay: receive chat messages forwarded from main
    onChatMessage: (callback) => {
      const listener = (_, msg) => callback(msg);
      ipcRenderer.on('chat-message-forward', listener);
      return () => ipcRenderer.removeListener('chat-message-forward', listener);
    },
    
    // Listen for audio capture trigger (global shortcut)
    onAudioCaptureTrigger: (callback) => {
      console.log('[Preload] Setting up audio capture trigger listener');
      const listener = () => {
        console.log('[Preload] audio capture trigger received');
        callback();
      };
      ipcRenderer.on('trigger-audio-capture', listener);
      return () => {
        console.log('[Preload] Removing audio capture trigger listener');
        ipcRenderer.removeListener('trigger-audio-capture', listener);
      };
    },
    
    // Utility function to check if running in Electron
    isElectron: true,
    
    onAudioToggle: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('toggle-audio', listener);
      return () => ipcRenderer.removeListener('toggle-audio', listener);
    },
    sendSuggestions: (data) => ipcRenderer.send('suggestions', data),
    transcribeAudio: (blob) => {
      return new Promise((resolve, reject) => {
        // Convert blob to buffer for IPC transfer
        const reader = new FileReader();
        reader.onload = () => {
          const buffer = Buffer.from(reader.result);
          ipcRenderer.invoke('transcribe-audio', buffer)
            .then(resolve)
            .catch(reject);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
    },
    quitApp: () => {
      console.log('[Preload] quitApp called');
      ipcRenderer.invoke('quit-app');
    },
    onShowHistory: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('show-history', listener);
      return () => ipcRenderer.removeListener('show-history', listener);
    },
    onAskSneaky: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('ask-sneaky', listener);
      return () => ipcRenderer.removeListener('ask-sneaky', listener);
    }
  }
);

console.log('[Preload] Electron API exposed on window.electron');

// Add this to the exposed API in contextBridge.exposeInMainWorld
contextBridge.exposeInMainWorld('electronEnv', {
  getOpenAIKey: () => process.env.OPENAI_API_KEY || ''
});
