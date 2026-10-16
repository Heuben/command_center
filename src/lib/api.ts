export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Hardcoded base URL for the Bantai ICC API as requested
const API_BASE_URL = 'https://www.bantai.online/api/v1';

import type { SystemAuditLog, UserAccount, CommandCenter, AuditCategory, AuditAction } from '../types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const AUTH_TOKENS_REFRESHED_EVENT = 'bantai:tokens-refreshed';
export const SESSION_EXPIRED_EVENT = 'bantai:session-expired';

const ACCESS_TOKEN_KEY = 'bantai-access-token';
const REFRESH_TOKEN_KEY = 'bantai-refresh-token';
let refreshInFlight: Promise<AuthTokens | null> | null = null;

function saveAuthTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function refreshAuthTokens(): Promise<AuthTokens | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = typeof window !== 'undefined'
    ? window.localStorage.getItem(REFRESH_TOKEN_KEY)
    : null;
  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });
      const tokens = await response.json().catch(() => ({})) as Partial<AuthTokens>;
      if (!response.ok || !tokens.accessToken || !tokens.refreshToken) {
        clearAuthTokens();
        return null;
      }

      const authTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
      saveAuthTokens(authTokens);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_TOKENS_REFRESHED_EVENT));
      }
      return authTokens;
    } catch {
      clearAuthTokens();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function fetchWithToken(path: string, init: RequestInit, accessToken: string | null): Promise<Response> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include'
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = typeof window !== 'undefined'
    ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
    : null;
  let response = await fetchWithToken(path, init, accessToken);

  if (response.status === 401 && !path.startsWith('/auth/')) {
    const tokens = await refreshAuthTokens();
    if (tokens) {
      response = await fetchWithToken(path, init, tokens.accessToken);
    }
  }

  const data = (await response.json().catch(() => ({}))) as {error?: string} & T;
  if (!response.ok) {
    throw new ApiError(data.error || 'Request failed.', response.status);
  }
  return data;
}

interface ResponderProfileRow {
  id: string;
  f_name: string;
  l_name: string;
  m_name: string | null;
  email: string;
  role: 'RESPONDER' | 'ADMIN' | 'SUPER' | 'DRIVER' | 'responder' | 'admin' | 'super' | 'superadmin' | 'driver';
  command_center_id: string | null;
  m_number: string | null;
  phone_verified_at: Date | null;
}

function mapProfileRole(role: ResponderProfileRow['role']): UserAccount['role'] {
  switch (role.toLowerCase()) {
    case 'responder':
      return 'responder';
    case 'admin':
      return 'admin';
    case 'super':
    case 'superadmin':
      return 'superadmin';
    case 'driver':
      return 'driver';
    default:
      throw new ApiError('Unsupported profile role.', 500);
  }
}

export interface ResponderTableRow {
  id: string;
  f_name: string;
  l_name: string;
  m_name: string | null;
  role: 'responder' | 'admin' | 'super';
  email: string;
  rank: string;
  agency: 'police' | 'barangay_tanod' | 'mdrrmo';
  availability: 'on_duty' | 'off_duty' | 'dispatched';
}

interface DashboardStatsDto {
  totalIncidents: number;
  totalActivePersonnel: number;
  totalGunIncidents: number;
  totalBladeIncidents: number;
  totalCollisionIncidents: number;
}

interface GlobalSettings {
  infrastructureRegion: string;
  apiBaseUrl: string;
  webhookUrl: string;
  aiConfidenceThreshold: number;
  defaultRoutingMode: 'nearest' | 'balanced';
  branchProvisioning: 'manual' | 'approved';
}

interface PaginatedAuditLogs {
  data: SystemAuditLog[];
  cursor: string | null;
  hasNextPage: boolean;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthTokens>('/auth/local/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  devLogin: () =>
    request<AuthTokens>('/auth/dev-login', {
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
      m_name: profile.m_name,
      email: profile.email,
      role: mapProfileRole(profile.role),
      m_number: profile.m_number ?? undefined,
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

  // Personnel management: get all users or branch-scoped responders
  getUsers: async (centerId?: string) => {
    if (centerId) {
      return api.getBranchResponders(centerId);
    }

    try {
      return await request<UserAccount[]>('/users');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return [] as UserAccount[];
      }
      throw error;
    }
  },
  getBranchResponders: async (centerId: string): Promise<UserAccount[]> => {
    const rows = await request<ResponderTableRow[]>(`/command-centers/${centerId}/responders`);
    return (rows ?? []).map((row) => ({
      id: row.id,
      f_name: row.f_name,
      l_name: row.l_name,
      m_name: row.m_name,
      email: row.email,
      role: row.role === 'super' ? 'superadmin' : row.role === 'admin' ? 'admin' : 'responder',
      m_number: undefined,
      command_center_id: centerId,
      account_status: undefined,
      must_change_password: undefined,
      r_profile: {
        agency: row.agency,
        call_sign: null,
        rank: row.rank,
        availability: row.availability
      }
    }));
  },

  // Branch management: get all command centers
  getCommandCenters: () => request<CommandCenter[]>('/command-centers'),

  // Settings (global) - placeholder; adjust based on actual backend
  getSettings: () => request<GlobalSettings>('/settings'),
  updateSettings: (settings: Partial<GlobalSettings>) =>
    request<GlobalSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    }),
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