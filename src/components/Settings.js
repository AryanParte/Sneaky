import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { XMarkIcon } from '@heroicons/react/24/solid';

const Settings = ({ onClose }) => {
  const { settings, updateSettings, isElectron } = useSettings();

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              AI Model
            </label>
            <select
              value={settings.modelName}
              onChange={handleModelChange}
              className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-4o">GPT-4o (Recommended)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
            </select>
          </div>
          
          {/* Overlay Opacity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Overlay Opacity: {settings.opacity.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={settings.opacity}
              onChange={handleOpacityChange}
              className="w-full"
            />
          </div>
          
          {/* Audio Toggle */}
          <div className="flex items-center">
            <button
              onClick={handleToggleAudio}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.enableAudio ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.enableAudio ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="ml-3 text-sm text-gray-300">
              Enable Audio Transcription
            </span>
          </div>
          
          {/* Auto-capture Toggle */}
          <div className="flex items-center">
            <button
              onClick={handleToggleAutoCapture}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.autoCapture ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.autoCapture ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="ml-3 text-sm text-gray-300">
              Auto-capture Screen (Every 10s)
            </span>
          </div>
          
          {/* Environment Key Info */}
          <div className="mt-4 p-3 bg-gray-700/50 rounded-md">
            <p className="text-sm text-gray-300">
              API Key is loaded from your <code className="bg-gray-800 px-1 py-0.5 rounded">OPENAI_API_KEY</code> environment variable.
              Add this to your <code className="bg-gray-800 px-1 py-0.5 rounded">.env</code> file and restart the app.
            </p>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
