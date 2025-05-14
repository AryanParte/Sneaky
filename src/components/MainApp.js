import React, { useState, useEffect } from 'react';
import OpenAI from 'openai';
import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAI } from '../contexts/AIContext';

const MainApp = () => {
  const { settings, isLoading, isElectron } = useSettings();
  const { processScreenContent, sendChatMessage, isProcessing, error, analyzeScreenAndRespond } = useAI();
  const [captureStatus, setCaptureStatus] = useState('');

  useEffect(() => {
    // Set up event listener for screen capture shortcut
    if (window.electron) {
      console.log('Setting up screen capture trigger in MainApp');
      const unsubscribe = window.electron.onScreenCaptureTrigger(() => {
        console.log('Screen capture trigger received in MainApp');
        handleScreenCapture();
      });

      // Cleanup function
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  const handleScreenCapture = async () => {
    if (!settings.enableScreen) {
      setCaptureStatus('Screen capture is disabled in settings');
      return;
    }

    if (!isElectron) {
      setCaptureStatus('For full functionality, please run as an Electron app');
      return;
    }
    
    setCaptureStatus('Capturing screen...');
    console.log('Starting screen capture process');
    
    try {
      if (window.electron) {
        console.log('Calling electron.captureScreen');
        const result = await window.electron.captureScreen();
        console.log('Screen capture result:', result);
        
        if (result.success) {
          setCaptureStatus('Processing captured text...');
          console.log('Processing captured text with OpenAI');
          // Feed suggestions for other windows
          await processScreenContent(result.text);
          // Auto‑analyze and respond in chat overlay
          analyzeScreenAndRespond(result.text);
          setCaptureStatus('Suggestions ready in overlay window');
        } else {
          setCaptureStatus(`Capture failed: ${result.error}`);
          console.error('Screen capture failed:', result.error);
        }
      } else {
        setCaptureStatus('Electron API not available');
        console.error('Electron API not available');
      }
    } catch (err) {
      console.error('Screen capture error:', err);
      setCaptureStatus(`Error: ${err.message}`);
    }
  };

  // Handle audio capture trigger
  const handleAudioCapture = async () => {
    if (!settings.enableAudio) {
      setCaptureStatus('Audio transcription is disabled in settings');
      return;
    }
    if (!isElectron) {
      setCaptureStatus('Please run as an Electron app to capture audio');
      return;
    }
    setCaptureStatus('Recording audio for 5 seconds...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();
      await new Promise((res) => setTimeout(res, 5000));
      recorder.stop();
      await new Promise((res) => (recorder.onstop = res));
      setCaptureStatus('Transcribing audio...');
      const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
      const file = new File([blob], 'audio.webm', { type: blob.type });
      const openaiClient = new OpenAI({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
      const transcriptRes = await openaiClient.audio.transcriptions.create({ file, model: 'whisper-1' });
      const transcription = transcriptRes.text;
      setCaptureStatus('Sending transcript to chat...');
      await sendChatMessage(transcription);
      setCaptureStatus('Audio chat sent');
    } catch (err) {
      console.error('Audio capture error:', err);
      setCaptureStatus(`Audio error: ${err.message}`);
    }
  };

  // Subscribe to audio capture shortcut
  useEffect(() => {
    if (!window.electron?.onAudioCaptureTrigger) return;
    const unsub = window.electron.onAudioCaptureTrigger(() => handleAudioCapture());
    return unsub;
  }, [settings.enableAudio]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Cluely</h1>
        <p className="text-gray-600">Your discreet AI-powered desktop assistant</p>
      </header>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
        
        <div className="mb-4">
          <p className="mb-2"><strong>Screen Capture:</strong> Press <code>Cmd+Shift+Space</code> (Mac) or <code>Ctrl+Shift+Space</code> (Windows/Linux)</p>
          <p className="mb-2"><strong>Toggle Overlay:</strong> Press <code>Cmd+Shift+O</code> (Mac) or <code>Ctrl+Shift+O</code> (Windows/Linux)</p>
          <p className="mb-2"><strong>Toggle Interactive Mode:</strong> Press <code>Cmd+Shift+I</code> (Mac) or <code>Ctrl+Shift+I</code> (Windows/Linux)</p>
          <p className="mb-2"><strong>Audio Capture:</strong> Press <code>Cmd+Shift+A</code> (Mac) or <code>Ctrl+Shift+A</code> (Windows/Linux)</p>
        </div>
        
        <div className="flex space-x-4">
          <button 
            onClick={handleScreenCapture}
            disabled={isProcessing}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Test Screen Capture'}
          </button>
          <button 
            onClick={handleAudioCapture}
            disabled={isProcessing}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Test Audio Capture'}
          </button>
          <Link 
            to="/settings" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
          >
            Settings
          </Link>
        </div>
        
        {captureStatus && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            {captureStatus}
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {!isElectron && (
          <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded">
            <p><strong>Note:</strong> You're currently running in a browser environment. For full functionality (screen capture, overlay, etc.), please run as an Electron app using <code>npm run dev</code> in your terminal.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Status</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>API Key:</strong> {settings.apiKey ? '✅ Configured' : '❌ Not configured'}</p>
            <p><strong>Model:</strong> {settings.modelName}</p>
          </div>
          <div>
            <p><strong>Screen Capture:</strong> {settings.enableScreen ? '✅ Enabled' : '❌ Disabled'}</p>
            <p><strong>Audio Transcription:</strong> {settings.enableAudio ? '✅ Enabled' : '❌ Disabled'}</p>
            <p><strong>Electron Mode:</strong> {isElectron ? '✅ Active' : '❌ Browser Preview'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainApp;
