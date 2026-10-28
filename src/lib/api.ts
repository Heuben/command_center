export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Hardcoded base URL for the Bantai ICC API as requested
const API_BASE_URL = 'https://www.bantai.online/api/v1';

import type {
  SystemAuditLog,
  UserAccount,
  CommandCenter,
  AuditAction,
  AuditTargetEntity,
  Agency,
} from '../types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const AUTH_TOKENS_REFRESHED_EVENT = 'bantai:tokens-refreshed';
export const SESSION_EXPIRED_EVENT = 'bantai:session-expired';

const ACCESS_TOKEN_KEY = 'bantai-access-token';
const REFRESH_TOKEN_KEY = 'bantai-refresh-token';
let refreshInFlight: Promise<AuthTokens | null> | null = null;
const reverseGeocodeCache = new Map<string, Promise<string>>();

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

  const refreshToken =
    typeof window !== 'undefined'
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
        credentials: 'include',
      });
      const tokens = (await response.json().catch(() => ({}))) as Partial<AuthTokens>;
      if (!response.ok || !tokens.accessToken || !tokens.refreshToken) {
        clearAuthTokens();
        return null;
      }

      const authTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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

async function fetchWithToken(
  path: string,
  init: RequestInit,
  accessToken: string | null,
): Promise<Response> {
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
    credentials: 'include',
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
      : null;
  let response = await fetchWithToken(path, init, accessToken);

  if (response.status === 401 && !path.startsWith('/auth/')) {
    const tokens = await refreshAuthTokens();
    if (tokens) {
      response = await fetchWithToken(path, init, tokens.accessToken);
    }
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string | string[];
  } & T;
  if (!response.ok) {
    // NestJS default error shape is { statusCode, message, error }, where
    // `message` is the actual message and `error` is the reason phrase.
    const rawMsg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new ApiError(rawMsg || data.error || 'Request failed.', response.status);
  }
  return data;
}

// ============================================================================
// INCIDENT REPORT TYPES
// ============================================================================
// String unions on purpose — the backend sends plain strings, do NOT convert
// to TS `enum` (they'd be nominal and fight with the JSON layer).
export type ReportStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'needs_revision'
  | 'approved';

export type IncidentStatus =
  | 'DETECTED'
  | 'DISPATCHING'
  | 'CLAIMED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'AWAITING_VERIFICATION'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CANCELLED';

export type ThreatCategory = 'ASSIST' | 'DE_ESCALATABLE' | 'HAZARD';
export type ThreatLevel = 'ACTIVE_THREAT' | 'DE_ESCALATED' | 'CLEAR';
export type TriggerSource =
  | 'EDGE_AI'
  | 'MANUAL_SOS'
  | 'CRASH_IMU'
  | 'CENTER_MANUAL';
export type IncidentDisposition =
  | 'treated_on_scene_refused_transport'
  | 'scene_secured_by_police'
  | 'vehicle_towed_traffic_cleared'
  | 'handled_by_barangay'
  | 'false_alarm';
export type IncidentOutcome = 'confirmed' | 'false_positive';

export type ReportSortBy =
  | 'status'
  | 'created_at'
  | 'updated_at'
  | 'submitted_at'
  | 'reviewed_at';
export type SortOrder = 'asc' | 'desc';

/** One report joined with its parent incident's context. */
export interface IncidentReportEntity {
  id: string;
  incident_id: string;
  command_center_id: string;
  assigned_reporter_id: string | null;
  submitted_by_id: string | null;
  disposition: IncidentDisposition | null;
  summary: string;
  detailed_narrative: string | null;
  evidence_urls: string[];
  status: ReportStatus;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;

  incident_status: IncidentStatus;
  incident_threat_category: ThreatCategory;
  incident_threat_level: ThreatLevel;
  incident_verified_at: string | null;
  incident_verified_by_id: string | null;
  incident_trigger_source: TriggerSource;
  incident_claimed_by_id: string | null;
  incident_claimed_by_name: string | null;

  is_report_draft: boolean;
  is_report_pending_review: boolean;
  is_report_approved: boolean;
  is_report_rejected: boolean;
  is_report_final: boolean;
  is_incident_verified: boolean;
  is_incident_resolved: boolean;
  is_incident_cancelled: boolean;
  is_incident_pending_verification: boolean;
  needs_incident_verification: boolean;
}

