import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const HistoryModal = ({ history, isOpen, onClose, tone }) => {
  if (!isOpen) return null;

  const panelBorder = tone?.border || 'rgba(255,255,255,0.15)';
  const panelBackground = tone?.background || 'rgba(255,255,255,0.12)';
  const itemBackground = tone
    ? `linear-gradient(145deg, rgba(10, 12, 18, 0.35), ${tone.background})`
    : 'rgba(255,255,255,0.15)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40">
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl text-slate-100 shadow-[0px_30px_70px_-30px_rgba(15,23,42,0.55)]"
        style={{
          border: `1px solid ${panelBorder}`,
          backgroundColor: panelBackground
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${panelBorder}` }}
        >
          <h2 className="text-lg font-medium">Session history</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-1.5 transition hover:bg-white/20"
            style={{
              border: `1px solid ${panelBorder}`,
              backgroundColor: tone?.background
            }}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(80vh-9rem)] overflow-y-auto px-6 py-5">
          {history.length === 0 ? (
            <p
              className="rounded-2xl border border-dashed py-10 text-center text-sm text-slate-300"
              style={{ borderColor: panelBorder }}
            >
              No history yet
            </p>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl p-4"
                  style={{
                    border: `1px solid ${panelBorder}`,
                    background: itemBackground
                  }}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200/90">{item}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex justify-end px-6 py-4"
          style={{ borderTop: `1px solid ${panelBorder}` }}
        >
          <button
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition hover:bg-white/20"
            style={{
              border: `1px solid ${panelBorder}`,
              backgroundColor: tone?.background
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
