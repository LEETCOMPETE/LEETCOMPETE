'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Plus, Trophy, Code2, Users, FileCode, Clock, ArrowUpRight, Trash2, CheckCircle2, ShieldAlert, Rocket, X, Search, UserPlus, Shield, User as UserIcon, Key, Mail, ExternalLink, Settings, ChevronDown, Edit3 } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [contests, setContests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number } | null>(null);

  // Modify / Edit Contest Modal State
  const [showEditContestModal, setShowEditContestModal] = useState(false);
  const [editingContest, setEditingContest] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editRegStart, setEditRegStart] = useState('');
  const [editRegEnd, setEditRegEnd] = useState('');
  const [editMaxParticipants, setEditMaxParticipants] = useState('');
  const [editMaxTeamMembers, setEditMaxTeamMembers] = useState('');
  const [editAllowAllMembersSubmit, setEditAllowAllMembersSubmit] = useState(true);
  const [editContestError, setEditContestError] = useState('');
  const [updatingContest, setUpdatingContest] = useState(false);

  // Contest Registration Statistics State
  const [selectedContestForStats, setSelectedContestForStats] = useState<any>(null);
  const [contestRegistrations, setContestRegistrations] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [regSearchTerm, setRegSearchTerm] = useState('');

  // User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'participant' | 'organizer'>('participant');
  const [createUserError, setCreateUserError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Codeforces Import State
  const [showCFModal, setShowCFModal] = useState(false);
  const [selectedContestForCF, setSelectedContestForCF] = useState<any>(null);
  const [cfUrl, setCfUrl] = useState('');
  const [cfImporting, setCfImporting] = useState(false);
  const [cfError, setCfError] = useState('');
  const [cfSuccessMsg, setCfSuccessMsg] = useState('');

  const toLocalISOString = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenEditContestModal = (contest: any) => {
    setEditingContest(contest);
    setEditTitle(contest.title || '');
    setEditDescription(contest.description || '');
    setEditStartTime(toLocalISOString(contest.start_time));
    setEditEndTime(toLocalISOString(contest.end_time));
    setEditRegStart(toLocalISOString(contest.registration_start_time));
    setEditRegEnd(toLocalISOString(contest.registration_end_time));
    setEditMaxParticipants(contest.max_participants != null ? String(contest.max_participants) : '');
    setEditMaxTeamMembers(contest.max_team_members != null ? String(contest.max_team_members) : '3');
    setEditAllowAllMembersSubmit(contest.allow_all_members_submit ?? true);
    setEditContestError('');
    setShowEditContestModal(true);
  };

  const handleEditContestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContest) return;
    setEditContestError('');

    if (editStartTime && editEndTime && new Date(editEndTime) <= new Date(editStartTime)) {
      setEditContestError('Contest End Time must be strictly after Contest Start Time.');
      return;
    }
    if (editRegStart && editRegEnd && new Date(editRegEnd) <= new Date(editRegStart)) {
      setEditContestError('Registration Closing Time must be strictly after Registration Opening Time.');
      return;
    }

    setUpdatingContest(true);
    try {
      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        start_time: new Date(editStartTime).toISOString(),
        end_time: new Date(editEndTime).toISOString(),
        registration_start_time: editRegStart ? new Date(editRegStart).toISOString() : null,
        registration_end_time: editRegEnd ? new Date(editRegEnd).toISOString() : null,
        max_participants: editMaxParticipants.trim() ? parseInt(editMaxParticipants, 10) : null,
        max_team_members: editMaxTeamMembers.trim() ? parseInt(editMaxTeamMembers, 10) : 3,
        allow_all_members_submit: editAllowAllMembersSubmit,
      };

      await api.updateContest(editingContest.id, payload);
      setShowEditContestModal(false);
      fetchDashboardData();
    } catch (err: any) {
      setEditContestError(err.message || 'Failed to update contest.');
    } finally {
      setUpdatingContest(false);
    }
  };

  const fetchUsers = () => {
    if (!user || user.role !== 'organizer') return;
    setUsersLoading(true);
    api.getUsers()
      .then((data) => setUsersList(data))
      .catch((err) => console.error(err))
      .finally(() => setUsersLoading(false));
  };

  const fetchDashboardData = () => {
    setLoading(true);
    api.getContests()
      .then((contestsData) => setContests(contestsData))
      .catch((err) => console.error('Failed to fetch contests:', err))
      .finally(() => setLoading(false));

    api.getSubmissions()
      .then((submissionsData) => setSubmissions(submissionsData))
      .catch((err) => console.error('Failed to fetch submissions:', err));

    fetchUsers();
  };

  useEffect(() => {
    fetchDashboardData();
    const handleCloseDropdown = () => {
      setActiveDropdownId(null);
      setDropdownCoords(null);
    };
    window.addEventListener('click', handleCloseDropdown);
    window.addEventListener('scroll', handleCloseDropdown, true);
    window.addEventListener('resize', handleCloseDropdown);
    return () => {
      window.removeEventListener('click', handleCloseDropdown);
      window.removeEventListener('scroll', handleCloseDropdown, true);
      window.removeEventListener('resize', handleCloseDropdown);
    };
  }, [user]);

  const handleToggleDropdown = (e: React.MouseEvent<HTMLButtonElement>, contestId: number) => {
    e.stopPropagation();
    if (activeDropdownId === contestId) {
      setActiveDropdownId(null);
      setDropdownCoords(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveDropdownId(contestId);
      setDropdownCoords({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
  };

  const handleToggleUserRole = async (targetUser: any) => {
    const newRole = targetUser.role === 'organizer' ? 'participant' : 'organizer';
    if (!window.confirm(`Are you sure you want to change ${targetUser.name}'s role to ${newRole.toUpperCase()}?`)) {
      return;
    }
    try {
      await api.updateUserRole(targetUser.id, newRole);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (targetUser: any) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${targetUser.name}" (${targetUser.email})?\n\nThis will permanently delete their account and associated data. This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.deleteUser(targetUser.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');
    setCreatingUser(true);
    try {
      await api.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });
      setShowCreateUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
    } catch (err: any) {
      setCreateUserError(err.message || 'Failed to create user.');
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const query = userSearchTerm.toLowerCase();
    return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query) || u.role.toLowerCase().includes(query);
  });

  const handleOpenCFModal = (contest: any) => {
    setSelectedContestForCF(contest);
    setCfUrl('');
    setCfError('');
    setCfSuccessMsg('');
    setShowCFModal(true);
  };

  const handleImportCFSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfUrl.trim() || !selectedContestForCF) return;
    setCfImporting(true);
    setCfError('');
    setCfSuccessMsg('');
    try {
      const res = await api.importCodeforcesProblem(selectedContestForCF.id, cfUrl.trim());
      setCfSuccessMsg(`Successfully imported "${res.title}" with ${res.sample_test_cases?.length || 0} sample test case(s)!`);
      setCfUrl('');
      fetchDashboardData();
    } catch (err: any) {
      setCfError(err.message || 'Failed to import problem from Codeforces.');
    } finally {
      setCfImporting(false);
    }
  };

  const handleOpenRegistrationsModal = (contest: any) => {
    setSelectedContestForStats(contest);
    setLoadingRegistrations(true);
    setRegSearchTerm('');
    api.getContestRegistrations(contest.id)
      .then((data) => {
        setContestRegistrations(data);
      })
      .catch((err) => {
        console.error(err);
        alert(err.message || 'Failed to load contest registrations.');
      })
      .finally(() => setLoadingRegistrations(false));
  };

  const filteredRegistrations = contestRegistrations.filter((reg) => {
    const query = regSearchTerm.toLowerCase();
    const teamMatch = reg.team_name && reg.team_name.toLowerCase().includes(query);
    const leaderMatch = (reg.user_name && reg.user_name.toLowerCase().includes(query)) ||
                        (reg.user_email && reg.user_email.toLowerCase().includes(query));
    const schoolMatch = reg.school && reg.school.toLowerCase().includes(query);
    const membersMatch = reg.members && reg.members.toLowerCase().includes(query);
    return teamMatch || leaderMatch || schoolMatch || membersMatch;
  });

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

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-xl border border-slate-800">
          Verifying organizer permissions...
        </div>
      </div>
    );
  }

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
                    <th className="px-5 py-3.5">Teams Registered</th>
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
                      <td className="px-5 py-4 font-mono">
                        <button
                          onClick={() => handleOpenRegistrationsModal(c)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all inline-flex items-center space-x-1.5"
                          title="Click to view detailed registered team stats"
                        >
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{c.registered_count} {c.max_participants ? `/ ${c.max_participants}` : ''} Teams</span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {new Date(c.start_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {new Date(c.end_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-5 py-4 text-right relative">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditContestModal(c)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs transition-all inline-flex items-center space-x-1"
                            title="Modify contest title, dates, registration window, or settings"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modify</span>
                          </button>

                          <Link
                            href={`/contests/${c.id}`}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all inline-flex items-center space-x-1"
                          >
                            <span>View</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>

                          <div className="inline-block text-left">
                            <button
                              onClick={(e) => handleToggleDropdown(e, c.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all text-xs font-semibold flex items-center space-x-1"
                              title="Contest management actions"
                            >
                              <Settings className="w-3.5 h-3.5 text-amber-400" />
                              <span>Actions</span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {activeDropdownId === c.id && dropdownCoords && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'fixed',
                                  top: `${dropdownCoords.top}px`,
                                  right: `${dropdownCoords.right}px`,
                                }}
                                className="w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-[9999] py-1 font-sans text-xs divide-y divide-slate-800/80 text-left"
                              >
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setDropdownCoords(null);
                                      handleOpenEditContestModal(c);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-amber-400 font-semibold flex items-center space-x-2 transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4 text-amber-400" />
                                    <span>Modify / Edit Contest</span>
                                  </button>

                                  {!c.is_launched && c.status !== 'PAST' && (
                                    <button
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handleLaunchContest(c.id, c.title);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-slate-800 text-emerald-400 font-bold flex items-center space-x-2 transition-colors"
                                    >
                                      <Rocket className="w-4 h-4 text-emerald-400" />
                                      <span>Launch Contest LIVE</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setDropdownCoords(null);
                                      handleOpenRegistrationsModal(c);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 flex items-center space-x-2 transition-colors"
                                  >
                                    <Users className="w-4 h-4 text-cyan-400" />
                                    <span>Registered Teams ({c.registered_count})</span>
                                  </button>

                                  <Link
                                    href={`/contests/${c.id}/leaderboard`}
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setDropdownCoords(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 flex items-center space-x-2 transition-colors"
                                  >
                                    <Trophy className="w-4 h-4 text-amber-400" />
                                    <span>Leaderboard / Ranklist</span>
                                  </Link>

                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setDropdownCoords(null);
                                      handleOpenCFModal(c);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 flex items-center space-x-2 transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-blue-400" />
                                    <span>Import CF Problem</span>
                                  </button>
                                </div>

                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setDropdownCoords(null);
                                      handleDeleteContest(c.id, c.title);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 font-semibold flex items-center space-x-2 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-400" />
                                    <span>Delete Contest</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
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
                  <th className="px-5 py-3">Team Name</th>
                  <th className="px-5 py-3">Problem</th>
                  <th className="px-5 py-3">Language</th>
                  <th className="px-5 py-3">Verdict</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {submissions.slice(0, 8).map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-white font-semibold">
                      {sub.team_name || sub.user_name || `User #${sub.user_id}`}
                    </td>
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

      {/* User Accounts & Role Management Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
              <Users className="w-4.5 h-4.5 text-amber-400" />
              <span>Platform Users & Role Management ({usersList.length})</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Only organizers can create new user accounts and manage access roles.
            </p>
          </div>

          <button
            onClick={() => {
              setCreateUserError('');
              setShowCreateUserModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create User & Assign Role</span>
          </button>
        </div>

        {/* User Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            placeholder="Search users by name, email address, or role..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none"
          />
        </div>

        {/* Users Table */}
        {usersLoading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-xl border border-slate-800">
            Loading platform user directory...
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">User Name</th>
                    <th className="px-5 py-3.5">Email Address</th>
                    <th className="px-5 py-3.5">Assigned Role</th>
                    <th className="px-5 py-3.5">Joined Date</th>
                    <th className="px-5 py-3.5 text-right">Role Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-400">#{u.id}</td>
                      <td className="px-5 py-4 font-bold text-white flex items-center space-x-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.name}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{u.email}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                            u.role === 'organizer'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {u.role === 'organizer' ? '⚡ Organizer' : '👤 Participant'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {u.id === user.id ? (
                          <span className="text-[11px] text-slate-500 italic">Current Session</span>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleToggleUserRole(u)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all border ${
                                u.role === 'organizer'
                                  ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {u.role === 'organizer' ? 'Demote to Participant' : 'Promote to Organizer'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Delete User"
                              className="px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all border bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/50 text-rose-400 border-rose-500/30 flex items-center space-x-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Admin Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5 text-amber-400 font-mono font-bold">
                <UserPlus className="w-5 h-5" />
                <span className="text-base text-white">Admin User Creation</span>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createUserError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                ⚠️ {createUserError}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Full Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. sarah@leetcompete.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Password *</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Assign Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserRole('participant')}
                    className={`p-2.5 rounded-xl border font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors ${
                      newUserRole === 'participant'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Participant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewUserRole('organizer')}
                    className={`p-2.5 rounded-xl border font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors ${
                      newUserRole === 'organizer'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Organizer</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-mono text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {creatingUser ? 'Creating User...' : 'Create Account & Assign Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contest Registration Statistics Modal */}
      {selectedContestForStats && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full space-y-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold">
                  <Users className="w-4 h-4" />
                  <span>CONTEST REGISTRATION STATISTICS</span>
                </div>
                <h2 className="text-xl font-bold font-mono text-white">
                  {selectedContestForStats.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedContestForStats(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Registered Teams</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {contestRegistrations.length} {selectedContestForStats.max_participants ? `/ ${selectedContestForStats.max_participants}` : ''}
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Total Competitors</span>
                <span className="text-lg font-bold font-mono text-cyan-400">
                  {contestRegistrations.reduce((acc, r) => {
                    const count = r.members ? r.members.split(',').filter((s: string) => s.trim()).length : 1;
                    return acc + count;
                  }, 0)} Members
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Max Team Size</span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {selectedContestForStats.max_team_members || 3} Members/Team
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Registration Status</span>
                <span className="text-xs font-bold font-mono text-slate-200 uppercase">
                  {selectedContestForStats.registration_status}
                </span>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={regSearchTerm}
                onChange={(e) => setRegSearchTerm(e.target.value)}
                placeholder="Search teams by team name, member name, leader email, or institution..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* Registration Table */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950">
              {loadingRegistrations ? (
                <div className="p-8 text-center font-mono text-xs text-slate-400 animate-pulse">
                  Loading registration roster...
                </div>
              ) : filteredRegistrations.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-slate-400">
                  No registered teams found.
                </div>
              ) : (
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Team Name</th>
                      <th className="px-4 py-3">Leader / Account</th>
                      <th className="px-4 py-3">School / Institution</th>
                      <th className="px-4 py-3">Registered Team Members</th>
                      <th className="px-4 py-3 text-right">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRegistrations.map((reg, idx) => {
                      const memberList = reg.members ? reg.members.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                      return (
                        <tr key={reg.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3.5 font-bold text-emerald-400">
                            {reg.team_name || 'Unnamed Team'}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-white">{reg.user_name}</div>
                            <div className="text-[10px] text-slate-400">{reg.user_email}</div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-300">
                            {reg.school || 'N/A'}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {memberList.map((m: string, mIdx: number) => (
                                <span
                                  key={mIdx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300"
                                >
                                  👤 {m}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-400 text-[11px]">
                            {new Date(reg.registered_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Codeforces Import Problem Modal */}
      {showCFModal && selectedContestForCF && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-blue-400 font-mono font-bold">
                <ExternalLink className="w-5 h-5" />
                <span className="text-base text-white">Import Codeforces Problem</span>
              </div>
              <button
                onClick={() => setShowCFModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Importing problem into contest: <span className="text-amber-400 font-bold">{selectedContestForCF.title}</span> (# {selectedContestForCF.id})
            </p>

            {cfError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                ⚠️ {cfError}
              </div>
            )}

            {cfSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                ✅ {cfSuccessMsg}
              </div>
            )}

            <form onSubmit={handleImportCFSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-bold">
                  Codeforces Problem URL
                </label>
                <input
                  type="url"
                  required
                  value={cfUrl}
                  onChange={(e) => setCfUrl(e.target.value)}
                  placeholder="https://codeforces.com/problemset/problem/1234/A"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 font-mono">
                  Supported URLs: <code className="text-slate-400">codeforces.com/problemset/problem/ID/Letter</code> or <code className="text-slate-400">codeforces.com/contest/ID/problem/Letter</code>
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCFModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-mono text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cfImporting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {cfImporting ? (
                    <span>Fetching & Parsing...</span>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Import Problem & Tests</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit / Modify Contest Modal */}
      {showEditContestModal && editingContest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-5 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5 text-amber-400 font-mono font-bold">
                <Edit3 className="w-5 h-5" />
                <span className="text-base text-white">Modify Contest Settings</span>
              </div>
              <button
                onClick={() => setShowEditContestModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs p-1 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Editing Contest <span className="text-amber-400 font-bold">#{editingContest.id}</span>: {editingContest.title}
            </p>

            {editContestError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                ⚠️ {editContestError}
              </div>
            )}

            <form onSubmit={handleEditContestSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Contest Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none resize-none"
                />
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300">Contest Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300">Contest End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              {/* Registration Start & End Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300">Registration Opens</label>
                  <input
                    type="datetime-local"
                    value={editRegStart}
                    onChange={(e) => setEditRegStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300">Registration Closes</label>
                  <input
                    type="datetime-local"
                    value={editRegEnd}
                    onChange={(e) => setEditRegEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              {/* Max Participants & Team Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300">Max Teams Cap (Optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={editMaxParticipants}
                    onChange={(e) => setEditMaxParticipants(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300">Max Team Size (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editMaxTeamMembers}
                    onChange={(e) => setEditMaxTeamMembers(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              {/* Submission Permissions */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-mono font-semibold text-slate-300">Submission Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAllowAllMembersSubmit(true)}
                    className={`p-2.5 rounded-xl border font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors ${
                      editAllowAllMembersSubmit
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>👥 All Team Members Can Submit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAllowAllMembersSubmit(false)}
                    className={`p-2.5 rounded-xl border font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors ${
                      !editAllowAllMembersSubmit
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>👑 Only Team Leader Can Submit</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditContestModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-mono text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingContest}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {updatingContest ? 'Saving Changes...' : 'Save & Update Contest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
