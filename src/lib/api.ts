export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include'
  });
  const data = (await res.json().catch(() => ({}))) as {error?: string} & T;
  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed.', res.status);
  }
  return data;
}

export const api = {
  login: (email: string, password: string) =>
    request<{user: import('../types').UserAccount}>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  devLogin: () =>
    request<{user: import('../types').UserAccount}>('/api/auth/dev-login', {
      method: 'POST'
    }),
  logout: () => request<{ok: boolean}>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{user: import('../types').UserAccount}>('/api/auth/me'),
  state: () => request<import('../types').AppState>('/api/state'),
  createCenter: (body: unknown) =>
    request<{center: import('../types').CommandCenter}>('/api/command-centers', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateCenter: (id: string, body: unknown) =>
    request<{center: import('../types').CommandCenter}>(`/api/command-centers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  deleteCenter: (id: string) =>
    request<{ok: boolean}>(`/api/command-centers/${id}`, { method: 'DELETE' }),
  createUser: (body: unknown) =>
    request<{user: import('../types').UserAccount;tempPassword: string}>('/api/users', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateUser: (id: string, body: unknown) =>
    request<{user: import('../types').UserAccount}>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  acknowledge: (alertId: string, command_center_id: string) =>
    request(`/api/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ command_center_id })
    }),
  dispatchResponders: (
  alertId: string,
  command_center_id: string,
  responder_ids: string[],
  lead_id: string | null) =>
  request(`/api/alerts/${alertId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ command_center_id, responder_ids, lead_id })
  }),
  reassignResponder: (assignmentId: string, responder_id: string) =>
    request(`/api/assignments/${assignmentId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ responder_id })
    }),
  resolveBranch: (alertId: string, command_center_id: string) =>
    request(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ command_center_id })
    }),
  reviewOutcome: (reviewId: string, decision: 'approved' | 'rejected', notes: string) =>
    request(`/api/reviews/${reviewId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes })
    }),
  acknowledgeCivilianReport: (id: string) =>
    request(`/api/civilian-reports/${id}/acknowledge`, { method: 'POST' }),
  updateReport: (id: string, patch: unknown) =>
    request(`/api/incident-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
};
