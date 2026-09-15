'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Shield, Plus, Trash2, ArrowRight, Code2, PlusCircle, AlertCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';

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
                <span>Allowed Participant Registration Window</span>
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
            </div>

          </div>
        </div>

        {/* Problems & Testcases Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">2</span>
              <span>Problems ({problems.length})</span>
            </h2>

            <button
              type="button"
              onClick={handleAddProblem}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-xs font-bold transition-all flex items-center space-x-1.5 border border-emerald-500/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Problem</span>
            </button>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      Test Cases ({prob.test_cases.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddTestCase(pIdx)}
                      className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Test Case</span>
                    </button>
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
    </div>
  );
}
