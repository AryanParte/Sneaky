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
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-full border border-white/10 px-6 py-3 text-sm tracking-widest uppercase text-slate-300/80">
          Preparing Sneaky...
        </div>
      </div>
    );
  }

  const shortcuts = [
    {
      label: 'Toggle overlay',
      combo: 'Cmd + Shift + O',
      alt: 'Ctrl + Shift + O',
      description: 'Reveal the floating command surface.'
    },
    {
      label: 'Interactive mode',
      combo: 'Cmd + Shift + I',
      alt: 'Ctrl + Shift + I',
      description: 'Switch between click-through and interactive modes.'
    },
    {
      label: 'Screen capture',
      combo: 'Cmd + Shift + Space',
      alt: 'Ctrl + Shift + Space',
      description: 'Snapshot the active window and get instant notes.'
    },
    {
      label: 'Audio capture',
      combo: 'Cmd + Shift + A',
      alt: 'Ctrl + Shift + A',
      description: 'Summarise the last few seconds of conversation.'
    }
  ];

  const statusItems = [
    {
      label: 'API key',
      value: settings.apiKey ? 'Configured' : 'Missing',
      state: settings.apiKey
    },
    {
      label: 'Model',
      value: settings.modelName,
      state: true
    },
    {
      label: 'Screen capture',
      value: settings.enableScreen ? 'Enabled' : 'Disabled',
      state: settings.enableScreen
    },
    {
      label: 'Audio transcription',
      value: settings.enableAudio ? 'Enabled' : 'Disabled',
      state: settings.enableAudio
    },
    {
      label: 'Electron mode',
      value: isElectron ? 'Running natively' : 'Browser preview',
      state: isElectron
    }
  ];

  const cardClass = 'rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0px_25px_60px_-25px_rgba(15,23,42,0.45)]';
  const pillClass = 'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.4em] text-slate-300/80';

  return (
    <div className="min-h-screen px-4 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-6">
            <span className={pillClass}>Sneaky</span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-slate-100 md:text-5xl">
                A minimal co-pilot that stays out of the way.
              </h1>
              <p className="max-w-xl text-base text-slate-400">
                Trigger Sneaky from anywhere, capture context quietly, and surface the answers you need without breaking focus.
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/10 px-5 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/20"
          >
            Open Settings
          </Link>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className={`${cardClass} p-6 md:p-8 space-y-8`}>
            <div className="space-y-2">
              <div className="space-y-4 sm:space-y-5">
                <div className="sm:flex sm:flex-col">
                  <h2 className="text-xl font-medium text-slate-100">Quick actions</h2>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Run a dry run or use a shortcut to call Sneaky instantly.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <button
                    onClick={handleScreenCapture}
                    disabled={isProcessing}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/20 px-6 text-sm font-medium text-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-sky-500/30 whitespace-nowrap"
                  >
                    {isProcessing ? 'Processing...' : 'Test screen capture'}
                  </button>
                  <button
                    onClick={handleAudioCapture}
                    disabled={isProcessing}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/20 px-6 text-sm font-medium text-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-indigo-500/30 whitespace-nowrap"
                  >
                    {isProcessing ? 'Processing...' : 'Test audio capture'}
                  </button>
                </div>
              </div>
            </div>

            {captureStatus && (
              <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-slate-100">
                {captureStatus}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            {!isElectron && (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-400/20 px-4 py-3 text-sm text-slate-900">
                <strong>Heads up:</strong> Sneaky runs best inside the desktop app. Launch with <code className="rounded bg-slate-900/80 px-1 py-0.5 text-xs text-slate-200">npm run dev</code> to unlock captures and overlays.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {shortcuts.map((item) => (
                <div
                  key={item.label}
                  className="group rounded-2xl border border-white/5 bg-slate-950/30 p-4 transition hover:border-white/15 hover:bg-slate-950/50"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400/80">
                    {item.label}
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-200">
                    <div className="font-medium text-slate-100">{item.combo}</div>
                    <div className="text-slate-400">{item.alt}</div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div>
              <h2 className="text-xl font-medium text-slate-100">Status</h2>
              <p className="mt-1 text-sm text-slate-500">Keep your basics in a good state for instant responses.</p>
            </div>
            <div className="space-y-4">
              {statusItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/30 px-4 py-3"
                >
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-slate-400/80">{item.label}</div>
                    <div className="mt-1 text-sm font-medium text-slate-100">{item.value}</div>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full ${item.state ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MainApp;
