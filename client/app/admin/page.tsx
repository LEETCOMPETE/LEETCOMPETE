'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Plus,
  Trophy,
  Code2,
  Users,
  FileCode,
  Clock,
  ArrowUpRight,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Rocket,
  X,
  Search,
  UserPlus,
  Shield,
  User as UserIcon,
  ExternalLink,
  Settings,
  ChevronDown,
  Edit3,
  Globe,
  Eye,
  EyeOff,
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';

type AdminTab = 'contests' | 'problems' | 'submissions' | 'users';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('contests');

  // Main Data States
  const [contests, setContests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allProblems, setAllProblems] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);

  // Search Filters
  const [contestSearchTerm, setContestSearchTerm] = useState('');
  const [contestStatusFilter, setContestStatusFilter] = useState('ALL');

  const [probSearchTerm, setProbSearchTerm] = useState('');
  const [probDifficultyFilter, setProbDifficultyFilter] = useState('ALL');

  const [subSearchTerm, setSubSearchTerm] = useState('');
  const [subVerdictFilter, setSubVerdictFilter] = useState('ALL');

  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Dropdown state
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number } | null>(null);

  // Edit Contest Modal State
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

  const toLocalISOString = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchUsers = () => {
    if (!user || user.role !== 'organizer') return;
    setUsersLoading(true);
    api.getUsers()
      .then((data) => setUsersList(data))
      .catch((err) => console.error('Failed to fetch users:', err))
      .finally(() => setUsersLoading(false));
  };

  const fetchProblems = () => {
    setProblemsLoading(true);
    api.getAllProblems()
      .then((data) => setAllProblems(data))
      .catch((err) => console.error('Failed to fetch problems:', err))
      .finally(() => setProblemsLoading(false));
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
    fetchProblems();
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

  const handlePublishContestProblems = async (contestId: number, title: string) => {
    try {
      const res = await api.publishContestProblems(contestId);
      alert(res.message || `Published problems from "${title}" to Practice Problems section!`);
      fetchProblems();
    } catch (err: any) {
      alert(err.message || 'Failed to publish contest problems.');
    }
  };

  const handleTogglePublishProblem = async (prob: any) => {
    try {
      await api.updateProblem(prob.id, { is_published: !prob.is_published });
      fetchProblems();
    } catch (err: any) {
      alert(err.message || 'Failed to update problem status.');
    }
  };

  const handleDeleteProblem = async (prob: any) => {
    if (!window.confirm(`Are you sure you want to delete problem "${prob.title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteProblem(prob.id);
      fetchProblems();
    } catch (err: any) {
      alert(err.message || 'Failed to delete problem.');
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
        `Are you sure you want to delete user "${targetUser.name}" (${targetUser.email})?\n\nThis will permanently delete their account. This action cannot be undone.`
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

  const handleOpenCFModal = (contest: any) => {
    setSelectedContestForCF(contest);
    setCfUrl('');
    setCfError('');
    setShowCFModal(true);
  };

  const handleImportCFSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfUrl.trim() || !selectedContestForCF) return;
    setCfImporting(true);
    setCfError('');
    try {
      const res = await api.importCodeforcesProblem(selectedContestForCF.id, cfUrl.trim());
      alert(`Successfully imported "${res.title}"!`);
      setShowCFModal(false);
      setCfUrl('');
      fetchProblems();
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

  // Filtered lists for each active tab
  const filteredContests = contests.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(contestSearchTerm.toLowerCase()) ||
                          c.description?.toLowerCase().includes(contestSearchTerm.toLowerCase());
    const matchesStatus = contestStatusFilter === 'ALL' || c.status === contestStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProblems = allProblems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(probSearchTerm.toLowerCase()) ||
                          p.statement?.toLowerCase().includes(probSearchTerm.toLowerCase());
    const matchesDiff = probDifficultyFilter === 'ALL' || p.difficulty?.toUpperCase() === probDifficultyFilter.toUpperCase();
    return matchesSearch && matchesDiff;
  });

  const filteredSubmissions = submissions.filter((s) => {
    const query = subSearchTerm.toLowerCase();
    const teamMatch = (s.team_name && s.team_name.toLowerCase().includes(query)) ||
                      (s.user_name && s.user_name.toLowerCase().includes(query));
    const probMatch = s.problem_title && s.problem_title.toLowerCase().includes(query);
    const matchesSearch = teamMatch || probMatch;
    const matchesVerdict = subVerdictFilter === 'ALL' || s.verdict === subVerdictFilter;
    return matchesSearch && matchesVerdict;
  });

  const filteredUsers = usersList.filter((u) => {
    const query = userSearchTerm.toLowerCase();
    return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query) || u.role.toLowerCase().includes(query);
  });

  const liveCount = contests.filter(c => c.status === 'LIVE').length;
  const acSubmissions = submissions.filter(s => s.verdict === 'AC').length;

  return (
    <div className="space-y-6">
      
      {/* Admin Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>ADMIN CONTROL CENTER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            Organizer Management Panel
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Manage events, control problem visibility, monitor submissions, and delegate organizer permissions.
          </p>
        </div>

        {/* Quick Actions depending on active tab */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {activeTab === 'contests' && (
            <Link
              href="/admin/contests/new"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Event</span>
            </Link>
          )}

          {activeTab === 'problems' && (
            <Link
              href="/problems"
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Practice Problem</span>
            </Link>
          )}

          {activeTab === 'users' && (
            <button
              onClick={() => {
                setCreateUserError('');
                setShowCreateUserModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Create User Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Section Navigation Bar */}
      <div className="border-b border-slate-800 pb-0.5">
        <nav className="flex space-x-2 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('contests')}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'contests'
                ? 'bg-slate-900 text-emerald-400 border-emerald-500 font-bold'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Contests & Events</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
              {contests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('problems')}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'problems'
                ? 'bg-slate-900 text-cyan-400 border-cyan-500 font-bold'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Problem Bank</span>
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">
              {allProblems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'submissions'
                ? 'bg-slate-900 text-amber-400 border-amber-500 font-bold'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Submissions Queue</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold">
              {submissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'users'
                ? 'bg-slate-900 text-purple-400 border-purple-500 font-bold'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Users & Roles</span>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold">
              {usersList.length}
            </span>
          </button>
        </nav>
      </div>

      {/* TAB 1: CONTESTS MANAGEMENT */}
      {activeTab === 'contests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={contestSearchTerm}
                onChange={(e) => setContestSearchTerm(e.target.value)}
                placeholder="Search contests by title or description..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={contestStatusFilter}
                onChange={(e) => setContestStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="LIVE">Live Now</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="PAST">Finished / Past</option>
              </select>

              <Link
                href="/admin/contests/new"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Contest</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-2xl border border-slate-800">
              Loading contests list...
            </div>
          ) : filteredContests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
              <p>No contests found matching your search.</p>
              <Link
                href="/admin/contests/new"
                className="inline-block px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-mono text-xs font-bold"
              >
                Create Event
              </Link>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">ID</th>
                      <th className="px-5 py-3.5">Event Title</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Registered Teams</th>
                      <th className="px-5 py-3.5">Start Window</th>
                      <th className="px-5 py-3.5">End Window</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredContests.map((c) => (
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
                            title="View registered team stats"
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
                              title="Edit contest parameters"
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

                                    <button
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handlePublishContestProblems(c.id, c.title);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-slate-800 text-cyan-400 font-bold flex items-center space-x-2 transition-colors"
                                    >
                                      <Globe className="w-4 h-4 text-cyan-400" />
                                      <span>Publish Problems to Practice</span>
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
      )}

      {/* TAB 2: PROBLEM BANK MANAGEMENT */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={probSearchTerm}
                onChange={(e) => setProbSearchTerm(e.target.value)}
                placeholder="Search repository problems by title or statement..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={probDifficultyFilter}
                onChange={(e) => setProbDifficultyFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>

              <Link
                href="/problems"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Problem</span>
              </Link>
            </div>
          </div>

          {problemsLoading ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-2xl border border-slate-800">
              Loading problem repository...
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
              <p>No problems found matching filters.</p>
              <Link
                href="/problems"
                className="inline-block px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-bold"
              >
                Create Practice Problem
              </Link>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">ID</th>
                      <th className="px-5 py-3.5">Problem Title</th>
                      <th className="px-5 py-3.5">Origin / Contest</th>
                      <th className="px-5 py-3.5">Difficulty</th>
                      <th className="px-5 py-3.5">Time Limit</th>
                      <th className="px-5 py-3.5">Test Cases</th>
                      <th className="px-5 py-3.5">Practice Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProblems.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-400">#{p.id}</td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-sm">{p.title}</div>
                          <div className="text-[11px] text-slate-400 font-sans line-clamp-1">{p.statement}</div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-300">
                          {p.contest_id ? (
                            <span className="text-amber-400">{p.contest_title || `Contest #${p.contest_id}`}</span>
                          ) : (
                            <span className="text-cyan-400">🌐 Standalone Practice</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase ${
                              p.difficulty?.toLowerCase() === 'easy'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : p.difficulty?.toLowerCase() === 'hard'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {p.difficulty}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{p.time_limit_ms} ms</td>
                        <td className="px-5 py-4 text-slate-400 font-mono">{p.test_cases_count} Case(s)</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleTogglePublishProblem(p)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all inline-flex items-center space-x-1 ${
                              p.is_published
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {p.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{p.is_published ? 'Published' : 'Hidden'}</span>
                          </button>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href="/problems"
                              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold text-xs transition-all inline-flex items-center space-x-1"
                            >
                              <span>Manage</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleDeleteProblem(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* TAB 3: SUBMISSIONS QUEUE & ACTIVITY */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={subSearchTerm}
                onChange={(e) => setSubSearchTerm(e.target.value)}
                placeholder="Filter submissions by team, user name, or problem title..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={subVerdictFilter}
                onChange={(e) => setSubVerdictFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-amber-500"
              >
                <option value="ALL">All Verdicts</option>
                <option value="AC">Accepted (AC)</option>
                <option value="WA">Wrong Answer (WA)</option>
                <option value="TLE">Time Limit Exceeded (TLE)</option>
                <option value="RE">Runtime Error (RE)</option>
                <option value="CE">Compilation Error (CE)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Submission ID</th>
                    <th className="px-5 py-3.5">Team / User</th>
                    <th className="px-5 py-3.5">Problem</th>
                    <th className="px-5 py-3.5">Language</th>
                    <th className="px-5 py-3.5">Verdict</th>
                    <th className="px-5 py-3.5">Score</th>
                    <th className="px-5 py-3.5 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 font-bold">#{sub.id}</td>
                      <td className="px-5 py-3.5 text-white font-semibold">
                        {sub.team_name || sub.user_name || `User #${sub.user_id}`}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{sub.problem_title || `Problem #${sub.problem_id}`}</td>
                      <td className="px-5 py-3.5 uppercase text-slate-400 font-bold">{sub.language}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase ${
                            sub.verdict === 'AC'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {sub.verdict}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-300">{sub.score} pt(s)</td>
                      <td className="px-5 py-3.5 text-right text-slate-500 text-[11px]">
                        {new Date(sub.submitted_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search registered members by name, email address, or role..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none"
              />
            </div>

            <button
              onClick={() => {
                setCreateUserError('');
                setShowCreateUserModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Create Account</span>
            </button>
          </div>

          {usersLoading ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-2xl border border-slate-800">
              Loading platform user directory...
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">ID</th>
                      <th className="px-5 py-3.5">Member Name</th>
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
                                className="px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all border bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 flex items-center space-x-1"
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
      )}

      {/* Modal: Edit Contest Parameters */}
      {showEditContestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full my-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold">
                <Edit3 className="w-5 h-5" />
                <span className="text-base text-white">Modify Event Settings</span>
              </div>
              <button
                onClick={() => setShowEditContestModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editContestError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-400">
                {editContestError}
              </div>
            )}

            <form onSubmit={handleEditContestSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Event Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description *</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditContestModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingContest}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm disabled:opacity-50"
                >
                  {updatingContest ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registered Teams View */}
      {selectedContestForStats && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold font-mono text-white flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Registered Teams — {selectedContestForStats.title}</span>
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Total {contestRegistrations.length} team(s) registered
                </p>
              </div>
              <button
                onClick={() => setSelectedContestForStats(null)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingRegistrations ? (
              <div className="py-8 text-center text-slate-400 font-mono text-xs animate-pulse">
                Loading team registrations...
              </div>
            ) : (
              <div className="overflow-y-auto space-y-3 font-mono text-xs flex-1 pr-1">
                {contestRegistrations.map((reg) => (
                  <div key={reg.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 text-sm">{reg.team_name || 'Individual Participant'}</span>
                      <span className="text-[10px] text-slate-500">{new Date(reg.registered_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-slate-300">Leader: {reg.user_name} ({reg.user_email})</div>
                    {reg.members && <div className="text-slate-400">Members: {reg.members}</div>}
                    {reg.school && <div className="text-slate-500">School/Org: {reg.school}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Admin Create User */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold">
                <UserPlus className="w-5 h-5" />
                <span className="text-base text-white">Create Platform Account</span>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createUserError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-400">
                {createUserError}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. user@leetcompete.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password *</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                >
                  <option value="participant">Participant (Standard User)</option>
                  <option value="organizer">Organizer (Admin Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm disabled:opacity-50"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Codeforces Import */}
      {showCFModal && selectedContestForCF && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-blue-400 font-mono font-bold">
                <ExternalLink className="w-5 h-5" />
                <span className="text-base text-white">Import CF Problem</span>
              </div>
              <button
                onClick={() => setShowCFModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cfError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-400">
                {cfError}
              </div>
            )}

            <form onSubmit={handleImportCFSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Contest</label>
                <input
                  type="text"
                  disabled
                  value={selectedContestForCF.title}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Codeforces Problem URL *</label>
                <input
                  type="url"
                  value={cfUrl}
                  onChange={(e) => setCfUrl(e.target.value)}
                  placeholder="https://codeforces.com/problemset/problem/4/A"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCFModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cfImporting}
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold shadow-sm disabled:opacity-50"
                >
                  {cfImporting ? 'Importing...' : 'Import Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
