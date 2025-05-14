import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAI } from '../contexts/AIContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const Overlay = () => {
  const { settings } = useSettings();
  const { isProcessing, error, chatHistory, sendChatMessage, isChatProcessing } = useAI();
  const [isInteractive, setIsInteractive] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Log chat history size 
  console.log('[Overlay Component] Rendering with chat messages:', chatHistory.length);

  // Set opacity based on settings
  const overlayStyle = {
    opacity: settings.opacity
  };

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
    // Auto‑scroll to bottom when messages update
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatProcessing]);

  const handleCopyToClipboard = async (text) => {
    if (window.electron) {
      try {
        await window.electron.copyToClipboard(text);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 p-4 flex justify-center items-start pointer-events-auto"
    >
      <div
        className="w-full max-w-2xl flex flex-col h-full shadow-2xl rounded-2xl border border-gray-400/30"
        style={{
          ...overlayStyle,
          WebkitAppRegion: 'drag',
          background: 'rgba(36, 37, 46, 0.68)', // ChatGPT-like gray with translucency
          backdropFilter: 'blur(16px) saturate(180%)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
          border: '1.5px solid rgba(255,255,255,0.12)'
        }}
      >
        <div className="flex flex-col h-full">
          {isProcessing && (
            <div className="text-white text-center py-2"> Processing… </div>
          )}
          {error && (
            <div className="text-red-300 text-sm py-2"> {error} </div>
          )}
          {chatHistory.length === 0 && (
            <div className="text-gray-400 text-xs text-center py-4">
              Type a message to start a conversation...
            </div>
          )}
          
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden mt-2 px-4 py-2 space-y-3" style={{ WebkitAppRegion: 'no-drag' }}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} min-w-0`}> 
                <div className={`max-w-[75%] min-w-0 break-words whitespace-pre-wrap px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}> 
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    components={{
                      p: ({node, ...props}) => <p className="break-words whitespace-pre-wrap" {...props} />, 
                      li: ({node, ...props}) => <li className="break-words whitespace-pre-wrap list-inside list-disc" {...props} />, 
                      code: ({node, inline, className, children, ...props}) => {
                        const content = String(children).trim();
                        // Single-line, short blocks render inline
                        if (!inline && !content.includes('\n') && content.length < 40) {
                          return (
                            <code className="bg-gray-800 text-white px-1 py-0.5 rounded" {...props}>
                              {content}
                            </code>
                          );
                        }
                        if (inline) {
                          return (
                            <code className="bg-gray-800 text-white px-1 py-0.5 rounded" {...props}>
                              {content}
                            </code>
                          );
                        }
                        return (
                          <pre className="bg-gray-900 text-white text-sm p-4 rounded-lg overflow-x-auto">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isChatProcessing && (
              <div className="flex justify-start min-w-0">
                <div className="max-w-[75%] min-w-0 break-words whitespace-pre-wrap px-4 py-2 rounded-xl bg-gray-200 text-gray-800 animate-pulse">
                  typing...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input mt-2 flex pointer-events-auto gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
            <input
              type="text"
              className="flex-1 bg-gray-700/70 text-white text-base px-4 py-3 rounded-lg outline-none placeholder-gray-300 border border-gray-500/20 focus:ring-2 focus:ring-blue-400 transition"
              placeholder="Type a message…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  sendChatMessage(chatInput);
                  setChatInput('');
                }
              }}
              style={{ WebkitAppRegion: 'no-drag' }}
            />
            <button
              className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg text-base font-semibold disabled:opacity-50 transition"
              disabled={!chatInput.trim()}
              onClick={() => {
                if (chatInput.trim()) {
                  sendChatMessage(chatInput);
                  setChatInput('');
                }
              }}
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              Send
            </button>
          </div>
          <div className="mt-1" />

          <div className="mt-auto">
            <div className="bg-black bg-opacity-50 p-2 flex flex-wrap justify-center gap-2">
              <button className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded-lg">
                Toggle Overlay: Ctrl/Cmd+Shift+O
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded-lg">
                Toggle Mode: Ctrl/Cmd+Shift+I
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded-lg">
                Move Overlay: Ctrl/Cmd+Shift+Arrows
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded-lg">
                Screen Capture: Ctrl/Cmd+Shift+Space
              </button>
            </div>
            <div className="text-gray-400 text-xs text-center mt-1">
              {isInteractive ? 'Interactive Mode' : 'View Mode'} • Cluely
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overlay;
