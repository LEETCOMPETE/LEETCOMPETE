'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Shield, Plus, Trash2, ArrowRight, Code2, PlusCircle, AlertCircle, CheckCircle2, Clock, Calendar, ExternalLink, FileJson, Upload, X } from 'lucide-react';

interface TestCaseInput {
  input: string;
  expected_output: string;
  is_sample: boolean;
}

interface ProblemInput {
  title: string;
  statement: string;
  time_limit_ms: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  test_cases: TestCaseInput[];
}

function parseTestCasesFromJSON(jsonText: string): TestCaseInput[] {
  let data: any;
  try {
    data = JSON.parse(jsonText);
  } catch (err: any) {
    throw new Error('Invalid JSON format: ' + err.message);
  }

  let items: any[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data.test_cases)) items = data.test_cases;
    else if (Array.isArray(data.tests)) items = data.tests;
    else if (Array.isArray(data.data)) items = data.data;
    else if (Array.isArray(data.samples)) items = data.samples;
    else items = [data];
  } else {
    throw new Error('JSON must be an array of test cases or an object containing test cases.');
  }

  const parsedCases: TestCaseInput[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const inputVal = item.input ?? item.in ?? item.stdin ?? item.input_str ?? '';
    const outputVal = item.expected_output ?? item.output ?? item.out ?? item.stdout ?? item.expected ?? '';
    const isSampleVal = Boolean(item.is_sample ?? item.sample ?? false);

    parsedCases.push({
      input: String(inputVal),
      expected_output: String(outputVal),
      is_sample: isSampleVal,
    });
  }

  if (parsedCases.length === 0) {
    throw new Error('No valid test cases found in JSON structure.');
  }

  return parsedCases;
}

