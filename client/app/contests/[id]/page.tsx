'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Clock, CheckCircle2, AlertCircle, ArrowRight, Code2, Users, Building, Shield, X, Calendar, Trash2, Rocket, Lock, Edit3 } from 'lucide-react';

function toLocalISOString(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ContestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [contest, setContest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRegModal, setShowRegModal] = useState(false);

  // Edit Registration Window Modal State
  const [showEditRegModal, setShowEditRegModal] = useState(false);
  const [editRegStart, setEditRegStart] = useState('');
  const [editRegEnd, setEditRegEnd] = useState('');
  const [updatingRegWindow, setUpdatingRegWindow] = useState(false);
  const [editRegError, setEditRegError] = useState('');

  // Team Registration Form State
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState('');
  const [school, setSchool] = useState('');
  const [registering, setRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');

  const fetchContestData = () => {
    if (!id) return;
    api.getContest(id as string)
      .then((data) => {
        setContest(data);
        if (data.registration_info) {
          setTeamName(data.registration_info.team_name || '');
          setMembers(data.registration_info.members || '');
          setSchool(data.registration_info.school || '');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContestData();
  }, [id]);

  // Countdown timer calculation
  useEffect(() => {
    if (!contest) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(contest.end_time).getTime();
      const start = new Date(contest.start_time).getTime();

      let target = end;
      let label = 'Ends in: ';

      if (now < start) {
        target = start;
        label = 'Starts in: ';
      }

      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('Contest Ended');
        clearInterval(timer);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${label} ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [contest]);

  const handleOpenRegisterModal = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setErrorMsg('');
    setShowRegModal(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRegistering(true);

    try {
      await api.registerContest(id as string, {
        team_name: teamName,
        members,
        school,
      });
      setSuccessMsg('Team registered successfully!');
      setShowRegModal(false);
      fetchContestData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteContest = async () => {
    if (!window.confirm(`Are you sure you want to delete "${contest.title}"? This will permanently delete all problems, submissions, and registrations for this contest.`)) {
      return;
    }
    try {
      await api.deleteContest(contest.id);
      router.push('/admin');
    } catch (err: any) {
      alert(err.message || 'Failed to delete contest.');
    }
  };

  const handleLaunchContest = async () => {
    if (!window.confirm(`Are you sure you want to manually launch "${contest.title}" LIVE now?`)) {
      return;
    }
    try {
      await api.launchContest(contest.id);
      fetchContestData();
    } catch (err: any) {
      alert(err.message || 'Failed to launch contest.');
    }
  };

  const handleOpenEditRegModal = () => {
    if (contest) {
      setEditRegStart(toLocalISOString(contest.registration_start_time));
      setEditRegEnd(toLocalISOString(contest.registration_end_time));
      setEditRegError('');
      setShowEditRegModal(true);
    }
  };

  const handleEditRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditRegError('');

    const startD = new Date(editRegStart);
    const endD = new Date(editRegEnd);
    if (endD <= startD) {
      setEditRegError('Registration Closing time must be after Registration Opening time.');
      return;
    }

    setUpdatingRegWindow(true);

    try {
      await api.updateContest(contest.id, {
        registration_start_time: startD.toISOString(),
        registration_end_time: endD.toISOString(),
      });
      setSuccessMsg('Registration window updated successfully!');
      setShowEditRegModal(false);
      fetchContestData();
    } catch (err: any) {
      setEditRegError(err.message || 'Failed to update registration window.');
    } finally {
      setUpdatingRegWindow(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center font-mono text-slate-400 animate-pulse bg-slate-900/50 rounded-2xl border border-slate-800">
        Loading contest details...
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="p-12 text-center font-mono text-red-400 bg-slate-900/50 rounded-2xl border border-slate-800">
        Contest not found.
      </div>
    );
  }

  const isRegOpen = contest.registration_status === 'REGISTRATION_OPEN';

  return (
    <div className="space-y-8">
      
      {/* Contest Banner Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border ${
                  contest.status === 'LIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : contest.status === 'UPCOMING'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                ● {contest.status}
              </span>

              {/* Registration Status Pill */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border flex items-center space-x-1 ${
                  isRegOpen
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : contest.registration_status === 'REGISTRATION_NOT_STARTED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {isRegOpen
                    ? 'Registration Open'
                    : contest.registration_status === 'REGISTRATION_NOT_STARTED'
                    ? 'Registration Not Started'
                    : 'Registration Closed'}
                </span>
              </span>

              {contest.is_registered && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Team Registered</span>
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
              {contest.title}
            </h1>

            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              {contest.description}
            </p>

            {/* Allowed Registration Window Info Card */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl font-mono text-xs space-y-1 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Allowed Registration Window:</span>
                </span>
                {user?.role === 'organizer' && (
                  <button
                    onClick={handleOpenEditRegModal}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Window</span>
                  </button>
                )}
              </div>
              <div className="text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>Opens: <span className="text-slate-100 font-semibold">{contest.registration_start_time ? new Date(contest.registration_start_time).toLocaleString() : 'N/A'}</span></div>
                <div>Closes: <span className="text-slate-100 font-semibold">{contest.registration_end_time ? new Date(contest.registration_end_time).toLocaleString() : 'N/A'}</span></div>
              </div>
            </div>

            {/* Registration Team Badge */}
            {contest.registration_info && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5 mt-4">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <Users className="w-4 h-4" />
                  <span>Registered Team: {contest.registration_info.team_name}</span>
                </div>
                <div className="text-slate-400">
                  School / Institution: <span className="text-slate-200 font-semibold">{contest.registration_info.school}</span>
                </div>
                <div className="text-slate-400">
                  Required Members: <span className="text-slate-300">{contest.registration_info.members}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Column */}
          <div className="flex flex-col space-y-3 min-w-[220px] justify-center">
            
            {/* Live Countdown Badge */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-center space-y-1">
              <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Round Clock</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {timeLeft || 'Calculating...'}
              </div>
            </div>

            {/* Registration Action Button */}
            {!contest.is_registered ? (
              <button
                onClick={handleOpenRegisterModal}
                disabled={!isRegOpen}
                className={`w-full py-3 rounded-xl font-mono text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 ${
                  isRegOpen
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>
                  {isRegOpen
                    ? 'Register Team'
                    : contest.registration_status === 'REGISTRATION_NOT_STARTED'
                    ? 'Registration Not Open Yet'
                    : 'Registration Closed'}
                </span>
              </button>
            ) : (
              <button
                onClick={handleOpenRegisterModal}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Edit Team Details</span>
              </button>
            )}

            {user?.role === 'organizer' && !contest.is_launched && contest.status !== 'PAST' && (
              <button
                onClick={handleLaunchContest}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
              >
                <Rocket className="w-4 h-4" />
                <span>Launch Contest LIVE</span>
              </button>
            )}

            <Link
              href={`/contests/${contest.id}/leaderboard`}
              className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-xs font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Live Leaderboard</span>
            </Link>

            {user?.role === 'organizer' && (
              <button
                onClick={handleDeleteContest}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono text-xs font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Contest</span>
              </button>
            )}
          </div>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
            ✅ {successMsg}
          </div>
        )}
      </div>

      {/* Problem Set Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-mono text-white flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <span>
              Problem Set ({user?.role === 'organizer' || (contest.is_registered && contest.is_launched) ? contest.problems?.length || 0 : 'Locked'})
            </span>
          </h2>
        </div>

        {!contest.is_registered && user?.role !== 'organizer' ? (
          <div className="p-8 text-center bg-slate-900 border border-amber-500/30 rounded-2xl space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold font-mono text-white">Registration Required</h3>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
                You must register your team for this contest to access the problem set when the contest is launched.
              </p>
            </div>
            <button
              onClick={handleOpenRegisterModal}
              disabled={!isRegOpen}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all inline-flex items-center space-x-2 ${
                isRegOpen
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isRegOpen ? 'Register Team' : 'Registration Closed'}</span>
            </button>
          </div>
        ) : !contest.is_launched && user?.role !== 'organizer' ? (
          <div className="p-8 text-center bg-slate-900 border border-cyan-500/30 rounded-2xl space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold font-mono text-white">Contest Not Launched Yet</h3>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
                Your team is registered! The problem set will become visible as soon as an organizer launches the contest.
              </p>
            </div>
            <div className="pt-2">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 inline-flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Waiting for Organizer to Launch Contest</span>
              </span>
            </div>
          </div>
        ) : contest.problems?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-sm bg-slate-900/50 rounded-2xl border border-slate-800">
            No problems added to this contest yet.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">#</th>
                    <th className="px-6 py-3.5">Title</th>
                    <th className="px-6 py-3.5">Difficulty</th>
                    <th className="px-6 py-3.5">Time Limit</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contest.problems.map((prob: any, idx: number) => (
                    <tr key={prob.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">
                        {String.fromCharCode(65 + idx)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        <Link
                          href={`/contests/${contest.id}/problems/${prob.id}`}
                          className="hover:text-emerald-400 transition-colors"
                        >
                          {prob.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                            prob.difficulty === 'Easy'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : prob.difficulty === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {prob.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {prob.time_limit_ms} ms
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/contests/${contest.id}/problems/${prob.id}`}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold transition-all border border-emerald-500/20"
                        >
                          <span>Solve</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Team Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3 text-emerald-400 font-mono font-bold">
                <Users className="w-6 h-6" />
                <span className="text-base text-white">Team Registration</span>
              </div>
              <button
                onClick={() => setShowRegModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Team Name *</label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. AlgoRiders"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">School / University / Institution *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Required Team Members (Names) *</label>
                <textarea
                  required
                  rows={3}
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                  placeholder="e.g. Alex Chen, Sarah Jenkins, David Kim"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none"
                />
                <span className="text-[10px] text-slate-500 font-mono">List full names of all required team members.</span>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-mono text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {registering ? 'Submitting Registration...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organizer Edit Registration Window Modal */}
      {showEditRegModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3 text-cyan-400 font-mono font-bold">
                <Calendar className="w-6 h-6" />
                <span className="text-base text-white">Edit Registration Window</span>
              </div>
              <button
                onClick={() => setShowEditRegModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editRegError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                ⚠️ {editRegError}
              </div>
            )}

            <form onSubmit={handleEditRegSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Registration Opens At *</label>
                <input
                  type="datetime-local"
                  required
                  value={editRegStart}
                  onChange={(e) => setEditRegStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Registration Closes At *</label>
                <input
                  type="datetime-local"
                  required
                  value={editRegEnd}
                  onChange={(e) => setEditRegEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditRegModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-mono text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRegWindow}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {updatingRegWindow ? 'Saving Changes...' : 'Save Window Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
