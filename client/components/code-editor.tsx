'use client';

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[350px] w-full bg-slate-950 flex items-center justify-center font-mono text-xs text-slate-500 border border-slate-800 rounded-xl">
      Loading Code Editor...
    </div>
  ),
});

interface CodeEditorProps {
  value: string;
  onChange: (val: string | undefined) => void;
  language: string;
  vimMode?: boolean;
  onToggleVimMode?: (enabled: boolean) => void;
}

export function CodeEditor({
  value,
  onChange,
  language,
  vimMode: externalVimMode,
  onToggleVimMode,
}: CodeEditorProps) {
  const [internalVimMode, setInternalVimMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInternalVimMode(localStorage.getItem('leetcompete_vim_mode') === 'true');
    }
  }, []);

  const isVimEnabled = externalVimMode !== undefined ? externalVimMode : internalVimMode;

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const statusNodeRef = useRef<HTMLDivElement>(null);
  const vimAdapterRef = useRef<any>(null);

  const monacoLanguage =
    language === 'python'
      ? 'python'
      : language === 'cpp'
      ? 'cpp'
      : language === 'java'
      ? 'java'
      : 'javascript';

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (typeof window !== 'undefined' && monaco) {
      (window as any).monaco = monaco;
    }
    attachVim(editor, isVimEnabled);
  };

  const loadVimScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }
      if ((window as any).MonacoVim) {
        resolve();
        return;
      }
      const existingScript = document.getElementById('monaco-vim-script');
      if (existingScript) {
        if ((window as any).MonacoVim) {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve());
        }
        return;
      }
      const script = document.createElement('script');
      script.id = 'monaco-vim-script';
      script.src = '/monaco-vim.js';
      script.onload = () => resolve();
      script.onerror = () => {
        // Fallback to jsDelivr CDN if local asset fails
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://cdn.jsdelivr.net/npm/monaco-vim/dist/monaco-vim.js';
        fallbackScript.onload = () => resolve();
        fallbackScript.onerror = (err) => reject(err);
        document.body.appendChild(fallbackScript);
      };
      document.body.appendChild(script);
    });
  };

  const attachVim = async (editor: any, enabled: boolean) => {
    if (typeof window === 'undefined' || !editor) return;

    if (vimAdapterRef.current) {
      try {
        vimAdapterRef.current.dispose();
      } catch (e) {}
      vimAdapterRef.current = null;
    }

    if (enabled) {
      try {
        if (monacoRef.current && !(window as any).monaco) {
          (window as any).monaco = monacoRef.current;
        }

        await loadVimScript();

        if (monacoRef.current && !(window as any).monaco) {
          (window as any).monaco = monacoRef.current;
        }

        if (editorRef.current && statusNodeRef.current && (window as any).MonacoVim) {
          vimAdapterRef.current = (window as any).MonacoVim.initVimMode(
            editorRef.current,
            statusNodeRef.current
          );
        }
      } catch (err) {
        console.error('Failed to load Vim mode:', err);
      }
    }
  };

  const handleToggleVim = () => {
    const next = !isVimEnabled;
    if (onToggleVimMode) {
      onToggleVimMode(next);
    } else {
      setInternalVimMode(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('leetcompete_vim_mode', String(next));
      }
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      attachVim(editorRef.current, isVimEnabled);
    }
    return () => {
      if (vimAdapterRef.current) {
        try {
          vimAdapterRef.current.dispose();
        } catch (e) {}
        vimAdapterRef.current = null;
      }
    };
  }, [isVimEnabled]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-0.5">
        <div className="flex items-center space-x-2">
          <span className="text-slate-300 font-bold uppercase">{language} IDE</span>
        </div>
        <button
          type="button"
          onClick={handleToggleVim}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all border flex items-center space-x-1.5 ${
            isVimEnabled
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-sm'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Vim keybindings (hjkl, w, b, ci, dd, etc.)"
        >
          <span>Vim Motions:</span>
          <span className={isVimEnabled ? 'text-amber-400 font-extrabold' : 'text-slate-500'}>
            {isVimEnabled ? 'ON 🟢' : 'OFF ⚪'}
          </span>
        </button>
      </div>

      <div className="h-full min-h-[380px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex flex-col">
        <div className="flex-1 min-h-[350px]">
          <MonacoEditor
            height="350px"
            language={monacoLanguage}
            theme="vs-dark"
            value={value}
            onChange={onChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "var(--font-mono), monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              lineNumbersMinChars: 3,
            }}
          />
        </div>

        {/* Vim Status Bar Node */}
        {isVimEnabled && (
          <div
            ref={statusNodeRef}
            className="px-3 py-1 bg-[#090D16] border-t border-slate-800/80 font-mono text-[11px] text-amber-400 flex items-center min-h-[26px]"
          />
        )}
      </div>
    </div>
  );
}
