'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { LogIn, Key, Mail, Flame } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      login(res.access_token, res.user);
      window.location.href = '/contests';
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 font-sans">
      <div className="bg-[#121620] border border-slate-800 rounded-lg p-6 sm:p-8 space-y-5">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex p-2.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-1">
            <Flame className="w-6 h-6 fill-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Sign In to CodeCompete</h1>
          <p className="text-xs text-slate-400">Enter your credentials to compete in contests</p>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-semibold">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@leetcompete.com"
                className="w-full bg-[#0B1120] border border-slate-700/80 focus:border-amber-500 rounded pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-semibold">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0B1120] border border-slate-700/80 focus:border-amber-500 rounded pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Signing in...' : 'LOG IN'}</span>
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          Don't have an account?{' '}
          <Link href="/register" className="text-amber-400 hover:underline font-bold">
            Create account
          </Link>
        </p>

      </div>
    </div>
  );
}


