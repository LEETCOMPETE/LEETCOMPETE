'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Code2, ArrowRight, Shield, Users, Clock, Terminal, CheckCircle2, LayoutDashboard, Sparkles } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContests()
      .then((data) => setContests(data))
      .catch(() => setContests([]))
      .finally(() => setLoading(false));
  }, []);

  const liveContests = contests.filter((c) => c.status === 'LIVE');

  return (
    <div className="space-y-12 py-4">
      
      {/* Human-designed Clean Developer Hero */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-6 relative z-10">
          
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LeetCompete Platform &bull; ACM Student Chapter</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-mono text-white tracking-tight leading-tight">
            Competitive Programming Arena & Contest Platform
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-sans max-w-2xl">
            Organize ICPC-style rounds, test algorithmic problem sets, submit solutions in Python, C++, Java, or Node.js with instant Judge0 execution, and track real-time scoreboards with penalty calculations.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/contests"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Trophy className="w-4 h-4" />
              <span>Browse Active Contests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {user?.role === 'organizer' ? (
              <Link
                href="/admin"
                className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/30 font-mono text-xs font-bold transition-all flex items-center space-x-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Organizer Admin Panel</span>
              </Link>
            ) : !user ? (
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-mono text-xs font-semibold transition-all"
              >
                Sign In to Compete
              </Link>
            ) : null}
          </div>
        </div>

        {/* Demo Credentials Box */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Organizer Account (Full Admin Panel)</span>
            </div>
            <p className="text-slate-400">Email: <code className="text-emerald-300">organizer@leetcompete.com</code></p>
            <p className="text-slate-400">Password: <code className="text-emerald-300">password123</code></p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>Participant Account</span>
            </div>
            <p className="text-slate-400">Email: <code className="text-emerald-300">alex@leetcompete.com</code></p>
            <p className="text-slate-400">Password: <code className="text-emerald-300">password123</code></p>
          </div>
        </div>
      </section>

      {/* Feature Grid & Scheduled Rounds */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-mono text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <span>Featured Contests</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans">Current and upcoming club rounds</p>
          </div>

          <Link href="/contests" className="text-xs font-mono text-emerald-400 hover:underline flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-xl border border-slate-800">
            Loading scheduled contests...
          </div>
        ) : contests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900/50 rounded-xl border border-slate-800">
            No contests scheduled yet. Organizers can add new events from the Admin Panel.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contests.slice(0, 4).map((contest) => (
              <div
                key={contest.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        contest.status === 'LIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : contest.status === 'UPCOMING'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      ● {contest.status}
                    </span>

                    <span className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(contest.start_time).toLocaleDateString()}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold font-mono text-white hover:text-emerald-400 transition-colors">
                    <Link href={`/contests/${contest.id}`}>{contest.title}</Link>
                  </h3>

                  <p className="text-xs text-slate-400 font-sans line-clamp-2">
                    {contest.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    Window: 24h Duration
                  </span>

                  <Link
                    href={`/contests/${contest.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-1"
                  >
                    <span>Enter Contest</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
