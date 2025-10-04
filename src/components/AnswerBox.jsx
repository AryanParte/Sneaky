import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const AnswerBox = ({ markdown, tone }) => {
  if (!markdown) return null;

  const surfaceStyle = tone
    ? {
        border: `1px solid ${tone.border}`,
        backgroundColor: tone.background
      }
    : {};

  return (
    <div
      className="
        mt-2 rounded-3xl p-5 text-sm text-slate-100 backdrop-blur-2xl
        overflow-y-auto max-h-[calc(100vh-8rem)] transition-all duration-200
      "
      style={surfaceStyle}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-slate-100/90" {...props} />,
          li: ({node, ...props}) => <li className="ml-5 mb-2 list-disc text-slate-100/90" {...props} />,
          ul: ({node, ...props}) => <ul className="mb-3 space-y-1" {...props} />,
          code: ({node, inline, className, children, ...props}) => {
            const content = String(children).trim();
            if (inline) {
              return <code className="rounded bg-slate-900/70 px-1.5 py-0.5 text-slate-200" {...props}>{content}</code>;
            }
            return (
              <pre
                className="my-3 overflow-x-auto rounded-2xl p-4 text-xs text-slate-900"
                style={{
                  border: `1px solid ${tone?.border || 'rgba(255,255,255,0.18)'}`,
                  backgroundColor: tone?.background || 'rgba(255,255,255,0.1)'
                }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          }
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default AnswerBox;
