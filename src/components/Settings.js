import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
  const { settings, updateSettings, isLoading, isElectron } = useSettings();
  const [formValues, setFormValues] = useState({...settings});
  const [saveStatus, setSaveStatus] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues({
      ...formValues,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRangeChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: parseFloat(value)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await updateSettings(formValues);
      setSaveStatus('Settings saved successfully!');
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (error) {
      setSaveStatus(`Error saving settings: ${error.message}`);
    }
  };

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          <Link to="/" className="text-blue-500 hover:text-blue-700">
            Back to Main
          </Link>
        </div>
      </header>

      {!isElectron && (
        <div className="mb-6 p-4 bg-yellow-100 text-yellow-700 rounded">
          <p><strong>Note:</strong> You're currently running in a browser environment. Settings will be saved in browser storage but won't persist when you run the Electron app.</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
            
            <div className="form-group">
              <label htmlFor="apiKey" className="form-label">
                OpenAI API Key
              </label>
              <input
                type="password"
                id="apiKey"
                name="apiKey"
                value={formValues.apiKey}
                onChange={handleChange}
                className="form-input"
                placeholder="sk-..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Your API key is stored locally and never sent to our servers.
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="modelName" className="form-label">
                AI Model
              </label>
              <select
                id="modelName"
                name="modelName"
                value={formValues.modelName}
                onChange={handleChange}
                className="form-select"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Input Settings</h2>
            
            <div className="form-group">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableScreen"
                  name="enableScreen"
                  checked={formValues.enableScreen}
                  onChange={handleChange}
                  className="form-checkbox"
                />
                <label htmlFor="enableScreen" className="ml-2">
                  Enable Screen Capture
                </label>
              </div>
              {!isElectron && formValues.enableScreen && (
                <p className="text-xs text-orange-500 mt-1">
                  Screen capture requires the Electron app to function.
                </p>
              )}
            </div>
            
            <div className="form-group">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableAudio"
                  name="enableAudio"
                  checked={formValues.enableAudio}
                  onChange={handleChange}
                  className="form-checkbox"
                />
                <label htmlFor="enableAudio" className="ml-2">
                  Enable Audio Transcription (Experimental)
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Note: Audio transcription requires additional permissions.
              </p>
              {!isElectron && formValues.enableAudio && (
                <p className="text-xs text-orange-500 mt-1">
                  Audio transcription requires the Electron app to function.
                </p>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Appearance</h2>
            
            <div className="form-group">
              <label htmlFor="opacity" className="form-label">
                Overlay Opacity: {formValues.opacity}
              </label>
              <input
                type="range"
                id="opacity"
                name="opacity"
                min="0.1"
                max="1"
                step="0.1"
                value={formValues.opacity}
                onChange={handleRangeChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Transparent</span>
                <span>Opaque</span>
              </div>
              {!isElectron && (
                <p className="text-xs text-orange-500 mt-1">
                  Overlay requires the Electron app to function.
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Save Settings
            </button>
            
            {saveStatus && (
              <div className={`text-sm ${saveStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                {saveStatus}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
