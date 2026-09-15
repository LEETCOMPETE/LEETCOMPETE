'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Clock, Search, Shield, PlusCircle, CheckCircle2, ArrowRight } from 'lucide-react';

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
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono text-white flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-emerald-400" />
            <span>Contest Arena</span>
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Browse live, upcoming, and archived competitive programming rounds
          </p>
        </div>

        {user?.role === 'organizer' && (
          <Link
            href="/admin/contests/new"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-sm font-bold transition-all flex items-center space-x-2 shadow-lg shadow-amber-500/20 self-start"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Contest</span>
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contest title or keywords..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2 text-sm font-mono text-white placeholder-slate-600 outline-none transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          {['ALL', 'LIVE', 'UPCOMING', 'PAST'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-2 rounded-xl transition-all font-semibold ${
                filterStatus === st
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Contest Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm animate-pulse bg-slate-900/50 rounded-2xl border border-slate-800">
          Loading contests...
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm bg-slate-900/50 rounded-2xl border border-slate-800">
          No contests found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredContests.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                      c.status === 'LIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                        : c.status === 'UPCOMING'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    ● {c.status}
                  </span>

                  {c.is_registered && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Registered</span>
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold font-mono text-white hover:text-emerald-400 transition-colors">
                  <Link href={`/contests/${c.id}`}>{c.title}</Link>
                </h2>

                <p className="text-xs text-slate-400 font-sans line-clamp-3">
                  {c.description}
                </p>

                <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Start: {new Date(c.start_time).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <Link
                  href={`/contests/${c.id}/leaderboard`}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs transition-all flex items-center space-x-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Leaderboard</span>
                </Link>

                <Link
                  href={`/contests/${c.id}`}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
                >
                  <span>Enter Contest</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
