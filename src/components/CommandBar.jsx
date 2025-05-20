import React from 'react';
import { MicrophoneIcon, PencilIcon, ArrowPathIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';

const CommandBar = ({ 
  audioOn, 
  transcribing,
  isTextMode, 
  isInteractive,
  onAudioToggle, 
  onTextToggle, 
  onStartOver,
  onShowHistory,
  onQuit
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  
  // Determine microphone button class based on state
  const micButtonClass = `p-2 rounded-lg transition-colors ${
    transcribing
      ? 'bg-yellow-500 animate-pulse'
      : audioOn
        ? 'bg-red-500 animate-pulse'
        : 'bg-gray-700 hover:bg-gray-600'
  }`;
  
  return (
    <div className="flex items-center justify-between w-full bg-gray-800/90 rounded-lg p-2 shadow-lg" 
         style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onAudioToggle}
          className={micButtonClass}
          title={
            transcribing 
              ? 'Transcribing audio...' 
              : audioOn 
                ? 'Stop audio capture' 
                : 'Start audio capture'
          }
        >
          <MicrophoneIcon className="h-5 w-5 text-white" />
        </button>
        
        <div className="h-6 border-r border-gray-600 mx-1"></div>
        
        <button
          onClick={onTextToggle}
          className={`p-2 rounded-lg transition-colors ${
            isTextMode ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isTextMode ? 'Hide text input' : 'Show text input'}
        >
          <PencilIcon className="h-5 w-5 text-white" />
        </button>
        
        <div className="text-gray-300 text-sm ml-2">
          Ask Sneaky ⌘ + Return
        </div>
      </div>
      
      <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onStartOver}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          title="Start over"
        >
          <ArrowPathIcon className="h-5 w-5 text-white" />
          <span className="sr-only">Start Over</span>
        </button>
        
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            <EllipsisVerticalIcon className="h-5 w-5 text-white" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onShowHistory();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                  View History
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onQuit();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                  Quit Sneaky
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-gray-400 text-xs">
          {isInteractive ? 'Interactive' : 'Click-through'} ⌘+Shift+I
        </div>
      </div>
    </div>
  );
};

export default CommandBar; 