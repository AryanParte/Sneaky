import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const HistoryModal = ({ history, isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Session History</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No history yet</p>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={index} className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-gray-200 whitespace-pre-wrap">{item}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal; 