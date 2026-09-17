'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CodeEditor } from '@/components/code-editor';
import { ProblemStatement } from '@/components/ProblemStatement';
import {
  FileText,
  Send,
  History,
  Trophy,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Eye,
  FileCode,
  Upload
} from 'lucide-react';

const STARTER_CODE: Record<string, string> = {
  python: `import sys

def solve():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    # Write your solution here

if __name__ == "__main__":
    solve()
`,
  cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    // Write your solution here
    return 0;
}
`,
  java: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
    }
}
`,
  javascript: `const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8');
    // Write your solution here
}

solve();
`,
};

type ActiveTab = 'statement' | 'submit' | 'submissions';

export default function CodeforcesProblemPage() {
  const { id: contestId, pid: problemId } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('statement');
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Editor & Submission State
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>(STARTER_CODE.python);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pendingFileCodeRef = React.useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubDetail, setSelectedSubDetail] = useState<any>(null);

  const getProtocolText = (sub: any) => {
    if (!sub) return '';
    if (sub.judgement_protocol && sub.judgement_protocol.trim()) {
      return sub.judgement_protocol;
    }
    const verdictName = sub.verdict === 'WA' ? 'Wrong Answer' : sub.verdict === 'TLE' ? 'Time Limit Exceeded' : sub.verdict === 'RE' ? 'Runtime Error' : sub.verdict;
    const verdictCode = sub.verdict === 'WA' ? 'WRONG_ANSWER' : sub.verdict;

    const lines: string[] = ['→ Judgement Protocol'];

    if (sub.test_case_results && sub.test_case_results.length > 0) {
      for (let idx = 0; idx < sub.test_case_results.length; idx++) {
        const tc = sub.test_case_results[idx];
        const tcVerdict = tc.status === 'WA' ? 'WRONG_ANSWER' : tc.status === 'AC' ? 'OK' : tc.status;
        lines.push(`Test: #${idx + 1}, time: ${Math.round(tc.execution_time_ms || 0)} ms., memory: 0 KB, exit code: ${tc.status === 'AC' ? 0 : 1}, verdict: ${tcVerdict}`);
        
        if (tc.status !== 'AC') {
          if (tc.input_str !== undefined && tc.input_str !== null) {
            lines.push(`Input\n${tc.input_str}`);
          }
          if (tc.user_output !== undefined && tc.user_output !== null) {
            lines.push(`Output\n${(tc.user_output || '').trim()}`);
          }
          if (tc.expected_output !== undefined && tc.expected_output !== null) {
            lines.push(`Answer\n${(tc.expected_output || '').trim()}`);
          }
          const userOutStr = (tc.user_output || '').trim();
          const expOutStr = (tc.expected_output || '').trim();
          lines.push(`Checker Log\n${tc.error || (tc.status === 'WA' ? `wrong answer 1st numbers differ - expected: '${expOutStr}', found: '${userOutStr}'` : tc.status)}\n`);
          break;
        }
      }
    } else if (problem && problem.sample_test_cases && problem.sample_test_cases.length > 0) {
      const sample = problem.sample_test_cases[0];
      lines.push(`Test: #1, verdict: ${verdictCode}`);
      lines.push(`Input\n${sample.input || ''}`);
      lines.push(`Output\n`);
      lines.push(`Answer\n${(sample.expected_output || '').trim()}`);
      lines.push(`Checker Log\nwrong answer 1st numbers differ - expected: '${(sample.expected_output || '').trim()}', found: ''\n`);
    } else {
      lines.push(`Test: #1, verdict: ${verdictCode}`);
      lines.push(`Checker Log\nSubmission verdict: ${verdictName}\n`);
    }

    lines.push(`Submission verdict: ${verdictName}`);
    return lines.join('\n');
  };

  // File Upload Reader & Auto Language Detector
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        pendingFileCodeRef.current = content;
        
        let detectedLang = language;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'py') detectedLang = 'python';
        else if (['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'].includes(ext || '')) detectedLang = 'cpp';
        else if (ext === 'java') detectedLang = 'java';
        else if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) detectedLang = 'javascript';

        setLanguage(detectedLang);
        setCode(content);
        setUploadedFileName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleEditorChange = (val: string | undefined) => {
    const newContent = val ?? '';
    // Guard against Monaco model reset emitting empty string during language swap
    if (newContent === '' && pendingFileCodeRef.current && pendingFileCodeRef.current.trim().length > 0) {
      return;
    }
    if (pendingFileCodeRef.current && newContent !== pendingFileCodeRef.current) {
      pendingFileCodeRef.current = null;
    }
    setCode(newContent);
  };

  const handleClearUploadedFile = () => {
    setUploadedFileName('');
    pendingFileCodeRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCode(STARTER_CODE[language] || '');
  };

  // Copy Feedback State
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState('');

  const fetchProblemData = () => {
    if (!problemId) return;
    api.getProblem(problemId as string)
      .then((data) => setProblem(data))
      .catch((err) => {
        console.error(err);
        setErrorMsg(err.message || 'Access restricted.');
      })
      .finally(() => setLoading(false));
  };

  const fetchSubmissionsData = () => {
    if (!contestId || !problemId) return;
    setLoadingSubmissions(true);
    api.getSubmissions(contestId as string, user?.id, problemId as string)
      .then((data) => setSubmissions(data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingSubmissions(false));
  };

  useEffect(() => {
    fetchProblemData();
  }, [problemId]);

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissionsData();
    }
  }, [activeTab, contestId, problemId, user]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (!uploadedFileName && !pendingFileCodeRef.current && (!code || code === STARTER_CODE[language])) {
      setCode(STARTER_CODE[newLang] || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    const codeToSubmit = pendingFileCodeRef.current || code;

    if (!codeToSubmit || !codeToSubmit.trim()) {
      alert('Submission code cannot be empty. Please enter code or upload a valid file.');
      return;
    }

    setSubmitting(true);

    try {
      await api.submitCode({
        contest_id: Number(contestId),
        problem_id: Number(problemId),
        language,
        code: codeToSubmit,
      });
      // Switch to Submissions Tab Codeforces-style after submit
      setActiveTab('submissions');
      fetchSubmissionsData();
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInput = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center font-mono text-slate-400 animate-pulse bg-slate-900/50 rounded-2xl border border-slate-800">
        Loading problem statement...
      </div>
    );
  }

  if (errorMsg || !problem) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            🔒
          </div>
          <h2 className="text-xl font-bold font-mono text-white">Registration Required</h2>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            {errorMsg || 'You must be registered for this contest to view problems and submit solutions.'}
          </p>
          <div className="pt-2">
            <Link
              href={`/contests/${contestId}`}
              className="inline-block px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all"
            >
              Go to Contest & Register Team
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* CodeChef Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Link
            href={`/contests/${contestId}`}
            className="p-2 rounded bg-[#121620] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Back to Contest Problems"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-xs font-mono text-amber-400 font-bold">
              PROBLEM CODE: {problem.difficulty || 'START101'}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-sans text-white">
              {problem.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href={`/contests/${contestId}/leaderboard`}
            className="px-3.5 py-1.5 rounded bg-[#121620] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Ranklist</span>
          </Link>
        </div>
      </div>

      {/* CodeChef Tabs Navigation */}
      <div className="flex items-center space-x-1 border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('statement')}
          className={`px-4 py-2.5 transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'statement'
              ? 'border-amber-500 text-amber-400 bg-[#121620] font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Statement</span>
        </button>

        <button
          onClick={() => setActiveTab('submit')}
          className={`px-4 py-2.5 transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'submit'
              ? 'border-amber-500 text-amber-400 bg-[#121620] font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Submit & IDE</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2.5 transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'submissions'
              ? 'border-amber-500 text-amber-400 bg-[#121620] font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <History className="w-4 h-4" />
          <span>My Submissions</span>
          {submissions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400 font-mono">
              {submissions.length}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CODECHEF PROBLEM STATEMENT                        */}
      {/* ======================================================== */}
      {activeTab === 'statement' && (
        <div className="bg-[#121620] border border-slate-800 rounded-lg p-6 sm:p-8 space-y-6">
          
          {/* CodeChef Header Specifications Box */}
          <div className="bg-[#0B1120] border border-slate-800 rounded p-4 text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase">Time Limit</span>
              <span className="text-white font-bold">{problem.time_limit_ms / 1000} secs</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase">Memory Limit</span>
              <span className="text-white font-bold">256 MB</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase">Source Limit</span>
              <span className="text-white font-bold">50,000 Bytes</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase">Difficulty</span>
              <span className="text-amber-400 font-bold uppercase">{problem.difficulty || 'Easy'}</span>
            </div>
          </div>

          {/* Statement Content */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-sans text-white border-b border-slate-800 pb-2 uppercase tracking-wider">
              Problem Description
            </h3>
            <ProblemStatement content={problem.statement} section="main" />
          </div>

          {/* CodeChef Sample Test Cases */}
          {problem.sample_test_cases && problem.sample_test_cases.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold font-sans text-white border-b border-slate-800 pb-2 uppercase tracking-wider">
                Sample Test Cases
              </h3>

              {problem.sample_test_cases.map((tc: any, i: number) => (
                <div key={tc.id} className="border border-slate-800 rounded overflow-hidden font-mono text-xs">
                  {/* Sample Header */}
                  <div className="bg-[#0B1120] px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-300 font-bold">
                    <span>Sample Input {i + 1}</span>
                    <button
                      onClick={() => handleCopyInput(tc.input, i)}
                      className="hover:text-amber-400 text-[11px] flex items-center space-x-1 transition-colors"
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Input</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Input & Output Panels */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 bg-[#0B1120]">
                    <div className="p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Input</span>
                      <pre className="text-slate-200 font-mono text-xs whitespace-pre-wrap select-all bg-[#121620] p-2 rounded border border-slate-800">
                        {tc.input}
                      </pre>
                    </div>

                    <div className="p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Output</span>
                      <pre className="text-emerald-400 font-mono text-xs whitespace-pre-wrap select-all bg-[#121620] p-2 rounded border border-slate-800">
                        {tc.expected_output}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Problem Note Section (Placed after Sample Test Cases) */}
          <div className="pt-2">
            <ProblemStatement content={problem.statement} section="note" />
          </div>

          {/* Quick Submit CTA */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Ready to submit your code?</span>
            <button
              onClick={() => setActiveTab('submit')}
              className="px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>OPEN IDE & SUBMIT</span>
            </button>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CODEFORCES SUBMIT CODE                            */}
      {/* ======================================================== */}
      {activeTab === 'submit' && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center space-x-2">
                <Send className="w-4.5 h-4.5 text-emerald-400" />
                <span>Submit Solution &bull; {problem.title}</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Type your solution in the editor below or upload a source code file.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* File Upload Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".py,.cpp,.cc,.cxx,.c,.java,.js,.ts,.txt"
                  className="hidden"
                  id="code-file-upload"
                />
                <label
                  htmlFor="code-file-upload"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-emerald-400 font-mono text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload File</span>
                </label>
              </div>

              {/* Language Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-mono text-slate-400">Language:</label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono font-bold rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500"
                >
                  <option value="python">Python 3 (3.10)</option>
                  <option value="cpp">C++ 17 (GCC)</option>
                  <option value="java">Java 13 (OpenJDK)</option>
                  <option value="javascript">Node.js (JS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Uploaded File Status Banner */}
          {uploadedFileName && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-300">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>
                  Source code loaded from file: <strong className="text-white">{uploadedFileName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearUploadedFile}
                className="text-slate-400 hover:text-white p-1 transition-colors"
                title="Remove file attachment"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Full Code Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Source Code:</span>
              <button
                type="button"
                onClick={() => setCode(STARTER_CODE[language] || '')}
                className="hover:text-slate-200 text-[11px] flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Template</span>
              </button>
            </div>

            <CodeEditor
              value={code}
              onChange={handleEditorChange}
              language={language}
            />
          </div>

          {/* Submit Action Button */}
          <div className="pt-2 flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab('statement')}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-mono text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting & Testing...' : 'Submit Code'}</span>
            </button>
          </div>

        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CODEFORCES MY SUBMISSIONS STATUS TABLE            */}
      {/* ======================================================== */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-mono text-white flex items-center space-x-2">
              <History className="w-4.5 h-4.5 text-emerald-400" />
              <span>Submission Status & Verdict Log</span>
            </h2>
            <button
              onClick={fetchSubmissionsData}
              className="text-xs font-mono text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh History</span>
            </button>
          </div>

          {loadingSubmissions ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-xl border border-slate-800">
              Loading submission history...
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
              <p>You haven't submitted any code for this problem yet.</p>
              <button
                onClick={() => setActiveTab('submit')}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-mono text-xs font-bold"
              >
                Submit Code Now
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">When</th>
                      <th className="px-5 py-3.5">Team Name</th>
                      <th className="px-5 py-3.5">Language</th>
                      <th className="px-5 py-3.5">Verdict</th>
                      <th className="px-5 py-3.5">Score</th>
                      <th className="px-5 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 text-slate-300">
                          {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-5 py-4 font-semibold text-white">
                          {sub.team_name || sub.user_name || 'Participant'}
                        </td>
                        <td className="px-5 py-4 uppercase text-slate-400">
                          {sub.language}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded text-[11px] font-extrabold uppercase border inline-flex items-center space-x-1 ${
                              sub.verdict === 'AC'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {sub.verdict === 'AC' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            <span>{sub.verdict === 'AC' ? 'Accepted' : sub.verdict === 'WA' ? 'Wrong Answer' : sub.verdict}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-white">
                          {sub.score} / 100
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          {sub.verdict !== 'AC' && (
                            <button
                              onClick={() => setSelectedSubDetail(sub)}
                              className="px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold inline-flex items-center space-x-1"
                              title="View Codeforces Judgement Protocol & Checker Logs"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              <span>Protocol Log</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSubDetail(sub)}
                            className="px-3 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-semibold inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submission Details Modal */}
      {selectedSubDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 font-mono text-sm font-bold text-white">
                <FileCode className="w-4.5 h-4.5 text-emerald-400" />
                <span>Submission #{selectedSubDetail.id} Details</span>
              </div>
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block">Verdict</span>
                <span className={`font-bold ${selectedSubDetail.verdict === 'AC' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedSubDetail.verdict === 'AC' ? 'Accepted' : selectedSubDetail.verdict === 'WA' ? 'Wrong Answer' : selectedSubDetail.verdict}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Language</span>
                <span className="text-slate-200 uppercase">{selectedSubDetail.language}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Score</span>
                <span className="text-white font-bold">{selectedSubDetail.score} pts</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Time</span>
                <span className="text-slate-400">{new Date(selectedSubDetail.submitted_at).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <span className="text-slate-400 font-bold block">Submitted Source Code:</span>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 overflow-x-auto text-xs max-h-60">
                {selectedSubDetail.code}
              </pre>
            </div>

            {selectedSubDetail.verdict !== 'AC' && (
              <div className="space-y-1.5 font-mono text-xs pt-2 border-t border-slate-800">
                <span className="text-amber-400 font-bold flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Judgement Protocol & Checker Logs</span>
                </span>
                <pre className="p-4 bg-[#0B1120] border border-slate-800 rounded-xl text-slate-300 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72">
                  {getProtocolText(selectedSubDetail)}
                </pre>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