/** Badge counts, matches GET /incident-reports/summary. */
export interface IncidentReportSummary {
  total: number;
  draft: number;
  submitted: number;
  under_review: number;
  needs_revision: number;
  approved: number;
  pending_review: number;
  awaiting_verification: number;
  request_revision: number;
  awaiting_submission: number;
}

/** Envelope for offset-paginated lists. */
export interface OffsetPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Envelope for cursor-paginated lists. */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export type IncidentTimelineKind =
  | 'incident_created'
  | 'wave_issued'
  | 'responder_offered'
  | 'responder_claimed'
  | 'responder_en_route'
  | 'responder_arrived'
  | 'incident_escalated'
  | 'verification_completed'
  | 'incident_resolved'
  | 'incident_cancelled'
  | 'report_created'
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected';

export interface IncidentTimelineEvent {
  at: string;
  kind: IncidentTimelineKind;
  actor_id: string | null;
  actor_name: string | null;
  details: Record<string, unknown>;
}

export interface IncidentTimelineResponse {
  incident_id: string;
  events: IncidentTimelineEvent[];
}

export interface ListIncidentReportsFilters {
  status?: ReportStatus;
  statuses?: ReportStatus[];
  incident_statuses?: IncidentStatus[];
  trigger_sources?: TriggerSource[];
  from_date?: string; // YYYY-MM-DD, Asia/Manila
  to_date?: string; // YYYY-MM-DD, Asia/Manila
  sort_by?: ReportSortBy;
  sort_order?: SortOrder;
  limit?: number;
  offset?: number;
  command_center_id?: string;
  assigned_reporter_id?: string;
}

export interface IncidentReportSummaryFilters {
  command_center_id?: string;
  assigned_reporter_id?: string;
  status?: ReportStatus;
  statuses?: ReportStatus[];
  incident_statuses?: IncidentStatus[];
  trigger_sources?: TriggerSource[];
  from_date?: string;
  to_date?: string;
}

export interface AwaitingReviewFilters {
  command_center_id?: string;
  trigger_sources?: TriggerSource[];
  from_date?: string;
  to_date?: string;
  limit?: number;
  cursor?: string;
}

// ============================================================================
// FILTER -> QUERY-STRING HELPERS
// ============================================================================

function appendReportListFilters(
  params: URLSearchParams,
  f: ListIncidentReportsFilters,
): void {
  if (f.status) params.set('status', f.status);
  f.statuses?.forEach((s) => params.append('statuses', s));
  f.incident_statuses?.forEach((s) => params.append('incident_statuses', s));
  f.trigger_sources?.forEach((s) => params.append('trigger_sources', s));
  if (f.from_date) params.set('from_date', f.from_date);
  if (f.to_date) params.set('to_date', f.to_date);
  if (f.sort_by) params.set('sort_by', f.sort_by);
  if (f.sort_order) params.set('sort_order', f.sort_order);
  if (f.limit !== undefined) params.set('limit', String(f.limit));
  if (f.offset !== undefined) params.set('offset', String(f.offset));
  if (f.command_center_id) params.set('command_center_id', f.command_center_id);
  if (f.assigned_reporter_id)
    params.set('assigned_reporter_id', f.assigned_reporter_id);
}

function appendSummaryFilters(
  params: URLSearchParams,
  f: IncidentReportSummaryFilters,
): void {
  if (f.command_center_id) params.set('command_center_id', f.command_center_id);
  if (f.assigned_reporter_id)
    params.set('assigned_reporter_id', f.assigned_reporter_id);
  if (f.status) params.set('status', f.status);
  f.statuses?.forEach((s) => params.append('statuses', s));
  f.incident_statuses?.forEach((s) => params.append('incident_statuses', s));
  f.trigger_sources?.forEach((s) => params.append('trigger_sources', s));
  if (f.from_date) params.set('from_date', f.from_date);
  if (f.to_date) params.set('to_date', f.to_date);
}

