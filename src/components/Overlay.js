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
  const [isInteractive, setIsInteractive] = useState(true);
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
  const overlayOpacity = Math.min(Math.max(settings.opacity, 0.1), 1);
  const frameTone = {
    background: `rgba(17, 24, 39, ${(0.28 + overlayOpacity * 0.45).toFixed(3)})`,
    border: `rgba(148, 163, 184, ${(0.18 + overlayOpacity * 0.18).toFixed(3)})`
  };

  const surfaceTone = {
    background: `rgba(30, 41, 59, ${(0.32 + overlayOpacity * 0.4).toFixed(3)})`,
    border: `rgba(148, 163, 184, ${(0.22 + overlayOpacity * 0.2).toFixed(3)})`
  };

  const subtleTone = {
    background: `rgba(51, 65, 85, ${(0.26 + overlayOpacity * 0.32).toFixed(3)})`,
    border: surfaceTone.border
  };

  useEffect(() => {
    document.body.classList.add('overlay-active');
    return () => {
      document.body.classList.remove('overlay-active');
    };
  }, []);

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
      className="fixed inset-0 flex items-end justify-center px-4 pb-12"
    >
      <div
        className="flex w-full max-w-3xl flex-col gap-3 rounded-3xl shadow-[0px_16px_40px_-24px_rgba(15,23,42,0.55)]"
        style={{
          WebkitAppRegion: 'drag',
          backgroundColor: frameTone.background,
          border: `1px solid ${frameTone.border}`,
          pointerEvents: 'auto'
        }}
      >
        {/* BlackHole Banner */}
        {showBlackHoleBanner && (
          <div className="flex items-center justify-between rounded-t-3xl border-b border-amber-200/40 bg-amber-200/20 px-4 py-2 text-xs font-medium text-amber-900">
            <span>Install BlackHole audio driver</span>
            <span aria-hidden="true">⚠️</span>
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
          onAsk={doAskSneaky}
          surfaceTone={surfaceTone}
        />
        
        {/* Text Input */}
        {isTextMode && (
          <div className="mt-3 px-3">
            <input
              ref={inputRef}
              type="text"
              className="w-full rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-300 focus:outline-none"
              placeholder="Type prompt · Enter"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              style={{
                WebkitAppRegion: 'no-drag',
                border: `1px solid ${subtleTone.border}`,
                backgroundColor: subtleTone.background
              }}
            />
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mx-3 mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm text-rose-100">
            {error}
          </div>
        )}
        
        {/* Loading Indicator */}
        {isChatProcessing && !answer && (
          <div
            className="mx-3 mt-3 rounded-2xl px-4 py-3 text-center text-sm text-slate-200 animate-pulse"
            style={{
              border: `1px solid ${subtleTone.border}`,
              backgroundColor: subtleTone.background
            }}
          >
            Thinking...
          </div>
        )}

        {/* Answer Box */}
        {answer && <AnswerBox markdown={answer} tone={surfaceTone} />}
      </div>
      
      {/* History Modal */}
      <HistoryModal 
        history={history}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        tone={surfaceTone}
      />
    </div>
  );
};

export default Overlay;
