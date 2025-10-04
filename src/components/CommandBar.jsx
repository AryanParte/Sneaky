import React from 'react';
import { MicrophoneIcon, PencilIcon, ArrowPathIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';

const CommandBar = ({ 
  audioOn, 
  transcribing,
  isTextMode, 
  isInteractive,
  onAudioToggle, 
  onTextToggle, 
  onStartOver,
  onShowHistory,
  onQuit,
  onAsk,
  surfaceTone
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const containerStyle = surfaceTone
    ? {
        WebkitAppRegion: 'drag',
        backgroundColor: surfaceTone.background,
        border: `1px solid ${surfaceTone.border}`
      }
    : { WebkitAppRegion: 'drag' };

  const baseButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-100 transition focus:outline-none backdrop-blur';

  const baseButtonStyle = surfaceTone
    ? {
        border: `1px solid ${surfaceTone.border}`,
        backgroundColor: surfaceTone.background
      }
    : {};

  const tintedStyle = (border, background, text) => ({
    border,
    backgroundColor: background,
    color: text
  });

  const micButtonStyle = transcribing
    ? tintedStyle('1px solid rgba(252, 211, 77, 0.55)', 'rgba(252, 211, 77, 0.35)', '#92400e')
    : audioOn
      ? tintedStyle('1px solid rgba(248, 113, 113, 0.6)', 'rgba(248, 113, 113, 0.35)', '#7f1d1d')
      : baseButtonStyle;

  const textButtonStyle = isTextMode
    ? tintedStyle('1px solid rgba(125, 211, 252, 0.6)', 'rgba(186, 230, 253, 0.35)', '#0c4a6e')
    : baseButtonStyle;

  return (
    <div
      className="flex w-full items-center justify-between rounded-full px-3 py-2 text-slate-100 backdrop-blur-2xl"
      style={containerStyle}
    >
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onAudioToggle}
          className={baseButtonClass}
          title={transcribing ? 'Transcribing audio' : audioOn ? 'Mute mic capture' : 'Enable mic capture'}
          style={micButtonStyle}
        >
          <MicrophoneIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onTextToggle}
          className={baseButtonClass}
          title={isTextMode ? 'Hide text entry' : 'Show text entry'}
          style={textButtonStyle}
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onAsk}
          className="inline-flex items-center gap-2 rounded-full border border-slate-100/30 bg-slate-50/80 px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-white"
        >
          Ask
          <span className="hidden text-[0.65rem] uppercase tracking-[0.4em] text-slate-500 sm:inline">Cmd↩︎</span>
        </button>
      </div>

      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onStartOver}
          className={baseButtonClass}
          title="Clear reply"
          style={baseButtonStyle}
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>

        <div className="relative hidden sm:block">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className={baseButtonClass}
            title="More"
            style={baseButtonStyle}
          >
            <EllipsisVerticalIcon className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 z-10 mt-3 w-40 overflow-hidden rounded-2xl text-xs text-slate-100 backdrop-blur"
              style={{
                border: `1px solid ${surfaceTone?.border || 'rgba(255,255,255,0.2)'}`,
                backgroundColor: 'rgba(10, 12, 18, 0.65)'
              }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onShowHistory();
                }}
                className="block w-full px-4 py-2 text-left transition hover:bg-white/10"
              >
                History
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onQuit();
                }}
                className="block w-full px-4 py-2 text-left transition hover:bg-white/10"
              >
                Quit Sneaky
              </button>
            </div>
          )}
        </div>

        <div
          className={`flex h-9 items-center rounded-full px-3 text-[0.65rem] uppercase tracking-[0.35em] ${
            isInteractive ? 'text-emerald-200' : 'text-slate-200'
          }`}
          style={{
            border: `1px solid ${surfaceTone?.border || 'rgba(255,255,255,0.2)'}`,
            backgroundColor: surfaceTone?.background
          }}
        >
          {isInteractive ? 'Interact' : 'Ghost'}
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
