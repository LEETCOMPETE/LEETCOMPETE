const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  // Contests
  getContests: () => fetchApi('/contests'),
  getContest: (id: number | string) => fetchApi(`/contests/${id}`),
  createContest: (data: any) => fetchApi('/contests', { method: 'POST', body: JSON.stringify(data) }),
  updateContest: (id: number | string, data: any) => fetchApi(`/contests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  launchContest: (id: number | string) => fetchApi(`/contests/${id}/launch`, { method: 'POST' }),
  deleteContest: (id: number | string) => fetchApi(`/contests/${id}`, { method: 'DELETE' }),
  registerContest: (id: number | string, data: any) => fetchApi(`/contests/${id}/register`, { method: 'POST', body: JSON.stringify(data) }),

  // Problems
  getProblems: (contestId: number | string) => fetchApi(`/contests/${contestId}/problems`),
  getProblem: (id: number | string) => fetchApi(`/problems/${id}`),
  createProblem: (contestId: number | string, data: any) =>
    fetchApi(`/contests/${contestId}/problems`, { method: 'POST', body: JSON.stringify(data) }),

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
