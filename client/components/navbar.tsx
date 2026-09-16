'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Trophy, Code2, PlusCircle, LogIn, LogOut, User as UserIcon, Shield, LayoutDashboard, Sun, Moon } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900 text-slate-100 font-sans transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Real Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Code2 className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-bold text-base text-white tracking-tight">
              Leet<span className="text-amber-400">Compete</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs font-semibold">
            <Link
              href="/contests"
              className={`px-3 py-1.5 rounded transition-colors flex items-center space-x-1.5 ${
                pathname.startsWith('/contests')
                  ? 'bg-slate-800 text-amber-400 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Contests</span>
            </Link>

            {user?.role === 'organizer' && (
              <>
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded transition-colors flex items-center space-x-1.5 ${
                    pathname === '/admin'
                      ? 'bg-slate-800 text-amber-400 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Admin Panel</span>
                </Link>

                <Link
                  href="/admin/contests/new"
                  className={`px-3 py-1.5 rounded transition-colors flex items-center space-x-1.5 ${
                    pathname === '/admin/contests/new'
                      ? 'bg-slate-800 text-amber-400 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Create Contest</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Controls: Theme Switcher + Auth */}
          <div className="flex items-center space-x-3">
            {/* Dark/Light Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-amber-400 transition-all flex items-center justify-center"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-500" />
              )}
            </button>

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-xs font-mono">
                  {user.role === 'organizer' ? (
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span className="font-bold text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-500 capitalize">({user.role})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 rounded border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors flex items-center space-x-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
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
