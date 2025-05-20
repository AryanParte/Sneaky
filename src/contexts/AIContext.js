import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import OpenAI from 'openai';

const AIContext = createContext();

export const useAI = () => useContext(AIContext);

export const AIProvider = ({ children }) => {
  const { settings, envKey, updateSettings } = useSettings();
  const [suggestions, setSuggestions] = useState([]); // deprecated but kept
  const [screenText, setScreenText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);

  // Determine if this renderer is the overlay window (hash route contains /overlay)
  const isOverlayWindow =
    typeof window !== 'undefined' && window.location.hash.includes('/overlay');

  // No-op listener to prevent console spam from suggestions-update broadcasts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.electron || !window.electron.onSuggestionsUpdate) return;
    const unsub = window.electron.onSuggestionsUpdate(() => {});
    return unsub;
  }, []);

  // Listen for incoming chat messages from the main window (overlay only)
  useEffect(() => {
    if (!isOverlayWindow) return;
    if (!window.electron || !window.electron.onChatMessage) return;
    const unsub = window.electron.onChatMessage((msg) => {
      setChatHistory((prev) => [...prev, msg]);
    });
    return unsub;
  }, [isOverlayWindow]);

  // Process screen content with OpenAI
  const processScreenContent = async (text) => {
    if (!settings.apiKey) {
      setError('API key is not configured. Please go to settings.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const openai = new OpenAI({
        apiKey: settings.apiKey,
        dangerouslyAllowBrowser: true // Note: In production, API calls should go through a backend
      });

      const prompt = `
        You are Sneaky, a discreet AI assistant helping during meetings, interviews, or calls.
        Based on the following screen content, provide 1-2 concise, helpful suggestions that might be useful to the user.
        Keep suggestions under 100 characters each.
        
        Screen content: ${text}
      `;

      const response = await openai.chat.completions.create({
        model: settings.modelName,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides brief, useful suggestions.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      // Parse the response to get suggestions
      const content = response.choices[0].message.content;
      let parsedSuggestions = content
        .split('\n')
        .map(line => line.replace(/^[0-9]+[\.\)-]?\s*/, '').trim()) // Remove numbering like "1. " or "2) "
        .filter(line => line.length > 0);

      if (parsedSuggestions.length === 0) {
        console.warn('[AIContext] No suggestions parsed, using entire response as fallback');
        parsedSuggestions = [content.trim()];
      }

      // Keep at most 2 concise suggestions
      parsedSuggestions = parsedSuggestions.slice(0, 2);

      console.log('[AIContext] Parsed suggestions:', parsedSuggestions);

      setSuggestions(parsedSuggestions);

      // Broadcast suggestions to overlay via IPC
      if (typeof window !== 'undefined' && window.electron) {
        console.log('[AIContext - Main] window.electron keys:', Object.keys(window.electron));
        console.log('[AIContext - Main] typeof sendSuggestions:', typeof window.electron.sendSuggestions);
        if (window.electron.sendSuggestions) {
          try {
            console.log('[AIContext - Main] Calling sendSuggestions...');
            window.electron.sendSuggestions(parsedSuggestions);
          } catch (broadcastErr) {
            console.error('[AIContext - Main] Failed to send suggestions via IPC:', broadcastErr);
          }
        } else {
          console.warn('[AIContext - Main] sendSuggestions not available on window.electron');
        }
      }
    } catch (err) {
      console.error('Error processing with OpenAI:', err);
      setError('Failed to process content. Check your API key and connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process audio content with OpenAI
  const processAudioContent = async (transcription) => {
    if (!settings.apiKey) {
      setError('API key is not configured. Please go to settings.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const openai = new OpenAI({
        apiKey: settings.apiKey,
        dangerouslyAllowBrowser: true // Note: In production, API calls should go through a backend
      });

      const prompt = `
        You are Sneaky, a discreet AI assistant helping during meetings, interviews, or calls.
        Based on the following audio transcription, provide 1-2 concise, helpful suggestions that might be useful to the user.
        Keep suggestions under 100 characters each.
        
        Audio transcription: ${transcription}
      `;

      const response = await openai.chat.completions.create({
        model: settings.modelName,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides brief, useful suggestions.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      // Parse the response to get suggestions
      const content = response.choices[0].message.content;
      let parsedSuggestions = content
        .split('\n')
        .map(line => line.replace(/^[0-9]+[\.\)-]?\s*/, '').trim()) // Remove numbering like "1. " or "2) "
        .filter(line => line.length > 0);

      if (parsedSuggestions.length === 0) {
        console.warn('[AIContext] No suggestions parsed, using entire response as fallback');
        parsedSuggestions = [content.trim()];
      }

      // Keep at most 2 concise suggestions
      parsedSuggestions = parsedSuggestions.slice(0, 2);

      console.log('[AIContext] Parsed suggestions:', parsedSuggestions);

      setSuggestions(parsedSuggestions);
    } catch (err) {
      console.error('Error processing with OpenAI:', err);
      setError('Failed to process content. Check your API key and connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ------------------------------------------------------------------
     🖥️  Automatic Screen Monitoring (main renderer only)
     Captures screen every 10 s and feeds OCR text to processScreenContent.
     Skips overlay renderer and avoids overlapping requests.
  ------------------------------------------------------------------ */
  useEffect(() => {
    // Only run in the main window, not overlay
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#/overlay') return;

    const INTERVAL_MS = 10000; // 10 seconds – adjust as needed
    let cancelled = false;

    const intervalId = setInterval(async () => {
      if (cancelled) return;
      if (isProcessing || isChatProcessing) return; // avoid overlap

      try {
        if (window.electron && window.electron.captureScreen) {
          const result = await window.electron.captureScreen();
          if (result.success && result.text && result.text.trim()) {
            console.log('[AIContext] Auto-monitor captured text length:', result.text.length);
            setScreenText(result.text);
            // Clear old suggestions (overlay is now chat-only)
            setSuggestions([]);
          }
        }
      } catch (err) {
        console.error('[AIContext] Auto screen monitor error:', err);
      }
    }, INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [settings.apiKey, settings.modelName]);

  // Send a chat message and get assistant reply
  const sendChatMessage = async (content, isAudioMode = false) => {
    return new Promise(async (resolve, reject) => {
      const apiKey = envKey;
      if (!apiKey) {
        setError('⚠️ Add OPENAI_API_KEY to .env and restart.');
        reject('no key');
        return;
      }

      const trimmed = content.trim();
      if (!trimmed) {
        reject('Empty content');
        return;
      }

      // Optimistically add user message to history and broadcast to overlay (if in main window)
      const userMsg = { role: 'user', content: trimmed };
      setChatHistory((prev) => [...prev, userMsg]);

      if (!isOverlayWindow && window.electron?.sendChatMessage) {
        try {
          window.electron.sendChatMessage(userMsg);
        } catch (err) {
          console.warn('[AIContext] Failed to send user chat IPC:', err);
        }
      }

      setIsChatProcessing(true);
      setError(null);

      try {
        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        // Build context messages
        let ctxText = screenText;
        
        // Determine system prompt and parameters based on context
        let systemPrompt = '';
        let maxTokens = 500;
        let temperature = 0.7;
        
        if (isAudioMode) {
          // For audio mode, use the prompt that's already in the content
          systemPrompt = '';
          maxTokens = 120;
          temperature = 0.3;
        } else if (ctxText) {
          systemPrompt = `You are Sneaky, an AI assistant helping during meetings or calls.
            The user has shared their screen with you. Here's what's on their screen:
            ${ctxText.slice(0, 500)}...
            
            Provide a helpful, concise response.`;
        } else {
          systemPrompt = 'You are Sneaky...';
          maxTokens = 1500;
          temperature = 0.7;
        }
        
        const messages = isAudioMode 
          ? [{ role: 'user', content: trimmed }]  // For audio mode, just use the user message with the prompt
          : [{ role: 'system', content: systemPrompt }, ...chatHistory.map(m=>({role:m.role,content:m.content})), { role:'user', content: trimmed }];
        
        // Start streaming completion
        const stream = await openai.chat.completions.create({
          model: settings.modelName,
          messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: true
        });
        const assistantMsg = { role: 'assistant', content: '' };
        // Add empty msg to history
        setChatHistory(prev => [...prev, assistantMsg]);
        if (!isOverlayWindow) window.electron?.sendChatMessage(assistantMsg);
        // Append chunks as they arrive
        for await (const part of stream) {
          const delta = part.choices?.[0]?.delta?.content;
          if (delta) {
            assistantMsg.content += delta;
            setChatHistory(prev => {
              const h = [...prev];
              h[h.length-1] = { ...assistantMsg };
              return h;
            });
            if (!isOverlayWindow) window.electron?.sendChatMessage({ role:'assistant', content: assistantMsg.content });
          }
        }
        
        // Resolve the promise with the assistant's response
        resolve(assistantMsg.content);
      } catch (err) {
        console.error('Chat streaming error:', err);
        setError('Chat failed.');
        reject(err);
      } finally {
        setIsChatProcessing(false);
      }
    });
  };

  // Analyze raw screen OCR text and inject assistant reply into chat automatically
  const analyzeScreenAndRespond = async (ocrText) => {
    if (!settings.apiKey) {
      setError('API key is not configured. Please go to settings.');
      return;
    }

    if (!ocrText || !ocrText.trim()) return;

    // Add a placeholder system note to chat (optional)
    setChatHistory((prev) => [...prev, { role: 'system', content: '📸 Screen captured' }]);

    setIsChatProcessing(true);
    try {
      const openai = new OpenAI({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
      // Stream assistant analysis
      const stream = await openai.chat.completions.create({ model: settings.modelName, messages: [{ role:'user', content:`You are Sneaky... [SCREEN OCR]\n${ocrText.slice(0,4000)}` }], max_tokens:500, temperature:0.7, stream:true });
      const assistantMsg = { role:'assistant', content:'' };
      setChatHistory(prev=>[...prev,assistantMsg]);
      if (!isOverlayWindow) window.electron?.sendChatMessage(assistantMsg);
      for await (const part of stream) {
        const delta = part.choices?.[0]?.delta?.content;
        if (delta) {
          assistantMsg.content += delta;
          setChatHistory(prev=>{ const h=[...prev]; h[h.length-1]={...assistantMsg}; return h; });
          if (!isOverlayWindow) window.electron?.sendChatMessage({ role:'assistant', content: assistantMsg.content });
        }
      }
    } catch (err) {
      console.error('analyzeScreenAndRespond error:', err);
      setError('Failed to analyze screen.');
    } finally {
      setIsChatProcessing(false);
    }
  };

  // Clear suggestions
  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return (
    <AIContext.Provider 
      value={{ 
        suggestions, 
        isProcessing, 
        error, 
        processScreenContent, 
        processAudioContent, 
        clearSuggestions,
        chatHistory,
        sendChatMessage,
        isChatProcessing,
        screenText,
        analyzeScreenAndRespond
      }}
    >
      {children}
    </AIContext.Provider>
  );
};
