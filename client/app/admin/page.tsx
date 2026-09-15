'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Plus, Trophy, Code2, Users, FileCode, Clock, ArrowUpRight, Trash2, CheckCircle2, ShieldAlert, Rocket } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [contests, setContests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = () => {
    if (!user || user.role !== 'organizer') return;

    Promise.all([
      api.getContests(),
      api.getSubmissions(),
    ])
      .then(([contestsData, submissionsData]) => {
        setContests(contestsData);
        setSubmissions(submissionsData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleLaunchContest = async (contestId: number, title: string) => {
    if (!window.confirm(`Are you sure you want to manually launch "${title}" LIVE now?`)) {
      return;
    }
    try {
      await api.launchContest(contestId);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to launch contest.');
    }
  };

  const handleDeleteContest = async (contestId: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? All associated problems, submissions, and registrations will be permanently removed.`)) {
      return;
    }
    try {
      await api.deleteContest(contestId);
      setContests(contests.filter((c) => c.id !== contestId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete contest.');
    }
  };

  if (!user || user.role !== 'organizer') {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-mono text-white">Organizer Restricted Area</h2>
          <p className="text-xs text-slate-400 font-sans">
            This dashboard is reserved for club organizers to schedule contests, manage problem sets, and review submissions.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all"
            >
              Log in as Organizer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const liveCount = contests.filter(c => c.status === 'LIVE').length;
  const upcomingCount = contests.filter(c => c.status === 'UPCOMING').length;
  const totalSubmissions = submissions.length;
  const acSubmissions = submissions.filter(s => s.verdict === 'AC').length;

  return (
    <div className="space-y-8">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>ORGANIZER DASHBOARD</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            Contest & Event Management
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Create rounds, add problems, monitor real-time participant activity and judging queues.
          </p>
        </div>

        <Link
          href="/admin/contests/new"
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-2 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Event / Contest</span>
        </Link>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Total Events</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{contests.length}</div>
          <div className="text-[11px] font-mono text-slate-500">{liveCount} live, {upcomingCount} upcoming</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Submissions Judged</span>
            <FileCode className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalSubmissions}</div>
          <div className="text-[11px] font-mono text-emerald-400">{acSubmissions} accepted (AC)</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Active Round</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{liveCount > 0 ? '1 Round' : 'None'}</div>
          <div className="text-[11px] font-mono text-slate-500">{liveCount > 0 ? 'Accepting submissions' : 'No live contest'}</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Judge Engine</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">Online</div>
          <div className="text-[11px] font-mono text-slate-500">Judge0 + Local Fallback</div>
        </div>
      </div>

      {/* Events Management Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
            <Trophy className="w-4.5 h-4.5 text-emerald-400" />
            <span>Managed Contests & Events ({contests.length})</span>
          </h2>
          <Link
            href="/admin/contests/new"
            className="text-xs font-mono text-emerald-400 hover:underline flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Contest</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-xl border border-slate-800">
            Loading managed events...
          </div>
        ) : contests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
            <p>No contests created yet.</p>
            <Link
              href="/admin/contests/new"
              className="inline-block px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-mono text-xs font-bold"
            >
              Create Your First Contest
            </Link>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Event Title</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Start Window</th>
                    <th className="px-5 py-3.5">End Window</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contests.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-400">#{c.id}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-sm">{c.title}</div>
                        <div className="text-[11px] text-slate-400 font-sans line-clamp-1">{c.description}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                            c.status === 'LIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : c.status === 'UPCOMING'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {new Date(c.start_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {new Date(c.end_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        {!c.is_launched && c.status !== 'PAST' && (
                          <button
                            onClick={() => handleLaunchContest(c.id, c.title)}
                            className="px-2.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all text-[11px] inline-flex items-center space-x-1 shadow-sm"
                            title="Launch contest LIVE"
                          >
                            <Rocket className="w-3 h-3" />
                            <span>Launch Contest</span>
                          </button>
                        )}
                        <Link
                          href={`/contests/${c.id}`}
                          className="px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all text-[11px] inline-flex items-center space-x-1"
                        >
                          <span>View</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                        <Link
                          href={`/contests/${c.id}/leaderboard`}
                          className="px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 transition-all text-[11px] inline-flex items-center space-x-1"
                        >
                          <Trophy className="w-3 h-3" />
                          <span>Leaderboard</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteContest(c.id, c.title)}
                          className="px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all text-[11px] inline-flex items-center space-x-1"
                          title="Delete contest"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
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

      {/* Recent Submissions Log */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
          <FileCode className="w-4.5 h-4.5 text-cyan-400" />
          <span>Live Submission Activity ({submissions.slice(0, 5).length})</span>
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Sub ID</th>
                  <th className="px-5 py-3">Participant</th>
                  <th className="px-5 py-3">Problem</th>
                  <th className="px-5 py-3">Language</th>
                  <th className="px-5 py-3">Verdict</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {submissions.slice(0, 8).map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-bold text-slate-400">#{sub.id}</td>
                    <td className="px-5 py-3 text-white font-semibold">{sub.user_name || `User #${sub.user_id}`}</td>
                    <td className="px-5 py-3 text-slate-300">{sub.problem_title || `Problem #${sub.problem_id}`}</td>
                    <td className="px-5 py-3 uppercase text-slate-400">{sub.language}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.verdict === 'AC' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {sub.verdict}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 text-[11px]">
                      {new Date(sub.submitted_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
