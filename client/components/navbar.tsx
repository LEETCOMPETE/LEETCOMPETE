'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Code2, PlusCircle, LogIn, LogOut, User as UserIcon, Shield, LayoutDashboard } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand */}
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Code2 className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-base text-white tracking-tight">LeetCompete</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                CLUB
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <Link
              href="/contests"
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center space-x-1.5 ${
                pathname.startsWith('/contests')
                  ? 'bg-slate-900 text-emerald-400 font-bold border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Contests</span>
            </Link>

            {user?.role === 'organizer' && (
              <>
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center space-x-1.5 ${
                    pathname === '/admin'
                      ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900/50'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Dashboard</span>
                </Link>

                <Link
                  href="/admin/contests/new"
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center space-x-1.5 ${
                    pathname === '/admin/contests/new'
                      ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ New Event</span>
                </Link>
              </>
            )}
          </nav>

          {/* User Auth Info */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg font-mono text-xs">
                  {user.role === 'organizer' ? (
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="font-semibold text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-500 capitalize">({user.role})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white font-mono text-xs transition-all flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 font-mono text-xs text-slate-300 transition-all flex items-center space-x-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
