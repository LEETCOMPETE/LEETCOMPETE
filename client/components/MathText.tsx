'use client';

import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className = '' }: MathTextProps) {
  if (!text) return null;

  // Split text into normal text and math delimiters ($...$ or $$...$$)
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
            return (
              <span
                key={idx}
                className="block my-2 overflow-x-auto text-center font-serif text-white"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <code key={idx} className="font-mono text-amber-400">{math}</code>;
          }
        } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
            return (
              <span
                key={idx}
                className="inline-block mx-0.5 text-amber-200 font-serif text-[0.95em]"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <code key={idx} className="font-mono text-amber-400">{math}</code>;
          }
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}
