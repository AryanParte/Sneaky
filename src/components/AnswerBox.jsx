import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const AnswerBox = ({ markdown }) => {
  if (!markdown) return null;
  
  return (
    <div
      className="
        mt-2 p-4 bg-gray-800/80 rounded-lg shadow-lg
        overflow-y-auto                /* scroll only when needed   */
        max-h-[calc(100vh-8rem)]       /* never exceed viewport     */
        transition-all duration-200
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          p: ({node, ...props}) => <p className="text-gray-200 mb-2" {...props} />,
          li: ({node, ...props}) => <li className="text-gray-200 ml-4 mb-1 list-disc" {...props} />,
          ul: ({node, ...props}) => <ul className="mb-2" {...props} />,
          code: ({node, inline, className, children, ...props}) => {
            const content = String(children).trim();
            if (inline) {
              return (
                <code className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded" {...props}>
                  {content}
                </code>
              );
            }
            return (
              <pre className="bg-gray-900 text-white text-sm p-3 rounded-lg overflow-x-auto my-2">
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