function appendAwaitingReviewFilters(
  params: URLSearchParams,
  f: AwaitingReviewFilters,
): void {
  if (f.command_center_id) params.set('command_center_id', f.command_center_id);
  f.trigger_sources?.forEach((s) => params.append('trigger_sources', s));
  if (f.from_date) params.set('from_date', f.from_date);
  if (f.to_date) params.set('to_date', f.to_date);
  if (f.limit !== undefined) params.set('limit', String(f.limit));
  if (f.cursor) params.set('cursor', f.cursor);
}

// ============================================================================
// EXISTING INTERFACES (unchanged)
// ============================================================================

interface ResponderProfileRow {
  id: string;
  f_name: string;
  l_name: string;
  m_name: string | null;
  email: string;
  role:
    | 'RESPONDER'
    | 'ADMIN'
    | 'SUPER'
    | 'DRIVER'
    | 'responder'
    | 'admin'
    | 'super'
    | 'superadmin'
    | 'driver';
  command_center_id: string | null;
  command_center_name?: string | null;
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
  account_status: 'active' | 'pending_activation' | 'deactivated';
  email: string;
  rank: string;
  agency: 'police' | 'barangay_tanod' | 'mdrrmo';
  availability: ResponderAvailability;
}

export type ResponderAccountStatus = 'active' | 'deactivated' | 'pending_activation';

interface StatusResponderRow {
  id: string;
  f_name: string;
  l_name: string;
  m_name: string | null;
  role: string;
  account_status: ResponderAccountStatus;
  email: string;
  rank: string;
  agency: string;
  availability: ResponderAvailability;
}

export interface RespondersStatusPage {
  data: UserAccount[];
  nextCursor: string | null;
}

export type ResponderAvailability =
  | 'on_duty'
  | 'off_duty'
  | 'dispatched'
  | 'en_route';

export interface ResponderFilters {
  status?: ResponderAccountStatus[];
  availability?: ResponderAvailability[];
  agency?: Agency[];
  search?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
  onShift?: boolean;
  includeSoftDeleted?: boolean;
  limit?: number;
  cursor?: string;
}

export interface CommandCenterActor {
  id: string;
  name: string;
}

function mapAgency(value: string): Agency {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('police')) return 'police';
  if (normalized.includes('barangay') || normalized.includes('tanod'))
    return 'barangay_tanod';
  if (normalized.includes('mdrrmo')) return 'mdrrmo';
  throw new ApiError('Unsupported responder agency.', 500);
}

function mapResponderRow(row: StatusResponderRow, centerId: string): UserAccount {
  return {
    id: row.id,
    f_name: row.f_name,
    l_name: row.l_name,
    m_name: row.m_name,
    email: row.email,
    role: row.role.toLowerCase() === 'admin' ? 'admin' : 'responder',
    m_number: undefined,
    command_center_id: centerId,
    account_status: row.account_status,
    must_change_password: undefined,
    r_profile: {
      agency: mapAgency(row.agency),
      call_sign: null,
      rank: row.rank,
      availability: row.availability,
    },
  };
}

function appendQueryValue(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value !== undefined && value !== '') params.set(key, value);
}

