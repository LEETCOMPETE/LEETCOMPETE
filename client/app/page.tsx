'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Trophy, ArrowRight, Award, PlusCircle, Clock, Search, Shield } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    api.getContests()
      .then((data) => setContests(data))
      .catch(() => setContests([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredContests = contests.filter((c) => {
    if (filter === 'LIVE') return c.status === 'LIVE';
    if (filter === 'UPCOMING') return c.status === 'UPCOMING';
    if (filter === 'PAST') return c.status === 'PAST';
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Contests Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Contest Arena</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Current, upcoming, and past programming rounds
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {user?.role === 'organizer' && (
            <Link
              href="/admin/contests/new"
              className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors inline-flex items-center space-x-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Contest</span>
            </Link>
          )}

          <div className="flex items-center space-x-1 text-xs font-semibold bg-slate-950 p-1 rounded border border-slate-800">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'LIVE', label: '● Live' },
              { id: 'UPCOMING', label: 'Upcoming' },
              { id: 'PAST', label: 'Past' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilter(st.id)}
                className={`px-3 py-1 rounded transition-all ${
                  filter === st.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contest Table */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900/80 rounded-lg border border-slate-800">
          Loading contests schedule...
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900/80 rounded-lg border border-slate-800">
          No contests found matching selected filter.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-28">CODE</th>
                  <th className="px-5 py-3.5">CONTEST NAME</th>
                  <th className="px-4 py-3.5">START TIME</th>
                  <th className="px-4 py-3.5 text-center">DURATION</th>
                  <th className="px-4 py-3.5 text-center">STATUS</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredContests.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-4 font-mono text-slate-400 font-bold">
                      <span className="px-2 py-1 rounded bg-slate-950 text-amber-400 border border-slate-800 text-[11px]">
                        START{100 + c.id}
                      </span>
                    </td>
                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Link href={`/contests/${c.id}`} className="font-bold text-white hover:text-amber-400 transition-colors text-sm">
                          {c.title}
                        </Link>
                        {c.is_registered && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            ✓ Registered
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {c.description}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-mono text-[11px] text-slate-300">
                      {new Date(c.start_time).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-[11px] text-slate-300">
                      24h
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border ${
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
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        <Link
                          href={`/contests/${c.id}`}
                          className="w-28 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors inline-flex items-center justify-center space-x-1.5 shadow-sm"
                        >
                          <span>Compete</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/contests/${c.id}/leaderboard`}
                          className="w-28 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors inline-flex items-center justify-center space-x-1.5"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ranklist</span>
                        </Link>
                      </div>
                    </td>
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
