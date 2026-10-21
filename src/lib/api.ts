export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type AuthResponse = {
  user?: import('../types').UserAccount;
  accessToken?: string;
  refreshToken?: string;
};

type ResponderProfilePatch = Partial<import('../types').ResponderProfile>;

const AUTH_LOGIN_PATH =
  import.meta.env.VITE_AUTH_LOGIN_PATH ||
  'https://www.bantai.online/api/v1/auth/local/signin';
const AUTH_REFRESH_PATH =
  import.meta.env.VITE_AUTH_REFRESH_PATH || '/api/v1/auth/refresh';
const AUTH_ME_PATH = import.meta.env.VITE_AUTH_ME_PATH || '/api/auth/me';
const AUTH_LOGOUT_PATH =
  import.meta.env.VITE_AUTH_LOGOUT_PATH || '/api/auth/logout';
const AUTH_PASSWORD_RESET_REQUEST_PATH =
  import.meta.env.VITE_AUTH_PASSWORD_RESET_REQUEST_PATH ||
  '/api/auth/password-reset/request';
const AUTH_PASSWORD_RESET_CONFIRM_PATH =
  import.meta.env.VITE_AUTH_PASSWORD_RESET_CONFIRM_PATH ||
  '/api/auth/password-reset/confirm';
const RESPONDER_PROFILE_PATH =
  import.meta.env.VITE_RESPONDER_PROFILE_PATH ||
  'https://www.bantai.online/api/v1/responders/profile';

let accessToken: string | null = null;
let refreshInFlight: Promise<void> | null = null;

function readErrorMessage(data: {error?: unknown;message?: unknown}): string {
  if (typeof data.error === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.message)) return data.message.join(', ');
  return 'Request failed.';
}

async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  const data =
    body && typeof body === 'object'
      ? (body as {error?: unknown;message?: unknown} & T)
      : ({} as {error?: unknown;message?: unknown} & T);
  if (!response.ok) {
    throw new ApiError(readErrorMessage(data), response.status);
  }
  return data;
}

async function refreshAccessToken(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(AUTH_REFRESH_PATH, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await readResponse<AuthResponse>(response);
        if (typeof data.accessToken !== 'string' || !data.accessToken) {
          throw new ApiError('Refresh response did not include an access token.', 401);
        }
        accessToken = data.accessToken;
      } catch (error) {
        accessToken = null;
        throw error;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: {skipAuth?: boolean;skipRefresh?: boolean;} = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const send = () =>
    fetch(path, {
      ...init,
      headers,
      credentials: 'include'
    });
  let response = await send();

  if (response.status === 401 && !options.skipRefresh) {
    await refreshAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    response = await send();
    if (response.status === 401) {
      accessToken = null;
    }
  }

  return readResponse<T>(response);
}

export const api = {
  login: async (email: string, password: string) => {
    if (!email || !password || password.length > 128) {
      throw new ApiError('Enter a valid email and a password up to 128 characters.', 400);
    }
    accessToken = null;
    const data = await request<AuthResponse>(
      AUTH_LOGIN_PATH,
      {
        method: 'POST',
        body: JSON.stringify({ email, password })
      },
      { skipAuth: true, skipRefresh: true }
    );
    accessToken =
      typeof data.accessToken === 'string' && data.accessToken
        ? data.accessToken
        : null;
    return data;
  },
  requestPasswordReset: (email: string) =>
    request<{ok: boolean}>(
      AUTH_PASSWORD_RESET_REQUEST_PATH,
      {
        method: 'POST',
        body: JSON.stringify({ email })
      },
      { skipAuth: true, skipRefresh: true }
    ),
  resetPassword: (token: string, password: string) =>
    request<{ok: boolean}>(
      AUTH_PASSWORD_RESET_CONFIRM_PATH,
      {
        method: 'POST',
        body: JSON.stringify({ token, password })
      },
      { skipAuth: true, skipRefresh: true }
    ),
  devLogin: () =>
    request<AuthResponse>(
      '/api/auth/dev-login',
      { method: 'POST' },
      { skipAuth: true, skipRefresh: true }
    ),
  logout: () =>
    request<{ok: boolean}>(AUTH_LOGOUT_PATH, { method: 'POST' }),
  me: () => request<{user: import('../types').UserAccount}>(AUTH_ME_PATH),
  patchResponderProfile: (patch: ResponderProfilePatch) =>
    request<import('../types').ResponderProfile>(
      RESPONDER_PROFILE_PATH,
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      }
    ),
  clearAccessToken: () => {
    accessToken = null;
  },
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