function mapCommandCenterInput(
  payload: Partial<Pick<CommandCenter, 'name' | 'type' | 'branch' | 'location'>>,
): Record<string, unknown> {
  const { name, type, branch, location } = payload;
  return {
    ...(name !== undefined ? { name } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(branch !== undefined ? { branch } : {}),
    ...(location !== undefined
      ? { location: { latitude: location.lat, longitude: location.lng } }
      : {}),
  };
}

function normalizeLocation(rawLocation: unknown): { lat: number; lng: number } {
  if (!rawLocation || typeof rawLocation !== 'object') {
    return { lat: 0, lng: 0 };
  }

  const location = rawLocation as Record<string, unknown>;
  const lat = Number(location.lat ?? location.latitude ?? location.latitide ?? 0);
  const lng = Number(
    location.lng ??
      location.longitude ??
      location.longtitude ??
      location.lon ??
      0,
  );

  return {
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
  };
}

function normalizeCommandCenter(
  raw: Partial<CommandCenter> & Record<string, unknown>,
): CommandCenter {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'Unnamed Command Center'),
    branch: String(raw.branch ?? ''),
    type: (raw.type as CommandCenter['type']) ?? 'barangay',
    location: normalizeLocation(raw.location),
    admin_ids: Array.isArray(raw.admin_ids)
      ? raw.admin_ids.filter((id): id is string => typeof id === 'string')
      : [],
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

export interface CreateResponderDto {
  f_name: string;
  l_name: string;
  m_name?: string;
  email: string;
  role?: 'responder' | 'admin';
  agency?: Agency;
  call_sign?: string;
  rank?: string;
  m_number?: string;
  command_center_id?: string;
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

interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  commandCenterId: string | null;
  action: AuditAction;
  targetEntity: AuditTargetEntity;
  targetId: string;
  oldPayload: Record<string, unknown> | null;
  newPayload: Record<string, unknown> | null;
  createdAt: string;
}

function mapAuditLog(row: AuditLogDto): SystemAuditLog {
  return {
    id: row.id,
    actor_id: row.actorId,
    actor_name: row.actorName,
    command_center_id: row.commandCenterId,
    action: row.action,
    target_entity: row.targetEntity,
    target_id: row.targetId,
    reference: row.targetId,
    created_at: row.createdAt,
    old_value: row.oldPayload,
    new_value: row.newPayload,
  };
}

interface AuditLogsResponse {
  data: AuditLogDto[];
  nextCursor: string | null;
}

export interface AuditLogFilters {
  limit?: number;
  cursor?: string | null;
  commandCenterId?: string;
  category?: AuditTargetEntity[];
  action?: AuditAction[];
  actorId?: string;
  from?: string;
  to?: string;
}

export interface AuditLogDetailFilters {
  createdAt?: string;
  commandCenterId?: string;
}

// ============================================================================
// API OBJECT
// ============================================================================

export const api = {
  login: (email: string, password: string) =>
    request<AuthTokens>('/auth/local/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  devLogin: () =>
    request<AuthTokens>('/auth/dev-login', {
      method: 'POST',
    }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: async () => {
    const profile = await request<ResponderProfileRow>('/responders/profile');
    const user: UserAccount = {
      id: profile.id,
      f_name: profile.f_name,
      l_name: profile.l_name,
      m_name: profile.m_name,
      email: profile.email,
      role: mapProfileRole(profile.role),
      m_number: profile.m_number ?? undefined,
      command_center_id: profile.command_center_id,
      ...(profile.command_center_name !== undefined
        ? { command_center_name: profile.command_center_name }
        : {}),
      account_status: undefined,
      must_change_password: undefined,
      r_profile: undefined,
      d_profile: undefined,
    };
    return { user };
  },

  dashboardStats: (commandCenterId?: string) => {
    const url = new URL('/dashboard/stats', API_BASE_URL);
    if (commandCenterId) url.searchParams.set('commandCenterId', commandCenterId);
    return request<DashboardStatsDto>(url.pathname + url.search, {
      method: 'GET',
    });
  },

  auditLogs: async (filters: AuditLogFilters = {}): Promise<PaginatedAuditLogs> => {
    const url = new URL('/audit-logs', API_BASE_URL);
    if (filters.limit !== undefined)
      url.searchParams.set('limit', String(filters.limit));
    if (filters.cursor) url.searchParams.set('cursor', filters.cursor);
    if (filters.commandCenterId)
      url.searchParams.set('commandCenterId', filters.commandCenterId);
    filters.category?.forEach((category) =>
      url.searchParams.append('category', category),
    );
    filters.action?.forEach((action) =>
      url.searchParams.append('action', action),
    );
    if (filters.actorId) url.searchParams.set('actorId', filters.actorId);
    if (filters.from) url.searchParams.set('from', filters.from);
    if (filters.to) url.searchParams.set('to', filters.to);
    const response = await request<AuditLogsResponse>(
      url.pathname + url.search,
      { method: 'GET' },
    );
    return {
      data: (response.data ?? []).map(mapAuditLog),
      cursor: response.nextCursor ?? null,
      hasNextPage: !!response.nextCursor,
    };
  },
  auditLog: async (
    id: string,
    filters: AuditLogDetailFilters = {},
  ): Promise<SystemAuditLog> => {
    const url = new URL(`/audit-logs/${encodeURIComponent(id)}`, API_BASE_URL);
    if (filters.createdAt) url.searchParams.set('createdAt', filters.createdAt);
    if (filters.commandCenterId)
      url.searchParams.set('commandCenterId', filters.commandCenterId);
    const response = await request<AuditLogDto>(url.pathname + url.search, {
      method: 'GET',
    });
    return mapAuditLog(response);
  },

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
    const rows = await request<ResponderTableRow[]>(
      `/command-centers/${centerId}/responders`,
    );
    return (rows ?? []).map((row) => ({
      id: row.id,
      f_name: row.f_name,
      l_name: row.l_name,
      m_name: row.m_name,
      email: row.email,
      role:
        row.role === 'super'
          ? 'superadmin'
          : row.role === 'admin'
          ? 'admin'
          : 'responder',
      m_number: undefined,
      command_center_id: centerId,
      account_status: row.account_status,
      must_change_password: undefined,
      r_profile: {
        agency: row.agency,
        call_sign: null,
        rank: row.rank,
        availability: row.availability,
      },
    }));
  },
  getRespondersByStatus: async (
    centerId: string,
    status: ResponderAccountStatus,
    cursor?: string | null,
    limit?: number,
  ): Promise<RespondersStatusPage> => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const serializedParams = params.toString();
    const query = serializedParams ? `?${serializedParams}` : '';
    const page = await request<{
      data: StatusResponderRow[];
      nextCursor: string | null;
    }>(
      `/command-centers/${encodeURIComponent(
        centerId,
      )}/responders/status/${encodeURIComponent(status)}${query}`,
    );
    return {
      data: (page.data ?? []).map((row) => mapResponderRow(row, centerId)),
      nextCursor: page.nextCursor ?? null,
    };
  },
  getBranchRespondersPaginated: async (
    centerId: string,
    limit?: number,
    cursor?: string | null,
  ): Promise<RespondersStatusPage> => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const serializedParams = params.toString();
    const query = serializedParams ? `?${serializedParams}` : '';
    const page = await request<{
      data: StatusResponderRow[];
      nextCursor: string | null;
    }>(
      `/command-centers/${encodeURIComponent(
        centerId,
      )}/responders/paginated${query}`,
    );
    return {
      data: (page.data ?? []).map((row) => mapResponderRow(row, centerId)),
      nextCursor: page.nextCursor ?? null,
    };
  },
  filterBranchResponders: async (
    centerId: string,
    filters: ResponderFilters = {},
  ): Promise<RespondersStatusPage> => {
    const params = new URLSearchParams();
    filters.status?.forEach((value) => params.append('status', value));
    filters.availability?.forEach((value) =>
      params.append('availability', value),
    );
    filters.agency?.forEach((value) => params.append('agency', value));
    appendQueryValue(params, 'search', filters.search);
    appendQueryValue(params, 'createdFrom', filters.createdFrom);
    appendQueryValue(params, 'createdTo', filters.createdTo);
    appendQueryValue(params, 'updatedFrom', filters.updatedFrom);
    appendQueryValue(params, 'updatedTo', filters.updatedTo);
    appendQueryValue(params, 'lastActiveFrom', filters.lastActiveFrom);
    appendQueryValue(params, 'lastActiveTo', filters.lastActiveTo);
    if (filters.onShift !== undefined)
      params.set('onShift', String(filters.onShift));
    if (filters.includeSoftDeleted !== undefined) {
      params.set('includeSoftDeleted', String(filters.includeSoftDeleted));
    }
    if (filters.limit !== undefined)
      params.set('limit', String(filters.limit));
    appendQueryValue(params, 'cursor', filters.cursor);
    const serializedParams = params.toString();
    const query = serializedParams ? `?${serializedParams}` : '';
    const page = await request<{
      data: StatusResponderRow[];
      nextCursor: string | null;
    }>(
      `/command-centers/${encodeURIComponent(
        centerId,
      )}/responders/filter${query}`,
    );
    return {
      data: (page.data ?? []).map((row) => mapResponderRow(row, centerId)),
      nextCursor: page.nextCursor ?? null,
    };
  },
  getBranchActors: (centerId: string) =>
    request<CommandCenterActor[]>(
      `/command-centers/${encodeURIComponent(centerId)}/actors`,
    ),
  deactivateResponder: (centerId: string, responderId: string) =>
    request<void>(
      `/command-centers/${encodeURIComponent(
        centerId,
      )}/responders/${encodeURIComponent(responderId)}/deactivate`,
      { method: 'PATCH' },
    ),
  activateResponder: (centerId: string, responderId: string) =>
    request<void>(
      `/command-centers/${encodeURIComponent(
        centerId,
      )}/responders/${encodeURIComponent(responderId)}/activate`,
      { method: 'PATCH' },
    ),
  revokeResponderSessions: (centerId: string, responderId: string) =>
    request<void>(
      `/command-centers/${encodeURIComponent(
        centerId,
      )}/responders/${encodeURIComponent(responderId)}/revoke-sessions`,
      { method: 'POST' },
    ),
  forceResponderPasswordReset: (centerId: string, responderId: string) =>
    request<void>(
      `/command-centers/${encodeURIComponent(
        centerId,
      )}/responders/${encodeURIComponent(responderId)}/force-password-reset`,
      { method: 'POST' },
    ),
  updateResponderEmail: (
    centerId: string,
    responderId: string,
    email: string,
  ) =>
    request<void>(
      `/command-centers/${encodeURIComponent(
        centerId,
      )}/responders/${encodeURIComponent(responderId)}/email`,
      { method: 'PATCH', body: JSON.stringify({ email }) },
    ),
  getMyCommandCenter: async (): Promise<CommandCenter> => {
    const center = await request<
      Partial<CommandCenter> & Record<string, unknown>
    >('/command-centers/me');
    return normalizeCommandCenter(center);
  },

  getCommandCenters: async () => {
    const centers = await request<
      Array<Partial<CommandCenter> & Record<string, unknown>>
    >('/command-centers');
    return centers.map(normalizeCommandCenter);
  },
  reverseGeocode: async (lat: number, lng: number): Promise<string> => {
    const safeLat = Number(lat);
    const safeLng = Number(lng);
    if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) {
      return `${lat}, ${lng}`;
    }

    const key = `${safeLat.toFixed(5)},${safeLng.toFixed(5)}`;
    const cached = reverseGeocodeCache.get(key);
    if (cached) return cached;

    const requestPromise = (async () => {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.search = new URLSearchParams({
        format: 'jsonv2',
        lat: String(safeLat),
        lon: String(safeLng),
        zoom: '18',
      }).toString();

      const response = await fetch(url.toString(), {
        headers: {
          'Accept-Language': 'en',
        },
      });

      const fallback = `${safeLat.toFixed(5)}, ${safeLng.toFixed(5)}`;
      if (!response.ok) {
        console.warn('[bantai:geo] reverse geocode failed', {
          lat: safeLat,
          lng: safeLng,
          status: response.status,
        });
        return fallback;
      }

      const data = (await response.json().catch(() => null)) as {
        display_name?: string;
      } | null;
      const resolved = data?.display_name || fallback;
      if (typeof window !== 'undefined') {
        (window as any).__bantaiDebug = {
          ...(window as any).__bantaiDebug,
          reverseGeocode: {
            ...(window as any).__bantaiDebug?.reverseGeocode,
            [key]: {
              lat: safeLat,
              lng: safeLng,
              display_name: resolved,
              fetched_at: new Date().toISOString(),
            },
          },
        };
      }
      console.debug('[bantai:geo] resolved', { key, resolved });
      return resolved;
    })();

    reverseGeocodeCache.set(key, requestPromise);
    return requestPromise;
  },

  getSettings: () => request<GlobalSettings>('/settings'),
  updateSettings: (settings: Partial<GlobalSettings>) =>
    request<GlobalSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
  createCenter: (
    body: Pick<CommandCenter, 'name' | 'type' | 'branch' | 'location'>,
  ) => {
    return request<{ center: CommandCenter }>('/command-centers', {
      method: 'POST',
      body: JSON.stringify(mapCommandCenterInput(body)),
    });
  },
  updateCenter: (
    id: string,
    body: Partial<Pick<CommandCenter, 'name' | 'type' | 'branch' | 'location'>>,
  ) => {
    return request<{ center: CommandCenter }>(
      `/command-centers/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(mapCommandCenterInput(body)),
      },
    );
  },
  deleteCenter: (id: string) =>
    request<void>(`/command-centers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  createUser: (body: unknown) =>
    request<{ user: UserAccount; tempPassword: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createResponder: (body: CreateResponderDto) =>
    request<string>('/responders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateUser: (id: string, body: unknown) =>
    request<{ user: UserAccount }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  acknowledge: (alertId: string, command_center_id: string) =>
    request(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ command_center_id }),
    }),
  dispatchResponders: (
    alertId: string,
    command_center_id: string,
    responder_ids: string[],
    lead_id: string | null,
  ) =>
    request(`/alerts/${alertId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ command_center_id, responder_ids, lead_id }),
    }),
  reassignResponder: (assignmentId: string, responder_id: string) =>
    request(`/assignments/${assignmentId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ responder_id }),
    }),
  resolveBranch: (alertId: string, command_center_id: string) =>
    request(`/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ command_center_id }),
    }),
  reviewOutcome: (
    reviewId: string,
    decision: 'approved' | 'rejected',
    notes: string,
  ) =>
    request(`/reviews/${reviewId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    }),
  acknowledgeCivilianReport: (id: string) =>
    request(`/civilian-reports/${id}/acknowledge`, { method: 'POST' }),
  updateReport: (id: string, patch: unknown) =>
    request(`/incident-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  // ==========================================================================
  // NEW: Incident Reports (list / summary / awaiting-review)
  // ==========================================================================

  /** Per-status badge counts. Same filters as listIncidentReports. */
  incidentReportsSummary: (filters: IncidentReportSummaryFilters = {}) => {
    const url = new URL('/incident-reports/summary', API_BASE_URL);
    appendSummaryFilters(url.searchParams, filters);
    return request<IncidentReportSummary>(url.pathname + url.search, {
      method: 'GET',
    });
  },

  /** Offset-paginated list of reports. Newest submitted_at first by default. */
  listIncidentReports: (filters: ListIncidentReportsFilters = {}) => {
    const url = new URL('/incident-reports', API_BASE_URL);
    appendReportListFilters(url.searchParams, filters);
    return request<OffsetPage<IncidentReportEntity>>(
      url.pathname + url.search,
      { method: 'GET' },
    );
  },

  /** Cursor queue: submitted + under_review only, oldest first. */
  listAwaitingReview: (filters: AwaitingReviewFilters = {}) => {
    const url = new URL('/incident-reports/awaiting-review', API_BASE_URL);
    appendAwaitingReviewFilters(url.searchParams, filters);
    return request<CursorPage<IncidentReportEntity>>(
      url.pathname + url.search,
      { method: 'GET' },
    );
  },

  /** Single report, enriched with its parent incident context. */
  getIncidentReport: (id: string) =>
    request<IncidentReportEntity>(
      `/incident-reports/${encodeURIComponent(id)}`,
      { method: 'GET' },
    ),

  // ==========================================================================
  // NEW: Report review actions
  // ==========================================================================

  startReportReview: (id: string) =>
    request<void>(
      `/incident-reports/${encodeURIComponent(id)}/start-review`,
      { method: 'POST' },
    ),

  approveReport: (id: string, notes?: string | null) =>
    request<void>(`/incident-reports/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes ?? null }),
    }),

  requestReportRevision: (id: string, notes: string) =>
    request<void>(
      `/incident-reports/${encodeURIComponent(id)}/request-revision`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      },
    ),

  // ==========================================================================
  // NEW: Incident operational actions + timeline
  // ==========================================================================

  verifyIncident: (incidentId: string, notes?: string | null) =>
    request<void>(`/incidents/${encodeURIComponent(incidentId)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes ?? null }),
    }),

  resolveIncident: (incidentId: string, outcome: IncidentOutcome) =>
    request<void>(`/incidents/${encodeURIComponent(incidentId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ outcome }),
    }),

  getIncidentTimeline: (incidentId: string) =>
    request<IncidentTimelineResponse>(
      `/incidents/${encodeURIComponent(incidentId)}/timeline`,
      { method: 'GET' },
    ),
};