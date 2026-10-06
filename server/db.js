import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'bantai.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  f_name TEXT NOT NULL,
  l_name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  m_number TEXT,
  command_center_id TEXT,
  account_status TEXT NOT NULL DEFAULT 'active',
  must_change_password INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT NOT NULL,
  r_profile TEXT,
  d_profile TEXT
);

CREATE TABLE IF NOT EXISTS command_centers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  branch TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  admin_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  hardware_serial TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unpaired',
  driver_id TEXT,
  battery_level INTEGER NOT NULL DEFAULT 100,
  online INTEGER NOT NULL DEFAULT 0,
  last_heartbeat_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  driver_id TEXT,
  device_id TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  alert_type TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence_level REAL NOT NULL,
  snapshot_urls TEXT NOT NULL DEFAULT '[]',
  outcome TEXT NOT NULL DEFAULT 'unresolved',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_branch_responses (
  alert_id TEXT NOT NULL,
  command_center_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  triggered_at TEXT NOT NULL,
  acknowledged_at TEXT,
  dispatched_at TEXT,
  arrived_at TEXT,
  resolved_at TEXT,
  PRIMARY KEY (alert_id, command_center_id)
);

CREATE TABLE IF NOT EXISTS alert_responder_assignments (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  command_center_id TEXT NOT NULL,
  responder_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  dispatch_origin TEXT NOT NULL,
  assigned_by TEXT,
  assigned_at TEXT NOT NULL,
  confirmed_at TEXT,
  arrived_at TEXT,
  arrival_confirmation_method TEXT,
  is_lead INTEGER NOT NULL DEFAULT 0,
  decline_reason TEXT,
  declined_at TEXT,
  replaced_by TEXT
);

CREATE TABLE IF NOT EXISTS alert_outcome_reviews (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  command_center_id TEXT NOT NULL,
  proposed_by TEXT NOT NULL,
  proposed_outcome TEXT NOT NULL,
  evidence_urls TEXT NOT NULL DEFAULT '[]',
  evidence_lat REAL,
  evidence_lng REAL,
  submitted_at TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  reviewer_notes TEXT
);

CREATE TABLE IF NOT EXISTS civilian_reports (
  id TEXT PRIMARY KEY,
  command_center_id TEXT NOT NULL,
  civilian_name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  human_location TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL DEFAULT 'image',
  statement TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL,
  acknowledged_by TEXT,
  acknowledged_at TEXT
);

CREATE TABLE IF NOT EXISTS incident_reports (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  command_center_id TEXT NOT NULL,
  assigned_reporter_id TEXT NOT NULL,
  submitted_by_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  detailed_narrative TEXT NOT NULL DEFAULT '',
  evidence_urls TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TEXT,
  revision_request TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  command_center_id TEXT,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
`);

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    f_name: row.f_name,
    l_name: row.l_name,
    role: row.role,
    email: row.email,
    m_number: row.m_number ?? undefined,
    command_center_id: row.command_center_id,
    account_status: row.account_status,
    must_change_password: Boolean(row.must_change_password),
    r_profile: parseJson(row.r_profile, undefined),
    d_profile: parseJson(row.d_profile, undefined)
  };
}

export function mapCenter(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    branch: row.branch,
    location: { lat: row.lat, lng: row.lng },
    admin_ids: parseJson(row.admin_ids, []),
    created_at: row.created_at
  };
}

export function mapAlert(row) {
  return {
    id: row.id,
    driver_id: row.driver_id ?? '',
    device_id: row.device_id ?? '',
    location: { lat: row.lat, lng: row.lng },
    address: row.address,
    alert_type: row.alert_type,
    source: row.source,
    confidence_level: row.confidence_level,
    snapshot_urls: parseJson(row.snapshot_urls, []),
    outcome: row.outcome,
    created_at: row.created_at
  };
}

export function mapResponse(row) {
  return {
    alert_id: row.alert_id,
    command_center_id: row.command_center_id,
    status: row.status,
    triggered_at: row.triggered_at,
    acknowledged_at: row.acknowledged_at,
    dispatched_at: row.dispatched_at,
    arrived_at: row.arrived_at,
    resolved_at: row.resolved_at
  };
}

export function mapAssignment(row) {
  return {
    id: row.id,
    alert_id: row.alert_id,
    command_center_id: row.command_center_id,
    responder_id: row.responder_id,
    status: row.status,
    dispatch_origin: row.dispatch_origin,
    assigned_by: row.assigned_by,
    assigned_at: row.assigned_at,
    confirmed_at: row.confirmed_at,
    arrived_at: row.arrived_at,
    arrival_confirmation_method: row.arrival_confirmation_method ?? undefined,
    is_lead: Boolean(row.is_lead),
    decline_reason: row.decline_reason ?? undefined,
    declined_at: row.declined_at ?? undefined,
    replaced_by: row.replaced_by ?? undefined
  };
}

export function mapReview(row) {
  return {
    id: row.id,
    alert_id: row.alert_id,
    command_center_id: row.command_center_id,
    proposed_by: row.proposed_by,
    proposed_outcome: row.proposed_outcome,
    evidence_urls: parseJson(row.evidence_urls, []),
    evidence_location: {
      lat: row.evidence_lat ?? 0,
      lng: row.evidence_lng ?? 0
    },
    submitted_at: row.submitted_at,
    review_status: row.review_status,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    reviewer_notes: row.reviewer_notes
  };
}

export function mapCivilian(row) {
  return {
    id: row.id,
    command_center_id: row.command_center_id,
    civilian_name: row.civilian_name,
    raw_location: { lat: row.lat, lng: row.lng },
    human_location: row.human_location,
    media_url: row.media_url,
    media_type: row.media_type,
    statement: row.statement ?? undefined,
    status: row.status,
    submitted_at: row.submitted_at,
    acknowledged_by: row.acknowledged_by,
    acknowledged_at: row.acknowledged_at
  };
}

export function mapReport(row) {
  return {
    id: row.id,
    alert_id: row.alert_id,
    command_center_id: row.command_center_id,
    assigned_reporter_id: row.assigned_reporter_id,
    submitted_by_id: row.submitted_by_id,
    summary: row.summary,
    detailed_narrative: row.detailed_narrative,
    evidence_urls: parseJson(row.evidence_urls, []),
    status: row.status,
    submitted_at: row.submitted_at,
    revision_request: parseJson(row.revision_request, null)
  };
}

export function mapLog(row) {
  return {
    id: row.id,
    actor_id: row.actor_id,
    command_center_id: row.command_center_id,
    action: row.action,
    target_entity: row.target_entity,
    target_id: row.target_id,
    reference: row.reference,
    created_at: row.created_at,
    old_value: parseJson(row.old_value, null),
    new_value: parseJson(row.new_value, null)
  };
}

export function newId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function writeAudit(entry) {
  db.prepare(
    `INSERT INTO audit_logs
      (id, actor_id, command_center_id, action, target_entity, target_id, reference, created_at, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId('log'),
    entry.actor_id ?? null,
    entry.command_center_id ?? null,
    entry.action,
    entry.target_entity,
    entry.target_id,
    entry.reference ?? '',
    nowIso(),
    entry.old_value ? JSON.stringify(entry.old_value) : null,
    entry.new_value ? JSON.stringify(entry.new_value) : null
  );
}

