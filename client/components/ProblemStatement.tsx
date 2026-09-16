'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ProblemStatementProps {
  content: string;
  className?: string;
  section?: 'all' | 'main' | 'note';
}

export function ProblemStatement({ content, className = '', section = 'all' }: ProblemStatementProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to filter content based on requested section (main or note)
  const getSectionContent = (rawContent: string, mode: 'all' | 'main' | 'note') => {
    if (!rawContent || mode === 'all') return rawContent;

    const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);

    if (isHtml) {
      if (typeof window === 'undefined') {
        if (mode === 'main') {
          return rawContent.replace(/<div class="note">[\s\S]*?<\/div>/gi, '');
        } else {
          const match = rawContent.match(/<div class="note">[\s\S]*?<\/div>/gi);
          return match ? match.join('') : '';
        }
      }
      
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawContent, 'text/html');
        const noteEl = doc.querySelector('.note');

        if (mode === 'note') {
          return noteEl ? noteEl.outerHTML : '';
        } else {
          if (noteEl) {
            noteEl.remove();
          }
          return doc.body.innerHTML;
        }
      } catch (e) {
        return rawContent;
      }
    } else {
      // Plain text / Markdown
      const noteIndex = rawContent.search(/###\s*Note/i);
      if (noteIndex === -1) {
        return mode === 'main' ? rawContent : '';
      }
      if (mode === 'main') {
        return rawContent.slice(0, noteIndex).trim();
      } else {
        return rawContent.slice(noteIndex).trim();
      }
    }
  };

  const targetContent = getSectionContent(content, section);

  useEffect(() => {
    if (!containerRef.current || !targetContent) return;

    // Render KaTeX for any inline $...$ or display $$...$$ math inside text nodes
    const node = containerRef.current;
    
    const treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (treeWalker.nextNode()) {
      const textNode = treeWalker.currentNode as Text;
      if (textNode.nodeValue && textNode.nodeValue.includes('$')) {
        textNodes.push(textNode);
      }
    }

    textNodes.forEach((textNode) => {
      const val = textNode.nodeValue || '';
      if (!val.includes('$')) return;

      const spanWrapper = document.createElement('span');
      const parts = val.split(/(\$\$.*?\$\$|\$.*?\$)/g);
      
      parts.forEach((part) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const math = part.slice(2, -2).trim();
          try {
            const katexHtml = katex.renderToString(math, { displayMode: true, throwOnError: false });
            const mSpan = document.createElement('span');
            mSpan.className = 'block my-2 overflow-x-auto text-center text-slate-900 dark:text-white';
            mSpan.innerHTML = katexHtml;
            spanWrapper.appendChild(mSpan);
          } catch (e) {
            spanWrapper.appendChild(document.createTextNode(part));
          }
        } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1).trim();
          try {
            const katexHtml = katex.renderToString(math, { displayMode: false, throwOnError: false });
            const mSpan = document.createElement('span');
            mSpan.className = 'inline-block mx-0.5 text-amber-700 dark:text-amber-300 font-semibold';
            mSpan.innerHTML = katexHtml;
            spanWrapper.appendChild(mSpan);
          } catch (e) {
            spanWrapper.appendChild(document.createTextNode(part));
          }
        } else if (part) {
          spanWrapper.appendChild(document.createTextNode(part));
        }
      });

      if (textNode.parentNode) {
        textNode.parentNode.replaceChild(spanWrapper, textNode);
      }
    });
  }, [targetContent]);

  if (!targetContent) {
    return null;
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(targetContent);

  if (isHtml) {
    return (
      <div
        ref={containerRef}
        className={`cf-statement-container font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: targetContent }}
      />
    );
  }

  return (
    <div ref={containerRef} className={`space-y-3 font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed ${className}`}>
      {targetContent.split('\n\n').map((paragraph, idx) => {
        const trimmed = paragraph.trim();
        if (trimmed.startsWith('### ')) {
          const heading = trimmed.replace('### ', '');
          return (
            <h4 key={idx} className="text-amber-600 dark:text-amber-400 font-mono font-bold text-xs pt-3 pb-1 border-b border-slate-200 dark:border-slate-800/80 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>{heading}</span>
            </h4>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed">
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}
