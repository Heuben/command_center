export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Hardcoded base URL for the Bantai ICC API as requested
const API_BASE_URL = 'https://www.bantai.online/api/v1';

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
  me: () => request<{user: import('../types').UserAccount}>('/auth/me'),
  state: () => request<import('../types').AppState>('/state'),
  createCenter: (body: unknown) =>
    request<{center: import('../types').CommandCenter}>('/command-centers', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateCenter: (id: string, body: unknown) =>
    request<{center: import('../types').CommandCenter}>(`/command-centers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  deleteCenter: (id: string) =>
    request<{ok: boolean}>(`/command-centers/${id}`, { method: 'DELETE' }),
  createUser: (body: unknown) =>
    request<{user: import('../types').UserAccount;tempPassword: string}>('/users', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateUser: (id: string, body: unknown) =>
    request<{user: import('../types').UserAccount}>(`/users/${id}`, {
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