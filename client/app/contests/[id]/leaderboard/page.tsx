'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Trophy, Clock, RefreshCw, ArrowLeft, CheckCircle2, XCircle, Minus, Shield, Users, Building } from 'lucide-react';

export default function ContestLeaderboardPage() {
  const { id: contestId } = useParams();

  const [contest, setContest] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLeaderboardData = () => {
    if (!contestId) return;

    Promise.all([
      api.getContest(contestId as string),
      api.getLeaderboard(contestId as string),
    ])
      .then(([contestData, leaderboardData]) => {
        setContest(contestData);
        setLeaderboard(leaderboardData);
        setLastUpdated(new Date());
      })
      .catch((err) => console.error('Error loading leaderboard:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [contestId]);

  // Polling every 6 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLeaderboardData();
    }, 6000);

    return () => clearInterval(interval);
  }, [contestId, autoRefresh]);

  if (loading) {
    return (
      <div className="p-12 text-center font-mono text-slate-400 animate-pulse bg-slate-900/50 rounded-2xl border border-slate-800">
        Loading live leaderboard...
      </div>
    );
  }

  const problems = contest?.problems || [];

  return (
    <div className="space-y-6">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/contests/${contestId}`}
          className="inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Contest</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold flex items-center space-x-2 border transition-all ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto-Polling Active (6s)' : 'Polling Paused'}</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white">
                Live Contest Leaderboard
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Contest: <span className="font-semibold text-slate-200">{contest?.title}</span>
            </p>
          </div>

          <div className="text-right text-xs font-mono text-slate-400">
            <div>Last Updated: {lastUpdated.toLocaleTimeString()}</div>
            <div className="text-[10px] text-slate-500">Auto-refreshes live every 6 seconds</div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      {leaderboard.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm bg-slate-900/50 rounded-2xl border border-slate-800">
          No team submissions recorded yet.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 w-16 text-center">Rank</th>
                  <th className="px-6 py-4">Team & School / Institution</th>
                  <th className="px-6 py-4 text-center">Solved</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Time Penalty</th>
                  {problems.map((p: any, idx: number) => (
                    <th key={p.id} className="px-4 py-4 text-center min-w-[90px]">
                      {String.fromCharCode(65 + idx)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.user_id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      entry.rank === 1
                        ? 'bg-amber-500/5'
                        : entry.rank === 2
                        ? 'bg-slate-300/5'
                        : entry.rank === 3
                        ? 'bg-amber-700/5'
                        : ''
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="px-5 py-4 text-center font-bold">
                      {entry.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          🥇 1
                        </span>
                      ) : entry.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40">
                          🥈 2
                        </span>
                      ) : entry.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40">
                          🥉 3
                        </span>
                      ) : (
                        <span className="text-slate-400">{entry.rank}</span>
                      )}
                    </td>

                    {/* Team, Member Names, and School Details */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">
                          {entry.team_name ? entry.team_name : entry.user_name}
                        </span>
                        {entry.school && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                            🏫 {entry.school}
                          </span>
                        )}
                      </div>

                      {entry.members && (
                        <div className="text-[11px] text-emerald-400 font-mono">
                          Team Members: <span className="text-slate-300">{entry.members}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500">
                        Submitted by: {entry.user_name} ({entry.email})
                      </div>
                    </td>

                    {/* Solved Count */}
                    <td className="px-6 py-4 text-center font-bold text-emerald-400 text-sm">
                      {entry.problems_solved} / {problems.length}
                    </td>

                    {/* Total Score */}
                    <td className="px-6 py-4 text-center font-bold text-white">
                      {entry.total_score} pts
                    </td>

                    {/* Penalty Minutes */}
                    <td className="px-6 py-4 text-center text-slate-400">
                      {entry.total_penalty_minutes} min
                    </td>

                    {/* Individual Problem Statuses */}
                    {problems.map((p: any) => {
                      const st = entry.problem_status?.[String(p.id)];
                      if (!st) {
                        return (
                          <td key={p.id} className="px-4 py-4 text-center text-slate-600">
                            <Minus className="w-4 h-4 mx-auto opacity-40" />
                          </td>
                        );
                      }
                      if (st.verdict === 'AC') {
                        return (
                          <td key={p.id} className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <span className="font-extrabold text-xs">+ {st.time_min}m</span>
                              {st.attempts > 1 && (
                                <span className="text-[9px] text-emerald-500">({st.attempts} tries)</span>
                              )}
                            </div>
                          </td>
                        );
                      } else {
                        return (
                          <td key={p.id} className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                              <span className="font-bold text-xs">-{st.attempts}</span>
                              <span className="text-[9px] text-rose-500">{st.verdict}</span>
                            </div>
                          </td>
                        );
                      }
                    })}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
