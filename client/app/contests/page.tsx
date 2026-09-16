'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Clock, Search, PlusCircle, CheckCircle2, ArrowRight, Calendar, Award } from 'lucide-react';

export default function ContestsListPage() {
  const { user } = useAuth();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    api.getContests()
      .then((data) => setContests(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredContests = contests.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-slate-900 dark:text-white tracking-tight">
            Contest Arena
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            Browse and compete in active, upcoming, or past algorithmic challenges.
          </p>
        </div>

        {user?.role === 'organizer' && (
          <Link
            href="/admin/contests/new"
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans text-xs font-bold transition-colors flex items-center space-x-1.5 self-start shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ CREATE CONTEST</span>
          </Link>
        )}
      </div>

      {/* CodeChef Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between bg-white dark:bg-[#121620] border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contest by title..."
            className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-300 dark:border-slate-700/80 focus:border-amber-500 rounded pl-9 pr-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center space-x-1 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Contests' },
            { id: 'LIVE', label: '● Present (Live)' },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'PAST', label: 'Past' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded transition-colors ${
                filterStatus === st.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-100 dark:bg-[#0B1120] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* CodeChef Contest Table */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-mono text-xs bg-white dark:bg-[#121620] rounded-lg border border-slate-200 dark:border-slate-800">
          Loading CodeChef contest schedule...
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-mono text-xs bg-white dark:bg-[#121620] rounded-lg border border-slate-200 dark:border-slate-800">
          No contests found for the selected filter.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-100 dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-32">CODE</th>
                  <th className="px-5 py-3.5">CONTEST NAME</th>
                  <th className="px-4 py-3.5">START TIME</th>
                  <th className="px-4 py-3.5 text-center">DURATION</th>
                  <th className="px-4 py-3.5 text-center">STATUS</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filteredContests.map((c, idx) => {
                  const codeStr = `START${100 + c.id}`;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* CodeChef Contest Code Badge */}
                      <td className="px-4 py-4 font-mono font-bold">
                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px]">
                          {codeStr}
                        </span>
                      </td>

                      {/* Title & Description */}
                      <td className="px-5 py-4 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/contests/${c.id}`}
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          >
                            {c.title}
                          </Link>
                          {c.is_registered && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              ✓ Registered
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {c.description}
                        </p>
                      </td>

                      {/* Start Time */}
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {new Date(c.start_time).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-4 text-center text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        24 Hrs
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border ${
                            c.status === 'LIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : c.status === 'UPCOMING'
                              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Actions */}
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
                            className="w-28 py-1.5 rounded bg-slate-100 dark:bg-[#0B1120] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors inline-flex items-center justify-center space-x-1.5"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            <span>Ranklist</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}


