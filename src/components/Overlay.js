import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAI } from '../contexts/AIContext';
import useAudioCapture from '../hooks/useAudioCapture';
import CommandBar from './CommandBar';
import AnswerBox from './AnswerBox';
import HistoryModal from './HistoryModal';

const Overlay = () => {
  const { settings, envKey } = useSettings();
  const { error, sendChatMessage, isChatProcessing, analyzeScreenAndRespond } = useAI();
  const [isInteractive, setIsInteractive] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const inputRef = useRef(null);
  const { isCapturing, clipAndTranscribe } = useAudioCapture(audioOn);

  // Set opacity based on settings
  const overlayStyle = {
    opacity: settings.opacity
  };

  useEffect(() => {
    // Set up event listener for interactive mode toggle
    if (window.electron) {
      const unsubscribe = window.electron.onToggleInteractiveMode((interactive) => {
        setIsInteractive(interactive);
      });

      // Cleanup function
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    // Listen for global shortcut to toggle audio capture
    if (window.electron && window.electron.onAudioToggle) {
      const unsubscribe = window.electron.onAudioToggle(() => {
        setAudioOn(prev => !prev);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    // Focus input when text mode is enabled
    if (isTextMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTextMode]);

  // Listen for show history event from main process
  useEffect(() => {
    if (window.electron && window.electron.onShowHistory) {
      const unsubscribe = window.electron.onShowHistory(() => {
        setIsHistoryOpen(true);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Listen for global "Ask Sneaky" shortcut
  useEffect(() => {
    if (window.electron && window.electron.onAskSneaky) {
      const unsubscribe = window.electron.onAskSneaky(() => {
        doAskSneaky();
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [audioOn, isTextMode, chatInput]); // Re-register when these dependencies change

  const handleChatResponse = (content) => {
    setAnswer(content);
    // Add to history
    if (content.trim()) {
      setHistory(prev => [content, ...prev]);
    }
  };

  // Centralized function to handle the "Ask Sneaky" action
  const doAskSneaky = async () => {
    try {
      if (!envKey) {
        setAnswer('⚠️ OPENAI_API_KEY missing in .env');
        return;
      }
      
      if (audioOn) {
        // If audio is on, clip and transcribe
        setTranscribing(true);
        const transcript = await clipAndTranscribe();
        setTranscribing(false);
        
        if (transcript && transcript.trim()) {
          // Add prompt context for the AI - bullet points format
          const promptWithContext = "You are an AI overlay for live sales calls.\n\nWhen given a transcript of the last 15 seconds, reply ONLY with 3-5 bullet points (●).\n\nEach bullet ≤ 15 words.\n\nNo greeting, no conclusion, just the bullets in Markdown.\n\nTranscript:\n" + transcript;
          const response = await sendChatMessage(promptWithContext, true);
          handleChatResponse(response);
        }
      } else if (isTextMode && chatInput.trim()) {
        // If audio is off and there's text input, send the text
        const response = await sendChatMessage(chatInput);
        handleChatResponse(response);
        setChatInput('');
      } else {
        // If no input and no audio, trigger screen capture
        const result = await window.electron?.captureScreen?.();
        if (result?.success && result.text?.trim()) {
          // Format the prompt for bullet points
          const promptWithContext = "You are an AI overlay for live sales calls.\n\nWhen given a screenshot text, reply ONLY with 3-5 bullet points (●).\n\nEach bullet ≤ 15 words.\n\nNo greeting, no conclusion, just the bullets in Markdown.\n\nScreen text:\n" + result.text;
          const response = await sendChatMessage(promptWithContext, false);
          handleChatResponse(response);
        } else {
          // Handle empty OCR result
          setAnswer("Could not read any text from the screen.");
        }
      }
    } catch (error) {
      console.error("Error in doAskSneaky:", error);
      setAnswer("Sorry, there was an error processing your request.");
    }
  };

  const handleInputKeyDown = async (e) => {
    // Check if it's Enter key with Cmd/Ctrl modifier or just Enter
    if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || e.key === 'Enter') {
      e.preventDefault();
      doAskSneaky();
    }
  };

  const handleToggleAudio = () => {
    setAudioOn(prev => !prev);
  };

  const handleToggleTextMode = () => {
    setIsTextMode(prev => !prev);
  };

  const handleStartOver = () => {
    setAnswer('');
    setChatInput('');
  };

  const handleQuit = () => {
    if (window.electron?.quitApp) {
      window.electron.quitApp();
    }
  };

  return (
    <div
      className="fixed inset-0 p-4 flex flex-col items-center pointer-events-auto"
      style={{ pointerEvents: isInteractive ? 'auto' : 'none' }}
    >
      <div
        className="w-full max-w-2xl flex flex-col shadow-2xl rounded-2xl border border-gray-400/30"
        style={{
          ...overlayStyle,
          WebkitAppRegion: 'drag',
          background: 'rgba(36, 37, 46, 0.68)',
          backdropFilter: 'blur(16px) saturate(180%)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
          border: '1.5px solid rgba(255,255,255,0.12)',
          pointerEvents: 'auto'
        }}
      >
        {/* Command Bar */}
        <CommandBar 
          audioOn={audioOn}
          transcribing={transcribing}
          isTextMode={isTextMode}
          isInteractive={isInteractive}
          onAudioToggle={handleToggleAudio}
          onTextToggle={handleToggleTextMode}
          onStartOver={handleStartOver}
          onShowHistory={() => setIsHistoryOpen(true)}
          onQuit={handleQuit}
        />
        
        {/* Text Input */}
        {isTextMode && (
          <div className="mt-2 px-2">
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-gray-700/70 text-white text-base px-4 py-3 rounded-lg outline-none placeholder-gray-300 border border-gray-500/20 focus:ring-2 focus:ring-blue-400 transition"
              placeholder="Type a message, then press Enter to send..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              style={{ WebkitAppRegion: 'no-drag' }}
            />
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mt-2 px-4 py-2 bg-red-500/70 text-white rounded-lg">
            {error}
          </div>
        )}
        
        {/* Loading Indicator */}
        {isChatProcessing && !answer && (
          <div className="mt-2 px-4 py-3 bg-gray-800/80 rounded-lg text-gray-300 animate-pulse text-center">
            Thinking...
          </div>
        )}
        
        {/* Answer Box */}
        {answer && <AnswerBox markdown={answer} />}
      </div>
      
      {/* History Modal */}
      <HistoryModal 
        history={history}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};

export default Overlay;

