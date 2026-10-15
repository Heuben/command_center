export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Hardcoded base URL for the Bantai ICC API as requested
const API_BASE_URL = 'https://www.bantai.online/api/v1';

import type { SystemAuditLog, UserAccount, CommandCenter, AppState, AuditCategory, AuditAction } from '../types';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Get access token from localStorage if available
  const accessToken = typeof window !== 'undefined' ? window.localStorage.getItem('bantai-access-token') : null;

  const headers = new Headers(init.headers);

  // Set Content-Type if body is present and not already set
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach Authorization header if token exists
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include' // Important for cookies (refresh token)
  });

  const data = (await res.json().catch(() => ({}))) as {error?: string} & T;
  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed.', res.status);
  }
  return data;
}

interface ResponderProfileRow {
  id: string;
  f_name: string;
  l_name: string;
  m_name: string | null;
  email: string;
  role: 'RESPONDER' | 'ADMIN' | 'SUPER';
  command_center_id: string | null;
  m_number: string | null;
  phone_verified_at: Date | null;
}

interface DashboardStatsDto {
  totalIncidents: number;
  totalActivePersonnel: number;
  totalGunIncidents: number;
  totalBladeIncidents: number;
  totalCollisionIncidents: number;
}

interface PaginatedAuditLogs {
  data: SystemAuditLog[];
  cursor: string | null;
  hasNextPage: boolean;
}

export const api = {
  login: (email: string, password: string) =>
    request<{accessToken: string; refreshToken: string}>('/auth/local/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  devLogin: () =>
    request<{accessToken: string; refreshToken: string}>('/auth/dev-login', {
      method: 'POST'
    }),
  logout: () => request<{ok: boolean}>('/auth/logout', { method: 'POST' }),
  me: async () => {
    const profile = await request<ResponderProfileRow>('/responders/profile');
    // Map the responder profile to the UserAccount shape expected by the app
    const user: UserAccount = {
      id: profile.id,
      f_name: profile.f_name,
      l_name: profile.l_name,
      email: profile.email,
      role: profile.role === 'RESPONDER' ? 'responder' :
            profile.role === 'ADMIN' ? 'admin' :
            'superadmin',
      m_number: profile.m_number,
      command_center_id: profile.command_center_id,
      account_status: undefined,
      must_change_password: undefined,
      r_profile: undefined,
      d_profile: undefined,
    };
    return { user };
  },

  // Dashboard stats
  dashboardStats: (commandCenterId?: string) => {
    const url = new URL('/dashboard/stats', API_BASE_URL);
    if (commandCenterId) url.searchParams.set('commandCenterId', commandCenterId);
    return request<DashboardStatsDto>(url.pathname + url.search, { method: 'GET' });
  },

  // Audit logs
  auditLogs: (limit?: number, cursor?: string | null, commandCenterId?: string, category?: AuditCategory, action?: AuditAction, actor?: string | null, from?: string, to?: string) => {
    const url = new URL('/audit-logs', API_BASE_URL);
    if (limit !== undefined) url.searchParams.set('limit', String(limit));
    if (cursor !== null && cursor !== undefined) url.searchParams.set('cursor', cursor);
    if (commandCenterId !== undefined) url.searchParams.set('commandCenterId', commandCenterId);
    if (category !== undefined) url.searchParams.set('category', category);
    if (action !== undefined) url.searchParams.set('action', action);
    if (actor !== null && actor !== undefined) url.searchParams.set('actor', actor);
    if (from !== undefined && from !== '') url.searchParams.set('from', from);
    if (to !== undefined && to !== '') url.searchParams.set('to', to);
    return request<PaginatedAuditLogs>(url.pathname + url.search, { method: 'GET' });
  },

  // Personnel management: get all users
  getUsers: () => request<UserAccount[]>('/users'),

  // Branch management: get all command centers
  getCommandCenters: () => request<CommandCenter[]>('/command-centers'),

  // Settings (global) - placeholder; adjust based on actual backend
  getSettings: () => request<AppState>('/settings'), // Adjust type as needed
  updateSettings: (settings: Partial<AppState>) =>
    request<AppState>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    }),
  state: () => request<AppState>('/state'),
  createCenter: (body: unknown) =>
    request<{center: CommandCenter}>('/command-centers', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateCenter: (id: string, body: unknown) =>
    request<{center: CommandCenter}>(`/command-centers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  deleteCenter: (id: string) =>
    request<{ok: boolean}>(`/command-centers/${id}`, { method: 'DELETE' }),
  createUser: (body: unknown) =>
    request<{user: UserAccount;tempPassword: string}>('/users', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateUser: (id: string, body: unknown) =>
    request<{user: UserAccount}>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  acknowledge: (alertId: string, command_center_id: string) =>
    request(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ command_center_id })
    }),
  dispatchResponders: (
    alertId: string,
    command_center_id: string,
    responder_ids: string[],
    lead_id: string | null) =>
    request(`/alerts/${alertId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ command_center_id, responder_ids, lead_id })
    }),
  reassignResponder: (assignmentId: string, responder_id: string) =>
    request(`/assignments/${assignmentId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ responder_id })
    }),
  resolveBranch: (alertId: string, command_center_id: string) =>
    request(`/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ command_center_id })
    }),
  reviewOutcome: (reviewId: string, decision: 'approved' | 'rejected', notes: string) =>
    request(`/reviews/${reviewId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes })
    }),
  acknowledgeCivilianReport: (id: string) =>
    request(`/civilian-reports/${id}/acknowledge`, { method: 'POST' }),
  updateReport: (id: string, patch: unknown) =>
    request(`/incident-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
};