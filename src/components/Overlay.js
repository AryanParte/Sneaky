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
  const [hasBlackHole, setHasBlackHole] = useState(true);
  const [showBlackHoleBanner, setShowBlackHoleBanner] = useState(false);
  const inputRef = useRef(null);
  const { isCapturing, clipAndTranscribe } = useAudioCapture(audioOn);

  // Set opacity based on settings
  const overlayStyle = {
    opacity: settings.opacity
  };

  // Check for BlackHole on mount
  useEffect(() => {
    if (window.electron?.audioEnv?.hasBlackHole) {
      const checkBlackHole = async () => {
        const installed = await window.electron.audioEnv.hasBlackHole();
        setHasBlackHole(installed);
        setShowBlackHoleBanner(!installed);
        if (!installed) {
          setAnswer('🔊 Finish installing the BlackHole audio driver — we opened the installer for you.');
        }
      };
      checkBlackHole();
    }
  }, []);

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

  // Helper function to build appropriate prompt based on screen content
  const buildPromptForScreen = (text) => {
    // LeetCode detection keywords
    const codingChallengeKeywords = [
      'leetcode',
      'constraints:',
      'example 1',
      'example 2',
      'example:',
      'given an array',
      'write a function',
      'implement a',
      'return the',
      'design an algorithm',
      'time complexity',
      'space complexity',
      'input:',
      'output:',
      'class solution',
      'test cases',
      'algorithm',
      'coding challenge',
      'coding problem'
    ];
    
    // Check if text contains any coding challenge keywords (case insensitive)
    const lowerText = text.toLowerCase();
    const isCodingChallenge = codingChallengeKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    
    if (isCodingChallenge) {
      // Language detection keywords
      const languages = {
        'python': ['python', 'def ', 'class solution', ':'],
        'javascript': ['javascript', 'js', 'function', 'const ', 'let ', '=> {', '() {'],
        'java': ['java', 'public class', 'public static', '}', 'int[] '],
        'c++': ['c++', 'cpp', '#include', 'vector<', 'int main'],
        'go': ['golang', 'go', 'func ', 'package main'],
        'c#': ['c#', 'csharp', 'namespace', 'using System']
      };
      
      // Try to detect language
      let detectedLanguage = 'python'; // Default to Python
      for (const [language, keywords] of Object.entries(languages)) {
        if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
          detectedLanguage = language;
          break;
        }
      }
      
      // Build coding challenge prompt
      return `You are a coding assistant helping with programming problems.

IMPORTANT: I'm showing you a LeetCode-style coding challenge. Respond in this exact format:

1. First, provide ONE complete working solution in ${detectedLanguage}.
2. Put your code in a SINGLE Markdown code block.
3. After the code, include at most 3 VERY SHORT bullet points explaining your approach.
4. Do not include any other text, greetings, or explanations.

Here is the problem:
${text}`;
    } else {
      // Default bullet point format for non-coding content
      return "You are an AI overlay for live sales calls.\n\nWhen given a screenshot text, reply ONLY with 3-5 bullet points (●).\n\nEach bullet ≤ 15 words.\n\nNo greeting, no conclusion, just the bullets in Markdown.\n\nScreen text:\n" + text;
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
          // Use the smart prompt builder instead of hard-coded prompt
          const prompt = buildPromptForScreen(result.text);
          const response = await sendChatMessage(prompt, false);
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
        {/* BlackHole Banner */}
        {showBlackHoleBanner && (
          <div className="px-4 py-2 bg-yellow-500/70 text-white rounded-t-lg">
            ⚠️ BlackHole audio driver required
          </div>
        )}

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

