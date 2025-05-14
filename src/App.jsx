import { useState, useEffect } from 'react';
import useAudioCapture from './hooks/useAudioCapture';

function App() {
  const [audioOn, setAudioOn] = useState(false);
  const { isCapturing } = useAudioCapture(audioOn);

  useEffect(() => {
    // Listen for global shortcut to toggle audio capture
    window.electron.onAudioToggle(() => {
      setAudioOn(prev => !prev);
    });
  }, []);

  return (
    <div>
      {/* Optional: Add a visual indicator for audio capture status */}
      <div className="audio-status">
        Audio Capture: {isCapturing ? 'Active' : 'Off'}
      </div>
    </div>
  );
}

export default App; 