import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import MainApp from './components/MainApp';
import Overlay from './components/Overlay';
import Settings from './components/Settings';
import { SettingsProvider } from './contexts/SettingsContext';
import { AIProvider } from './contexts/AIContext';

function App() {
  const location = useLocation();
  
  // Determine if we're in the overlay route
  const isOverlay = location.pathname === '/overlay';
  
  return (
    <SettingsProvider>
      <AIProvider>
        <div className={`app ${isOverlay ? 'h-screen overflow-hidden' : ''}`}>
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/overlay" element={<Overlay />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </AIProvider>
    </SettingsProvider>
  );
}

export default App;