export function loadState(actor) {
  const users = db.prepare('SELECT * FROM users ORDER BY l_name, f_name').all().map(publicUser);
  const commandCenters = db.prepare('SELECT * FROM command_centers ORDER BY name').all().map(mapCenter);
  const alerts = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC').all().map(mapAlert);
  const branchResponses = db.prepare('SELECT * FROM alert_branch_responses ORDER BY triggered_at DESC').all().map(mapResponse);
  const assignments = db.prepare('SELECT * FROM alert_responder_assignments ORDER BY assigned_at DESC').all().map(mapAssignment);
  const reviews = db.prepare('SELECT * FROM alert_outcome_reviews ORDER BY submitted_at DESC').all().map(mapReview);
  const civilianReports = db.prepare('SELECT * FROM civilian_reports ORDER BY submitted_at DESC').all().map(mapCivilian);
  const reports = db.prepare('SELECT * FROM incident_reports ORDER BY id DESC').all().map(mapReport);
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC').all().map(mapLog);
  const devices = db.prepare('SELECT * FROM devices').all().map((row) => ({
    id: row.id,
    hardware_serial: row.hardware_serial,
    status: row.status,
    driver_id: row.driver_id,
    battery_level: row.battery_level,
    online: Boolean(row.online),
    last_heartbeat_at: row.last_heartbeat_at
  }));

  const scope = actor.role === 'superadmin' ? null : actor.command_center_id;
  if (!scope) {
    return {
      users,
      commandCenters,
      alerts,
      branchResponses,
      assignments,
      reviews,
      civilianReports,
      reports,
      logs,
      devices
    };
  }

  const centerIds = new Set([scope]);
  return {
    users: users.filter((u) => !u.command_center_id || centerIds.has(u.command_center_id) || u.role === 'driver'),
    commandCenters: commandCenters.filter((c) => centerIds.has(c.id)),
    alerts,
    branchResponses: branchResponses.filter((r) => centerIds.has(r.command_center_id)),
    assignments: assignments.filter((a) => centerIds.has(a.command_center_id)),
    reviews: reviews.filter((r) => centerIds.has(r.command_center_id)),
    civilianReports: civilianReports.filter((r) => centerIds.has(r.command_center_id)),
    reports: reports.filter((r) => centerIds.has(r.command_center_id)),
    logs: logs.filter((l) => l.command_center_id === scope && l.action !== 'CREATE_COMMAND_CENTER'),
    devices
  };
}

export function bootstrapAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('superadmin');
  if (existing) return;

  const email = (process.env.BANTAI_BOOTSTRAP_EMAIL || 'admin@bantai.local').trim().toLowerCase();
  const password = process.env.BANTAI_BOOTSTRAP_PASSWORD || 'ChangeMe123!';
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users
      (id, f_name, l_name, role, email, command_center_id, account_status, must_change_password, password_hash)
     VALUES (?, ?, ?, ?, ?, NULL, 'active', 1, ?)`
  ).run('u-bootstrap', 'System', 'Administrator', 'superadmin', email, hash);

  console.log(`Bootstrap superadmin created: ${email}`);
  console.log('Set BANTAI_BOOTSTRAP_EMAIL and BANTAI_BOOTSTRAP_PASSWORD before first start in production.');
}
