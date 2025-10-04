import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { XMarkIcon } from '@heroicons/react/24/solid';

const Settings = ({ onClose }) => {
  const { settings, updateSettings, isElectron } = useSettings();
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate(-1);
  };

  const handleModelChange = (e) => {
    updateSettings({ modelName: e.target.value });
  };

  const handleOpacityChange = (e) => {
    updateSettings({ opacity: parseFloat(e.target.value) });
  };

  const handleToggleAudio = () => {
    updateSettings({ enableAudio: !settings.enableAudio });
  };

  const handleToggleAutoCapture = () => {
    updateSettings({ autoCapture: !settings.autoCapture });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur px-4 py-10 sm:py-12">
      <div className="w-full max-w-lg max-h-full overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-[0px_35px_80px_-40px_rgba(15,23,42,0.9)]">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] uppercase tracking-[0.35em] text-slate-300/80">
              Settings
            </span>
            <h2 className="text-2xl font-semibold text-slate-100">Tune Sneaky</h2>
            <p className="text-sm text-slate-400">
              Adjust how the overlay behaves and where your answers come from.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full border border-white/10 bg-white/10 p-2 text-slate-200 transition hover:border-white/20 hover:bg-white/20"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">
              AI model
            </label>
            <select
              value={settings.modelName}
              onChange={handleModelChange}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 transition focus:border-white/20 focus:outline-none"
            >
              <option value="gpt-4o">GPT-4o (Recommended)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">
                Overlay opacity
              </label>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                {settings.opacity.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={settings.opacity}
              onChange={handleOpacityChange}
              className="range accent-sky-400"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Capture modes</label>
            <div className="space-y-3">
              <button
                onClick={handleToggleAudio}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  settings.enableAudio
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-slate-100'
                    : 'border-white/10 bg-slate-950/60 text-slate-300'
                }`}
              >
                <span>Audio transcription</span>
                <span className="text-xs uppercase tracking-[0.3em]">
                  {settings.enableAudio ? 'On' : 'Off'}
                </span>
              </button>

              <button
                onClick={handleToggleAutoCapture}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  settings.autoCapture
                    ? 'border-sky-400/40 bg-sky-500/10 text-slate-100'
                    : 'border-white/10 bg-slate-950/60 text-slate-300'
                }`}
              >
                <span>Auto-capture screen (every 10s)</span>
                <span className="text-xs uppercase tracking-[0.3em]">
                  {settings.autoCapture ? 'On' : 'Off'}
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            <p>
              API key loads from the <code className="rounded bg-slate-900/80 px-1 py-0.5 text-xs text-slate-200">OPENAI_API_KEY</code> variable. Add it to <code className="rounded bg-slate-900/80 px-1 py-0.5 text-xs text-slate-200">.env</code> and restart Sneaky.
            </p>
            {!isElectron && (
              <p className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-xs text-slate-900">
                Native capture options unlock when you run the desktop app.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleClose}
            className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/10 px-5 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
