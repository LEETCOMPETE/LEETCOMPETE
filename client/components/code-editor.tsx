'use client';

import React from 'react';
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
}

export function CodeEditor({ value, onChange, language }: CodeEditorProps) {
  const monacoLanguage =
    language === 'python'
      ? 'python'
      : language === 'cpp'
      ? 'cpp'
      : language === 'java'
      ? 'java'
      : 'javascript';

  return (
    <div className="h-full min-h-[380px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <MonacoEditor
        height="380px"
        language={monacoLanguage}
        theme="vs-dark"
        value={value}
        onChange={onChange}
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
  );
}
