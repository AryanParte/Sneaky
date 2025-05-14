import React, { createContext, useState, useEffect, useContext } from 'react';

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

  const [settings, setSettings] = useState({
    apiKey: '',
    modelName: 'gpt-4',
    enableAudio: false,
    enableScreen: true,
    opacity: 0.8
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isElectron, setIsElectron] = useState(() => {
    const runningInElectron = typeof window !== 'undefined' && !!window.electron;
    console.log('[SettingsProvider Effect] Confirming Electron environment:', runningInElectron, 'window.electron keys:', typeof window !== 'undefined' && window.electron ? Object.keys(window.electron) : 'N/A');
    return runningInElectron;
  });

  useEffect(() => {
    console.log('[SettingsProvider Effect] Component mounted. Initial isElectron:', isElectron);

    // Attempt to load settings
    const loadSettings = async () => {
      try {
        // Force check again in case the electron object wasn't available immediately
        setIsElectron(isRunningInElectron());
        
        if (window.electron) {
          console.log('Loading settings from Electron store...');
          const savedSettings = await window.electron.getSettings();
          if (savedSettings) {
            console.log('Settings loaded successfully');
            setSettings(savedSettings);
          } else {
            console.log('No saved settings found');
          }
        } else {
          console.log('Electron not available, using default settings');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    console.log('[SettingsProvider] Attempting to save settings:', newSettings);
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    if (window.electron) {
      try {
        console.log('Saving settings to Electron store...');
        await window.electron.saveSettings(updatedSettings);
        console.log('Settings saved successfully');
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    } else {
      // Fallback for browser environment
      console.log('Saving settings to localStorage (browser fallback)');
      localStorage.setItem('cluelySettings', JSON.stringify(updatedSettings));
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading, isElectron }}>
      {children}
    </SettingsContext.Provider>
  );
};
