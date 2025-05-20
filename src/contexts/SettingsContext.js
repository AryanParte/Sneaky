import React, { createContext, useContext, useState, useEffect } from 'react';

// Log access attempt at the module level (runs once on import)
console.log('[SettingsContext Module] Checking window.electron:', typeof window !== 'undefined' ? window.electron : 'window is undefined');

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

// Helper function to check if running in Electron
const isRunningInElectron = () => {
  console.log('Checking if running in Electron...');
  console.log('window.electron exists:', !!window.electron);
  if (window.electron) {
    console.log('window.electron.isElectron:', window.electron.isElectron);
  }
  return !!(window.electron && window.electron.isElectron === true);
};

export const SettingsProvider = ({ children }) => {
  // Log access attempt inside the component body (runs on each render)
  console.log('[SettingsProvider Render] Checking window.electron:', typeof window !== 'undefined' ? window.electron : 'window is undefined');

  // Get API key from environment
  const envKey = window.electronEnv?.getOpenAIKey?.() || '';
  
  // Initialize settings without apiKey
  const [settings, setSettings] = useState({
    modelName: 'gpt-4o',
    opacity: 0.9,
    enableAudio: true,
    autoCapture: false,
    theme: 'dark'
  });
  
  const isElectron = typeof window !== 'undefined' && window.electron;

  // Load settings from electron store on mount
  useEffect(() => {
    if (isElectron && window.electron.loadSettings) {
      const loadedSettings = window.electron.loadSettings();
      if (loadedSettings) {
        // Remove apiKey from loaded settings
        const { apiKey, ...rest } = loadedSettings;
        setSettings(prev => ({ ...prev, ...rest }));
      }
    }
  }, [isElectron]);

  // Update settings and save to electron store
  const updateSettings = (patch) => {
    // Strip apiKey from patch
    const { apiKey, ...rest } = patch;
    const next = { ...settings, ...rest };
    setSettings(next);
    if (isElectron && window.electron.saveSettings) {
      window.electron.saveSettings(next);
    }
    return next;
  };

  return (
    <SettingsContext.Provider value={{ settings, envKey, updateSettings, isElectron }}>
      {children}
    </SettingsContext.Provider>
  );
};
