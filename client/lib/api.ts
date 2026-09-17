const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(errorData.detail || `HTTP Error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: any) => fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchApi('/auth/me'),

  // Admin User Management
  getUsers: () => fetchApi('/admin/users'),
  createUser: (data: any) => fetchApi('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUserRole: (id: number | string, role: string) => fetchApi(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  deleteUser: (id: number | string) => fetchApi(`/admin/users/${id}`, { method: 'DELETE' }),

  // Contests
  getContests: () => fetchApi('/contests'),
  getContest: (id: number | string) => fetchApi(`/contests/${id}`),
  createContest: (data: any) => fetchApi('/contests', { method: 'POST', body: JSON.stringify(data) }),
  updateContest: (id: number | string, data: any) => fetchApi(`/contests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  launchContest: (id: number | string) => fetchApi(`/contests/${id}/launch`, { method: 'POST' }),
  deleteContest: (id: number | string) => fetchApi(`/contests/${id}`, { method: 'DELETE' }),
  registerContest: (id: number | string, data: any) => fetchApi(`/contests/${id}/register`, { method: 'POST', body: JSON.stringify(data) }),
  getContestRegistrations: (id: number | string) => fetchApi(`/contests/${id}/registrations`),

  // Problems
  getAllProblems: (filters?: { difficulty?: string; contestId?: number | string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.contestId) params.append('contest_id', String(filters.contestId));
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/problems${query}`);
  },
  getProblems: (contestId: number | string) => fetchApi(`/contests/${contestId}/problems`),
  getProblem: (id: number | string) => fetchApi(`/problems/${id}`),
  createProblem: (contestId: number | string, data: any) =>
    fetchApi(`/contests/${contestId}/problems`, { method: 'POST', body: JSON.stringify(data) }),
  createProblemDirect: (data: any, contestId?: number | string | null) => {
    const query = contestId ? `?contest_id=${contestId}` : '';
    return fetchApi(`/problems${query}`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateProblem: (id: number | string, data: any) =>
    fetchApi(`/problems/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProblem: (id: number | string) =>
    fetchApi(`/problems/${id}`, { method: 'DELETE' }),
  publishContestProblems: (contestId: number | string) =>
    fetchApi(`/contests/${contestId}/publish-problems`, { method: 'POST' }),
  importCodeforcesProblem: (contestId: number | string, url: string) =>
    fetchApi(`/contests/${contestId}/import-codeforces`, { method: 'POST', body: JSON.stringify({ url }) }),
  parseCodeforcesProblem: (url: string) =>
    fetchApi('/parse-codeforces', { method: 'POST', body: JSON.stringify({ url }) }),
  parseTestCasesJson: (jsonContent: string) =>
    fetchApi('/parse-test-cases-json', { method: 'POST', body: JSON.stringify({ json_content: jsonContent }) }),

  // Submissions
  submitCode: (data: any) => fetchApi('/submissions', { method: 'POST', body: JSON.stringify(data) }),
  getSubmissions: (contestId?: number | string, userId?: number | string, problemId?: number | string) => {
    const params = new URLSearchParams();
    if (contestId) params.append('contest_id', String(contestId));
    if (userId) params.append('user_id', String(userId));
    if (problemId) params.append('problem_id', String(problemId));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/submissions${query}`);
  },

  // Leaderboard
  getLeaderboard: (contestId: number | string) => fetchApi(`/contests/${contestId}/leaderboard`),
};