function toLocalISOString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CreateContestPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Contest Metadata & Registration Window Initial States
  const now = new Date();
  const contestStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const contestEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours from now

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(toLocalISOString(contestStart));
  const [endTime, setEndTime] = useState(toLocalISOString(contestEnd));

  const [regStartTime, setRegStartTime] = useState(toLocalISOString(now));
  const [regEndTime, setRegEndTime] = useState(toLocalISOString(contestEnd));
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [maxTeamMembers, setMaxTeamMembers] = useState<string>('3');
  const [allowAllMembersSubmit, setAllowAllMembersSubmit] = useState<boolean>(true);
  const [showCheckerLogs, setShowCheckerLogs] = useState<boolean>(false);

  // Codeforces Import State
  const [cfUrl, setCfUrl] = useState('');
  const [cfImporting, setCfImporting] = useState(false);
  const [cfMsg, setCfMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Paste JSON Test cases Modal State
  const [jsonPasteModalProbIdx, setJsonPasteModalProbIdx] = useState<number | null>(null);
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonParseError, setJsonParseError] = useState('');

  // Problems Array
  const [problems, setProblems] = useState<ProblemInput[]>([
    {
      title: 'Sample Problem 1',
      statement: 'Given integers a and b, output their sum.',
      time_limit_ms: 2000,
      difficulty: 'Easy',
      test_cases: [
        { input: '3 5', expected_output: '8', is_sample: true },
        { input: '10 20', expected_output: '30', is_sample: false },
      ],
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user?.role !== 'organizer') {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <Shield className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold font-mono text-white">Organizer Access Only</h2>
          <p className="text-xs text-slate-400 font-sans">
            You must be logged in as an Organizer to create and manage contests.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-bold"
          >
            Log In as Organizer
          </Link>
        </div>
      </div>
    );
  }

  const handleImportCFProblem = async () => {
    if (!cfUrl.trim()) return;
    setCfImporting(true);
    setCfMsg(null);
    try {
      const parsed = await api.parseCodeforcesProblem(cfUrl.trim());
      const newProblem: ProblemInput = {
        title: parsed.title || 'Codeforces Problem',
        statement: parsed.statement || '',
        time_limit_ms: parsed.time_limit_ms || 2000,
        difficulty: (parsed.difficulty as any) || 'Medium',
        test_cases: (parsed.sample_tests || []).map((tc: any) => ({
          input: tc.input || '',
          expected_output: tc.expected_output || '',
          is_sample: true,
        })),
      };

      if (newProblem.test_cases.length === 0) {
        newProblem.test_cases.push({ input: '', expected_output: '', is_sample: true });
      }

      setProblems((prev) => [...prev, newProblem]);
      setCfMsg({
        type: 'success',
        text: `Successfully imported "${newProblem.title}" with ${newProblem.test_cases.length} sample test case(s)!`,
      });
      setCfUrl('');
    } catch (err: any) {
      setCfMsg({
        type: 'error',
        text: err.message || 'Failed to import problem from Codeforces URL.',
      });
    } finally {
      setCfImporting(false);
    }
  };

  const handleJSONFileUpload = (probIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedTCs = parseTestCasesFromJSON(text);

        const updated = [...problems];
        updated[probIndex].test_cases = [...updated[probIndex].test_cases, ...parsedTCs];
        setProblems(updated);
        alert(`Successfully imported ${parsedTCs.length} test case(s) from "${file.name}"!`);
      } catch (err: any) {
        alert('JSON Upload Error: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleApplyPastedJSON = (probIndex: number) => {
    setJsonParseError('');
    try {
      const parsedTCs = parseTestCasesFromJSON(rawJsonText);
      const updated = [...problems];
      updated[probIndex].test_cases = [...updated[probIndex].test_cases, ...parsedTCs];
      setProblems(updated);
      setJsonPasteModalProbIdx(null);
      setRawJsonText('');
    } catch (err: any) {
      setJsonParseError(err.message || 'Invalid JSON format');
    }
  };

  const handleAddProblem = () => {
    setProblems([
      ...problems,
      {
        title: `Problem ${problems.length + 1}`,
        statement: 'Write statement here...',
        time_limit_ms: 2000,
        difficulty: 'Medium',
        test_cases: [
          { input: '', expected_output: '', is_sample: true },
        ],
      },
    ]);
  };

  const handleRemoveProblem = (index: number) => {
    setProblems(problems.filter((_, i) => i !== index));
  };

  const handleProblemChange = (index: number, field: keyof ProblemInput, value: any) => {
    const updated = [...problems];
    updated[index] = { ...updated[index], [field]: value };
    setProblems(updated);
  };

  const handleAddTestCase = (probIndex: number) => {
    const updated = [...problems];
    updated[probIndex].test_cases.push({ input: '', expected_output: '', is_sample: false });
    setProblems(updated);
  };

  const handleRemoveTestCase = (probIndex: number, tcIndex: number) => {
    const updated = [...problems];
    updated[probIndex].test_cases = updated[probIndex].test_cases.filter((_, i) => i !== tcIndex);
    setProblems(updated);
  };

  const handleTestCaseChange = (
    probIndex: number,
    tcIndex: number,
    field: keyof TestCaseInput,
    value: any
  ) => {
    const updated = [...problems];
    updated[probIndex].test_cases[tcIndex] = {
      ...updated[probIndex].test_cases[tcIndex],
      [field]: value,
    };
    setProblems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const startD = new Date(startTime);
    const endD = new Date(endTime);
    const regStartD = new Date(regStartTime);
    const regEndD = new Date(regEndTime);

    if (endD <= startD) {
      setError('Contest End Time must be after Contest Start Time.');
      return;
    }

    if (regEndD <= regStartD) {
      setError('Registration Closes At must be after Registration Opens At.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Contest with Registration Window
      const contestRes = await api.createContest({
        title,
        description,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        registration_start_time: new Date(regStartTime).toISOString(),
        registration_end_time: new Date(regEndTime).toISOString(),
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        max_team_members: maxTeamMembers ? parseInt(maxTeamMembers, 10) : 3,
        allow_all_members_submit: allowAllMembersSubmit,
        show_checker_logs: showCheckerLogs,
      });

      // 2. Add Problems
      for (const p of problems) {
        await api.createProblem(contestRes.id, p);
      }

      router.push(`/contests/${contestRes.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create contest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-2 shadow-2xl">
        <div className="flex items-center space-x-3 text-amber-400">
          <Shield className="w-8 h-8" />
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white">
            Create Contest & Set Registration Window
          </h1>
        </div>
        <p className="text-xs text-slate-400 font-sans">
          Specify exact registration opening & closing windows, contest duration, and problem testcases.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Contest & Registration Window Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">1</span>
            <span>Contest & Registration Schedule</span>
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300">Contest Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Winter Code Sprint 2026"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300">Description & Rules</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Welcome to the contest! Teams will solve problem sets..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-sans text-white outline-none transition-all"
              />
            </div>

            {/* Contest Window */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Contest Competition Window</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-slate-400">Contest Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-slate-400">Contest End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Registration Window */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Allowed Participant Registration Window & Capacity</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-slate-400">Registration Opens At</label>
                  <input
                    type="datetime-local"
                    required
                    value={regStartTime}
                    onChange={(e) => setRegStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-slate-400">Registration Closes At</label>
                  <input
                    type="datetime-local"
                    required
                    value={regEndTime}
                    onChange={(e) => setRegEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-slate-300">
                    Contest Capacity (Max Registered Teams)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    placeholder="Optional (blank = unlimited)"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Max total registered teams allowed for contest.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-slate-300">
                    Max Team Members Allowed Per Team
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxTeamMembers}
                    onChange={(e) => setMaxTeamMembers(e.target.value)}
                    placeholder="Default: 3"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Maximum member input slots shown for registration.
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                <label className="text-[11px] font-mono font-semibold text-slate-300 block">
                  Submission Permissions (Who Can Submit Code Solutions)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setAllowAllMembersSubmit(true)}
                    className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      allowAllMembersSubmit
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="submissionPermission"
                      checked={allowAllMembersSubmit}
                      onChange={() => setAllowAllMembersSubmit(true)}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-mono font-bold text-emerald-400">All Team Members</div>
                      <div className="text-[10px] text-slate-400 font-sans">Any registered team member is allowed to submit solutions.</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setAllowAllMembersSubmit(false)}
                    className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      !allowAllMembersSubmit
                        ? 'bg-amber-500/10 border-amber-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="submissionPermission"
                      checked={!allowAllMembersSubmit}
                      onChange={() => setAllowAllMembersSubmit(false)}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-mono font-bold text-amber-400">Team Leader Only</div>
                      <div className="text-[10px] text-slate-400 font-sans">Only the designated team leader can submit code solutions.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                <label className="text-[11px] font-mono font-semibold text-slate-300 block">
                  Detailed Checker Protocol Logs (Codeforces Format)
                </label>
                <label
                  onClick={() => setShowCheckerLogs(!showCheckerLogs)}
                  className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    showCheckerLogs
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showCheckerLogs}
                    onChange={(e) => setShowCheckerLogs(e.target.checked)}
                    className="text-amber-500 focus:ring-amber-500 rounded border-slate-700 bg-slate-950"
                  />
                  <div>
                    <div className="text-xs font-mono font-bold text-amber-400">Show Checker Logs for Failed Submissions</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      If enabled, failed submissions (WA/TLE/RE) will reveal full Judgement Protocol logs, test case inputs, expected outputs, and checker logs.
                    </div>
                  </div>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Problems & Testcases Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">2</span>
              <span>Contest Problems ({problems.length})</span>
            </h2>

            <button
              type="button"
              onClick={handleAddProblem}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-xs font-bold transition-all flex items-center space-x-1.5 border border-emerald-500/30 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Blank Problem</span>
            </button>
          </div>

          {/* Codeforces Fast Problem Importer Box */}
          <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center space-x-2 text-blue-400 font-mono text-xs font-bold">
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>Direct Codeforces Problem Import</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Paste any Codeforces problem link below to automatically parse its title, HTML statement, LaTeX formulas, and sample test cases directly into this contest:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="url"
                value={cfUrl}
                onChange={(e) => setCfUrl(e.target.value)}
                placeholder="https://codeforces.com/problemset/problem/1234/A or /contest/1234/problem/A"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
              />
              <button
                type="button"
                onClick={handleImportCFProblem}
                disabled={cfImporting || !cfUrl.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {cfImporting ? (
                  <span>Fetching & Parsing...</span>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Import CF Problem</span>
                  </>
                )}
              </button>
            </div>
            {cfMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-mono border ${
                  cfMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                {cfMsg.text}
              </div>
            )}
          </div>

          {problems.map((prob, pIdx) => (
            <div
              key={pIdx}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-mono font-bold text-white text-base flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>Problem {String.fromCharCode(65 + pIdx)}</span>
                </h3>

                {problems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProblem(pIdx)}
                    className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Problem</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-slate-300">Problem Title</label>
                    <input
                      type="text"
                      required
                      value={prob.title}
                      onChange={(e) => handleProblemChange(pIdx, 'title', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-slate-300">Difficulty</label>
                    <select
                      value={prob.difficulty}
                      onChange={(e) => handleProblemChange(pIdx, 'difficulty', e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono font-bold rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300">Statement</label>
                  <textarea
                    required
                    rows={4}
                    value={prob.statement}
                    onChange={(e) => handleProblemChange(pIdx, 'statement', e.target.value)}
                    placeholder="Describe the problem, input format, and output format..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none"
                  />
                </div>

                {/* Test Cases Sub-section */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      Test Cases ({prob.test_cases.length})
                    </span>

                    <div className="flex items-center space-x-2">
                      {/* Upload JSON File Button */}
                      <label className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono font-bold cursor-pointer transition-all flex items-center space-x-1">
                        <Upload className="w-3 h-3" />
                        <span>Upload JSON File</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => handleJSONFileUpload(pIdx, e)}
                          className="hidden"
                        />
                      </label>

                      {/* Paste JSON Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setJsonPasteModalProbIdx(pIdx);
                          setRawJsonText('');
                          setJsonParseError('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold transition-all flex items-center space-x-1"
                      >
                        <FileJson className="w-3 h-3" />
                        <span>Paste JSON</span>
                      </button>

                      {/* Add Manual Testcase */}
                      <button
                        type="button"
                        onClick={() => handleAddTestCase(pIdx)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold transition-all flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Test Case</span>
                      </button>
                    </div>
                  </div>

                  {prob.test_cases.map((tc, tcIdx) => (
                    <div key={tcIdx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-400">Test Case #{tcIdx + 1}</span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.is_sample}
                              onChange={(e) => handleTestCaseChange(pIdx, tcIdx, 'is_sample', e.target.checked)}
                              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                            />
                            <span>Is Sample Example?</span>
                          </label>

                          {prob.test_cases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(pIdx, tcIdx)}
                              className="text-rose-400 text-[11px] hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Input Stdin</label>
                          <textarea
                            rows={2}
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange(pIdx, tcIdx, 'input', e.target.value)}
                            placeholder="Input data..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Expected Output Stdout</label>
                          <textarea
                            rows={2}
                            value={tc.expected_output}
                            onChange={(e) => handleTestCaseChange(pIdx, tcIdx, 'expected_output', e.target.value)}
                            placeholder="Expected stdout..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-emerald-400 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-base font-bold transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Shield className="w-5 h-5" />
          <span>{loading ? 'Publishing Contest & Schedule...' : 'Publish Contest with Schedule'}</span>
        </button>

      </form>

      {/* Paste JSON Testcases Modal */}
      {jsonPasteModalProbIdx !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold">
                <FileJson className="w-5 h-5" />
                <span className="text-base text-white">Import Test Cases from JSON</span>
              </div>
              <button
                type="button"
                onClick={() => setJsonPasteModalProbIdx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Paste JSON array of test cases or object containing test cases (supports property names <code className="text-slate-300">input/output/expected_output/is_sample</code>):
            </p>

            {jsonParseError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                ⚠️ {jsonParseError}
              </div>
            )}

            <textarea
              rows={8}
              value={rawJsonText}
              onChange={(e) => setRawJsonText(e.target.value)}
              placeholder={`[\n  {\n    "input": "5\\n2 9 8 2 7",\n    "expected_output": "2 3",\n    "is_sample": true\n  },\n  {\n    "input": "1\\n1",\n    "output": "1 0"\n  }\n]`}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs font-mono text-white outline-none resize-none"
            />

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setJsonPasteModalProbIdx(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyPastedJSON(jsonPasteModalProbIdx)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-all"
              >
                Parse & Add Test Cases
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
