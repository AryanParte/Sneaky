import { useState, useEffect } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
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

  const toggleAudio = () => {
    setAudioOn(prev => !prev);
  };

  return (
    <div>
      {/* Optional: Add a visual indicator for audio capture status */}
      <div className="audio-status">
        Audio Capture: {isCapturing ? 'Active' : 'Off'}
      </div>

      {/* Floating microphone button */}
      <button
        onClick={toggleAudio}
        className={`fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg focus:outline-none transition-colors duration-300 ${
          audioOn ? 'bg-red-500 animate-pulse' : 'bg-green-500 hover:bg-green-600'
        }`}
        aria-label={audioOn ? 'Stop audio capture' : 'Start audio capture'}
      >
        <MicrophoneIcon className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}

export default App; 