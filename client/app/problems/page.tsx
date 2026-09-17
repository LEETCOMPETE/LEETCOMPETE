'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  FileCode,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Code2,
  Clock,
  CheckCircle2,
  Sparkles,
  X,
  PlusCircle,
  FileText,
  AlertCircle,
  Upload,
  Globe,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

interface TestCaseItem {
  input: string;
  expected_output: string;
  is_sample: boolean;
}

export default function ProblemsPage() {
  const { user } = useAuth();
  const isOrganizer = user?.role === 'organizer';

  const [problems, setProblems] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal state for Add/Edit Problem
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState<number | null>(null);

  const [formContestId, setFormContestId] = useState<string>(''); // '' means Standalone Practice Problem
  const [formIsPublished, setFormIsPublished] = useState<boolean>(true);
  const [formTitle, setFormTitle] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [formTimeLimit, setFormTimeLimit] = useState<number>(2000);
  const [formStatement, setFormStatement] = useState('');
  const [testCases, setTestCases] = useState<TestCaseItem[]>([
    { input: '', expected_output: '', is_sample: true }
  ]);
  const [modalError, setModalError] = useState('');
  const [savingProblem, setSavingProblem] = useState(false);

  // Modal state for Codeforces Import
  const [showCFModal, setShowCFModal] = useState(false);
  const [cfUrl, setCfUrl] = useState('');
  const [cfTargetContestId, setCfTargetContestId] = useState<string>('');
  const [cfImporting, setCfImporting] = useState(false);
  const [cfError, setCfError] = useState('');

  // JSON Import state within problem modal
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonParser, setShowJsonParser] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [problemsData, contestsData] = await Promise.all([
        api.getAllProblems(),
        api.getContests()
      ]);
      setProblems(problemsData);
      setContests(contestsData);
    } catch (err) {
      console.error('Failed to load problems or contests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOpenAddModal = () => {
    setEditingProblemId(null);
    setFormContestId(''); // Default to Standalone Practice Problem
    setFormIsPublished(true);
    setFormTitle('');
    setFormDifficulty('Medium');
    setFormTimeLimit(2000);
    setFormStatement('');
    setTestCases([{ input: '', expected_output: '', is_sample: true }]);
    setModalError('');
    setShowProblemModal(true);
  };

  const handleOpenEditModal = (prob: any) => {
    setEditingProblemId(prob.id);
    setFormContestId(prob.contest_id != null ? String(prob.contest_id) : '');
    setFormIsPublished(prob.is_published ?? true);
    setFormTitle(prob.title);
    setFormDifficulty(prob.difficulty || 'Medium');
    setFormTimeLimit(prob.time_limit_ms || 2000);
    setFormStatement(prob.statement || '');
    setModalError('');

    if (prob.all_test_cases && prob.all_test_cases.length > 0) {
      setTestCases(prob.all_test_cases.map((tc: any) => ({
        input: tc.input,
        expected_output: tc.expected_output,
        is_sample: tc.is_sample
      })));
    } else if (prob.sample_test_cases && prob.sample_test_cases.length > 0) {
      setTestCases(prob.sample_test_cases.map((tc: any) => ({
        input: tc.input,
        expected_output: tc.expected_output,
        is_sample: true
      })));
    } else {
      setTestCases([{ input: '', expected_output: '', is_sample: true }]);
    }

    setShowProblemModal(true);
  };

  const handleTogglePublish = async (prob: any) => {
    try {
      await api.updateProblem(prob.id, { is_published: !prob.is_published });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update problem status.');
    }
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', expected_output: '', is_sample: false }]);
  };

  const handleRemoveTestCase = (index: number) => {
    if (testCases.length === 1) return;
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: keyof TestCaseItem, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleParseJsonTestCases = async () => {
    if (!jsonInput.trim()) return;
    try {
      const res = await api.parseTestCasesJson(jsonInput.trim());
      if (res && res.test_cases) {
        setTestCases(res.test_cases);
        setShowJsonParser(false);
        setJsonInput('');
      }
    } catch (err: any) {
      alert(err.message || 'Invalid JSON format for test cases.');
    }
  };

  const handleSaveProblemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setModalError('Problem title is required.');
      return;
    }
    if (!formStatement.trim()) {
      setModalError('Problem statement description is required.');
      return;
    }

    setSavingProblem(true);
    setModalError('');

    try {
      const contestIdVal = formContestId.trim() ? Number(formContestId) : null;
      const isPublishedVal = contestIdVal === null ? true : formIsPublished;

      const payload = {
        title: formTitle.trim(),
        statement: formStatement.trim(),
        time_limit_ms: Number(formTimeLimit),
        difficulty: formDifficulty,
        contest_id: contestIdVal,
        is_published: isPublishedVal,
        test_cases: testCases.filter(tc => tc.input.trim() || tc.expected_output.trim())
      };

      if (editingProblemId) {
        await api.updateProblem(editingProblemId, payload);
      } else {
        await api.createProblemDirect(payload, contestIdVal);
      }

      setShowProblemModal(false);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save problem.');
    } finally {
      setSavingProblem(false);
    }
  };

  const handleDeleteProblem = async (prob: any) => {
    if (!window.confirm(`Are you sure you want to delete problem "${prob.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteProblem(prob.id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete problem.');
    }
  };

  const handleImportCFSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfUrl.trim()) return;
    setCfImporting(true);
    setCfError('');
    try {
      if (cfTargetContestId) {
        await api.importCodeforcesProblem(Number(cfTargetContestId), cfUrl.trim());
      } else {
        const parsed = await api.parseCodeforcesProblem(cfUrl.trim());
        const payload = {
          title: parsed.title,
          statement: parsed.statement,
          time_limit_ms: parsed.time_limit_ms || 2000,
          difficulty: parsed.difficulty || 'Medium',
          contest_id: null,
          is_published: true,
          test_cases: (parsed.sample_tests || []).map((st: any) => ({
            input: st.input,
            expected_output: st.expected_output,
            is_sample: true
          }))
        };
        await api.createProblemDirect(payload, null);
      }
      setShowCFModal(false);
      setCfUrl('');
      fetchData();
    } catch (err: any) {
      setCfError(err.message || 'Failed to import problem from Codeforces.');
    } finally {
      setCfImporting(false);
    }
  };

  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.statement.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDifficulty =
      selectedDifficulty === 'ALL' || p.difficulty.toUpperCase() === selectedDifficulty.toUpperCase();

    let matchesCategory = true;
    if (selectedCategory === 'STANDALONE') {
      matchesCategory = p.contest_id == null;
    } else if (selectedCategory === 'CONTEST') {
      matchesCategory = p.contest_id != null;
    } else if (selectedCategory !== 'ALL') {
      matchesCategory = String(p.contest_id) === String(selectedCategory);
    }

    return matchesSearch && matchesDifficulty && matchesCategory;
  });

  const standaloneCount = problems.filter(p => p.contest_id == null).length;
  const contestCount = problems.filter(p => p.contest_id != null).length;
  const easyCount = problems.filter(p => p.difficulty?.toLowerCase() === 'easy').length;
  const mediumCount = problems.filter(p => p.difficulty?.toLowerCase() === 'medium').length;
  const hardCount = problems.filter(p => p.difficulty?.toLowerCase() === 'hard').length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-semibold mb-1">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>STANDALONE PRACTICE BANK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            Problems & Practice Archive
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-2xl">
            A standalone problem repository for general practice. Live contest problems are kept strictly inside their respective contests until completed, after which admins can publish them here for public practice.
          </p>
        </div>

        {isOrganizer && (
          <div className="flex items-center space-x-2 self-start md:self-auto">
            <button
              onClick={() => {
                setCfError('');
                setCfUrl('');
                setShowCFModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>Import CF Problem</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Practice Problem</span>
            </button>
          </div>
        )}
      </div>

      {/* Metric Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Practice Problems</span>
          <div className="text-2xl font-bold font-mono text-white">{problems.length}</div>
          <span className="text-[10px] text-slate-500 font-mono">{standaloneCount} standalone, {contestCount} from contests</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-emerald-400 uppercase">Easy</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{easyCount}</div>
          <span className="text-[10px] text-slate-500 font-mono">Starter challenges</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-amber-400 uppercase">Medium</span>
          <div className="text-2xl font-bold font-mono text-amber-400">{mediumCount}</div>
          <span className="text-[10px] text-slate-500 font-mono">Core interview level</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-rose-400 uppercase">Hard</span>
          <div className="text-2xl font-bold font-mono text-rose-400">{hardCount}</div>
          <span className="text-[10px] text-slate-500 font-mono">Advanced algorithmic level</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search practice problems by title, topic, or statement keywords..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            {['ALL', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1 rounded-lg transition-colors font-bold whitespace-nowrap ${
                  selectedDifficulty === diff
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-cyan-500 max-w-full"
          >
            <option value="ALL">All Problems</option>
            <option value="STANDALONE">Standalone Practice Only</option>
            <option value="CONTEST">Published Contest Problems</option>
            {contests.map((c) => (
              <option key={c.id} value={c.id}>
                Contest: {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Problem Table / List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-2xl border border-slate-800">
          Loading practice problems archive...
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
          <p>No practice problems found in repository matching your filters.</p>
          {isOrganizer && (
            <button
              onClick={handleOpenAddModal}
              className="inline-block px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-mono text-xs font-bold"
            >
              Add First Practice Problem
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Problem Title</th>
                  <th className="px-5 py-3.5">Origin / Source</th>
                  <th className="px-5 py-3.5">Difficulty</th>
                  <th className="px-5 py-3.5">Time Limit</th>
                  <th className="px-5 py-3.5">Test Cases</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProblems.map((prob) => (
                  <tr key={prob.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-400">#{prob.id}</td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/contests/${prob.contest_id || 0}/problems/${prob.id}`}
                        className="font-bold text-white text-sm hover:text-cyan-400 transition-colors flex items-center space-x-2"
                      >
                        <span>{prob.title}</span>
                      </Link>
                      <div className="text-[11px] text-slate-400 font-sans line-clamp-1 mt-0.5">
                        {prob.statement?.substring(0, 100)}...
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {prob.contest_id ? (
                        <Link
                          href={`/contests/${prob.contest_id}`}
                          className="hover:underline text-amber-400 flex items-center space-x-1"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>{prob.contest_title || `Contest #${prob.contest_id}`}</span>
                        </Link>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                          🌐 Standalone Practice
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase ${
                          prob.difficulty?.toLowerCase() === 'easy'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : prob.difficulty?.toLowerCase() === 'hard'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {prob.difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{prob.time_limit_ms} ms</span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
                        {prob.test_cases_count} Case(s)
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/contests/${prob.contest_id || 0}/problems/${prob.id}`}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all inline-flex items-center space-x-1"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Solve</span>
                        </Link>

                        {isOrganizer && (
                          <>
                            <button
                              onClick={() => handleTogglePublish(prob)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1 ${
                                prob.is_published
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                              }`}
                              title={prob.is_published ? 'Click to unpublish from Practice section' : 'Click to publish to Practice section'}
                            >
                              {prob.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{prob.is_published ? 'Published' : 'Hidden'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(prob)}
                              className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all"
                              title="Edit Problem & Test Cases"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProblem(prob)}
                              className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all"
                              title="Delete Problem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Problem */}
      {showProblemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full my-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold">
                <FileCode className="w-5 h-5" />
                <span className="text-base text-white">
                  {editingProblemId ? `Edit Practice Problem #${editingProblemId}` : 'Add New Practice Problem'}
                </span>
              </div>
              <button
                onClick={() => setShowProblemModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProblemSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Contest / Scope</label>
                  <select
                    value={formContestId}
                    onChange={(e) => setFormContestId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  >
                    <option value="">None (Standalone Practice Problem)</option>
                    {contests.map((c) => (
                      <option key={c.id} value={c.id}>
                        Contest: {c.title} (#{c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Problem Title *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Two Sum / Longest Substring"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Difficulty Level *</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Time Limit (Milliseconds) *</label>
                  <input
                    type="number"
                    value={formTimeLimit}
                    onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                    min={100}
                    max={10000}
                    step={100}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                    required
                  />
                </div>
              </div>

              {formContestId !== '' && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-200 text-xs">Publish to General Problems Section</div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      If enabled, participants can practice this problem in the standalone Problems section even outside contest hours.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPublished}
                      onChange={(e) => setFormIsPublished(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Problem Statement (Markdown Supported) *</label>
                <textarea
                  value={formStatement}
                  onChange={(e) => setFormStatement(e.target.value)}
                  placeholder="Describe the problem, input/output formats, and constraints..."
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-white placeholder-slate-600 font-sans outline-none leading-relaxed"
                  required
                />
              </div>

              {/* Test Case Management Section */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Test Cases ({testCases.length})</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowJsonParser(!showJsonParser)}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-bold"
                    >
                      {showJsonParser ? 'Hide JSON Parser' : 'Paste Test Cases JSON'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTestCase}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Case</span>
                    </button>
                  </div>
                </div>

                {showJsonParser && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <p className="text-[11px] text-slate-400">Paste JSON array containing input/expected_output pairs:</p>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='[{"input": "2 7 11 15\n9", "expected_output": "0 1", "is_sample": true}]'
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleParseJsonTestCases}
                      className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-400 text-slate-950 text-[11px] font-bold"
                    >
                      Apply JSON Cases
                    </button>
                  </div>
                )}

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-cyan-400 font-bold">Case #{idx + 1}</span>
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.is_sample}
                              onChange={(e) => handleTestCaseChange(idx, 'is_sample', e.target.checked)}
                              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                            />
                            <span>Sample Case (Visible to user)</span>
                          </label>
                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(idx)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400">Input (stdin):</span>
                          <textarea
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                            placeholder="Input data..."
                            rows={2}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">Expected Output:</span>
                          <textarea
                            value={tc.expected_output}
                            onChange={(e) => handleTestCaseChange(idx, 'expected_output', e.target.value)}
                            placeholder="Expected output data..."
                            rows={2}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProblemModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProblem}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {savingProblem ? 'Saving...' : editingProblemId ? 'Update Problem' : 'Create Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Codeforces Import */}
      {showCFModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-blue-400 font-mono font-bold">
                <ExternalLink className="w-5 h-5" />
                <span className="text-base text-white">Import Codeforces Problem</span>
              </div>
              <button
                onClick={() => setShowCFModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cfError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-400">
                {cfError}
              </div>
            )}

            <form onSubmit={handleImportCFSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Scope / Contest</label>
                <select
                  value={cfTargetContestId}
                  onChange={(e) => setCfTargetContestId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                >
                  <option value="">Standalone Practice Problem (No Contest)</option>
                  {contests.map((c) => (
                    <option key={c.id} value={c.id}>
                      Contest: {c.title} (#{c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Codeforces Problem URL *</label>
                <input
                  type="url"
                  value={cfUrl}
                  onChange={(e) => setCfUrl(e.target.value)}
                  placeholder="https://codeforces.com/problemset/problem/4/A"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCFModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cfImporting}
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold shadow-sm disabled:opacity-50"
                >
                  {cfImporting ? 'Importing...' : 'Import Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
