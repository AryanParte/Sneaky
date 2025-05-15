import { useState, useEffect } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import useAudioCapture from '../hooks/useAudioCapture';

function Overlay() {
  const [audioOn, setAudioOn] = useState(false);
  const { isCapturing } = useAudioCapture(audioOn);

  useEffect(() => {
    const stop = window.electron.onAudioToggle(() =>
      setAudioOn(prev => !prev)
    );
    return stop;
  }, []);

  return (
    <div>
      <button
        onClick={() => setAudioOn(p => !p)}
        className={`fixed bottom-6 right-6 z-[9999] p-3 rounded-full shadow-lg
                  transition-colors duration-300 focus:outline-none
                  ${audioOn
                     ? 'bg-red-500 animate-pulse'
                     : 'bg-green-500 hover:bg-green-600'}`}
        aria-label={audioOn ? 'Stop audio capture' : 'Start audio capture'}
      >
        <MicrophoneIcon className="h-6 w-6 text-white" />
      </button>

      <div className="fixed bottom-20 right-8 text-xs text-white/80">
        Audio: {isCapturing ? 'Active' : 'Off'}
      </div>
    </div>
  );
}

export default Overlay; 