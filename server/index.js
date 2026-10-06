import http from 'node:http';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import {
  bootstrapAdmin,
  db,
  loadState,
  mapCenter,
  newId,
  nowIso,
  publicUser,
  writeAudit
} from './db.js';

bootstrapAdmin();

const PORT = Number(process.env.BANTAI_API_PORT || 8787);
const COOKIE = 'bantai_session';
const INGEST_KEY = process.env.BANTAI_INGEST_KEY || '';
const isProd = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';

const app = express();
app.use(
  cors({
    origin: process.env.BANTAI_ORIGIN || true,
    credentials: true
  })
);
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());

function getUserFromRequest(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  const session = db
    .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
    .get(token, Date.now());
  if (!session) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) ?? null;
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Sign in required.' });
  if (user.account_status === 'deactivated') {
    return res.status(403).json({ error: 'This account is deactivated.' });
  }
  req.actor = user;
  next();
}

function requireStaff(req, res, next) {
  if (req.actor.role !== 'admin' && req.actor.role !== 'superadmin') {
    return res.status(403).json({ error: 'Staff access required.' });
  }
  next();
}

function requireSuperadmin(req, res, next) {
  if (req.actor.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required.' });
  }
  next();
}

function setSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  );
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  if (!user || user.account_status === 'deactivated') {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return res.status(403).json({ error: 'This portal is for command-center staff.' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  setSession(res, user.id);
  writeAudit({
    actor_id: user.id,
    command_center_id: user.command_center_id,
    action: 'LOGIN',
    target_entity: 'session',
    target_id: user.id,
    reference: user.email,
    new_value: { client: 'command-center' }
  });
  res.json({ user: publicUser(user) });
});

if (isDev) {
  app.post('/api/auth/dev-login', (req, res) => {
    const remoteAddress = req.socket.remoteAddress;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress)) {
      return res.status(403).json({ error: 'Development login is available only from this machine.' });
    }

    const user = db
      .prepare(
        `SELECT * FROM users
         WHERE role IN ('superadmin', 'admin') AND account_status = 'active'
         ORDER BY CASE role WHEN 'superadmin' THEN 0 ELSE 1 END, id
         LIMIT 1`
      )
      .get();
    if (!user) {
      return res.status(503).json({ error: 'No active command-center account is available.' });
    }

    setSession(res, user.id);
    writeAudit({
      actor_id: user.id,
      command_center_id: user.command_center_id,
      action: 'LOGIN',
      target_entity: 'session',
      target_id: user.id,
      reference: user.email,
      new_value: { client: 'development-bypass' }
    });
    res.json({ user: publicUser(user) });
  });
}

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  writeAudit({
    actor_id: req.actor.id,
    command_center_id: req.actor.command_center_id,
    action: 'LOGOUT',
    target_entity: 'session',
    target_id: req.actor.id,
    reference: req.actor.email
  });
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.actor) });
});

app.get('/api/state', requireAuth, requireStaff, (req, res) => {
  res.json(loadState(req.actor));
});

app.post('/api/command-centers', requireAuth, requireSuperadmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const type = String(req.body?.type || '').trim();
  const branch = String(req.body?.branch || '').trim();
  const lat = Number(req.body?.location?.lat);
  const lng = Number(req.body?.location?.lng);
  const adminIds = Array.isArray(req.body?.admin_ids) ? req.body.admin_ids.map(String) : [];

  if (!name || !branch || !['barangay', 'police_station', 'mdrrmo'].includes(type)) {
    return res.status(400).json({ error: 'Name, type, and coverage area are required.' });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'A valid map location is required.' });
  }

  const id = newId('cc');
  const createdAt = nowIso();
  db.prepare(
    `INSERT INTO command_centers (id, name, type, branch, lat, lng, admin_ids, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, type, branch, lat, lng, JSON.stringify(adminIds), createdAt);

  for (const adminId of adminIds) {
    db.prepare('UPDATE users SET command_center_id = ? WHERE id = ? AND role = ?').run(
      id,
      adminId,
      'admin'
    );
  }

  writeAudit({
    actor_id: req.actor.id,
    command_center_id: id,
    action: 'CREATE_COMMAND_CENTER',
    target_entity: 'command_center',
    target_id: id,
    reference: `#${id.toUpperCase()}`,
    new_value: { name, type, branch, admin_ids: adminIds }
  });

  const row = db.prepare('SELECT * FROM command_centers WHERE id = ?').get(id);
  res.status(201).json({ center: mapCenter(row) });
});

app.patch('/api/command-centers/:id', requireAuth, requireSuperadmin, (req, res) => {
  const current = db.prepare('SELECT * FROM command_centers WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Command center not found.' });

  const name = String(req.body?.name ?? current.name).trim();
  const type = String(req.body?.type ?? current.type).trim();
  const branch = String(req.body?.branch ?? current.branch).trim();
  const lat = Number(req.body?.location?.lat ?? current.lat);
  const lng = Number(req.body?.location?.lng ?? current.lng);
  const adminIds = Array.isArray(req.body?.admin_ids)
    ? req.body.admin_ids.map(String)
    : JSON.parse(current.admin_ids || '[]');

  db.prepare(
    `UPDATE command_centers SET name = ?, type = ?, branch = ?, lat = ?, lng = ?, admin_ids = ? WHERE id = ?`
  ).run(name, type, branch, lat, lng, JSON.stringify(adminIds), current.id);

  if (adminIds.length === 0) {
    db.prepare(
      `UPDATE users SET command_center_id = NULL WHERE role = 'admin' AND command_center_id = ?`
    ).run(current.id);
  } else {
    db.prepare(
      `UPDATE users SET command_center_id = NULL
       WHERE role = 'admin' AND command_center_id = ? AND id NOT IN (${adminIds.map(() => '?').join(',')})`
    ).run(current.id, ...adminIds);
  }

  for (const adminId of adminIds) {
    db.prepare('UPDATE users SET command_center_id = ? WHERE id = ? AND role = ?').run(
      current.id,
      adminId,
      'admin'
    );
  }

  const row = db.prepare('SELECT * FROM command_centers WHERE id = ?').get(current.id);
  res.json({ center: mapCenter(row) });
});

app.delete('/api/command-centers/:id', requireAuth, requireSuperadmin, (req, res) => {
  const current = db.prepare('SELECT * FROM command_centers WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Command center not found.' });
  const personnel = db
    .prepare('SELECT COUNT(*) AS n FROM users WHERE command_center_id = ?')
    .get(req.params.id).n;
  if (personnel > 0) {
    return res.status(409).json({
      error: `Cannot delete ${current.name}: ${personnel} personnel are still assigned. Reassign them first.`
    });
  }
  db.prepare('DELETE FROM command_centers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/users', requireAuth, requireStaff, (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const f_name = String(req.body?.f_name || '').trim();
  const l_name = String(req.body?.l_name || '').trim();
  const role = String(req.body?.role || 'responder');
  if (!email || !f_name || !l_name) {
    return res.status(400).json({ error: 'First name, last name, and email are required.' });
  }
  if (!['admin', 'responder', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (role === 'admin' && req.actor.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only a superadmin can provision admin accounts.' });
  }
  const taken = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email);
  if (taken) return res.status(409).json({ error: 'A user with that email already exists.' });

  let commandCenterId = req.body?.command_center_id ?? null;
  if (req.actor.role !== 'superadmin') {
    commandCenterId = req.actor.command_center_id;
  }
  if (role !== 'admin' && !commandCenterId && role !== 'driver') {
    return res.status(400).json({ error: 'Assign this account to a command center.' });
  }

  const tempPassword =
    String(req.body?.password || '').trim() ||
    `BNT-${crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;
  const id = newId('u');
  db.prepare(
    `INSERT INTO users
      (id, f_name, l_name, role, email, m_number, command_center_id, account_status, must_change_password, password_hash, r_profile, d_profile)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?, ?)`
  ).run(
    id,
    f_name,
    l_name,
    role,
    email,
    req.body?.m_number ?? null,
    commandCenterId,
    bcrypt.hashSync(tempPassword, 10),
    req.body?.r_profile ? JSON.stringify(req.body.r_profile) : null,
    req.body?.d_profile ? JSON.stringify(req.body.d_profile) : null
  );

  writeAudit({
    actor_id: req.actor.id,
    command_center_id: commandCenterId,
    action: 'CREATE_USER',
    target_entity: 'user_account',
    target_id: id,
    reference: `#${id.toUpperCase()}`,
    new_value: { f_name, l_name, role, email, command_center_id: commandCenterId }
  });

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json({ user: publicUser(row), tempPassword });
});

app.patch('/api/users/:id', requireAuth, requireStaff, (req, res) => {
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'User not found.' });
  if (req.actor.role !== 'superadmin' && current.command_center_id !== req.actor.command_center_id) {
    return res.status(403).json({ error: 'You can only update personnel in your branch.' });
  }

  const next = {
    f_name: req.body.f_name ?? current.f_name,
    l_name: req.body.l_name ?? current.l_name,
    email: req.body.email ?? current.email,
    m_number: req.body.m_number ?? current.m_number,
    command_center_id:
      req.body.command_center_id !== undefined ? req.body.command_center_id : current.command_center_id,
    account_status: req.body.account_status ?? current.account_status,
    must_change_password:
      req.body.must_change_password !== undefined
        ? req.body.must_change_password
          ? 1
          : 0
        : current.must_change_password,
    r_profile:
      req.body.r_profile !== undefined
        ? JSON.stringify(req.body.r_profile)
        : current.r_profile,
    d_profile:
      req.body.d_profile !== undefined
        ? JSON.stringify(req.body.d_profile)
        : current.d_profile
  };

  db.prepare(
    `UPDATE users SET f_name = ?, l_name = ?, email = ?, m_number = ?, command_center_id = ?,
      account_status = ?, must_change_password = ?, r_profile = ?, d_profile = ?
     WHERE id = ?`
  ).run(
    next.f_name,
    next.l_name,
    next.email,
    next.m_number,
    next.command_center_id,
    next.account_status,
    next.must_change_password,
    next.r_profile,
    next.d_profile,
    current.id
  );

  if (req.body.password) {
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(
      bcrypt.hashSync(String(req.body.password), 10),
      current.id
    );
  }

  writeAudit({
    actor_id: req.actor.id,
    command_center_id: next.command_center_id,
    action: 'UPDATE_USER',
    target_entity: 'user_account',
    target_id: current.id,
    reference: `#${current.id.toUpperCase()}`,
    old_value: { f_name: current.f_name, l_name: current.l_name, email: current.email },
    new_value: req.body
  });

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(current.id);
  res.json({ user: publicUser(row) });
});

app.post('/api/reviews/:id/decide', requireAuth, requireStaff, (req, res) => {
  const review = db.prepare('SELECT * FROM alert_outcome_reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found.' });
  const decision = req.body?.decision;
  if (decision !== 'approved' && decision !== 'rejected') {
    return res.status(400).json({ error: 'Decision must be approved or rejected.' });
  }
  const at = nowIso();
  db.prepare(
    `UPDATE alert_outcome_reviews SET review_status = ?, reviewed_by = ?, reviewed_at = ?, reviewer_notes = ?
     WHERE id = ?`
  ).run(decision, req.actor.id, at, String(req.body?.notes || '') || null, review.id);
  if (decision === 'approved') {
    db.prepare(
      `UPDATE alert_branch_responses SET status = 'resolved', resolved_at = ?
       WHERE alert_id = ? AND command_center_id = ?`
    ).run(at, review.alert_id, review.command_center_id);
  }
  writeAudit({
    actor_id: req.actor.id,
    command_center_id: review.command_center_id,
    action: 'REVIEW_ALERT_OUTCOME',
    target_entity: 'alert_outcome_review',
    target_id: review.id,
    reference: `#${review.id.toUpperCase()}`,
    new_value: { review_status: decision, reviewed_by: req.actor.id }
  });
  res.json({ ok: true });
});

app.post('/api/civilian-reports/:id/acknowledge', requireAuth, requireStaff, (req, res) => {
  const at = nowIso();
  db.prepare(
    `UPDATE civilian_reports SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = ? WHERE id = ?`
  ).run(req.actor.id, at, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/incident-reports/:id', requireAuth, requireStaff, (req, res) => {
  const current = db.prepare('SELECT * FROM incident_reports WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Report not found.' });
  const patch = req.body || {};
  const submittedAt =
    patch.status === 'approved' && current.status !== 'approved' ? nowIso() : current.submitted_at;
  const submittedBy =
    patch.status === 'approved' && current.status !== 'approved' ? req.actor.id : current.submitted_by_id;
  db.prepare(
    `UPDATE incident_reports
     SET summary = ?, detailed_narrative = ?, evidence_urls = ?, status = ?, submitted_at = ?, submitted_by_id = ?, revision_request = ?
     WHERE id = ?`
  ).run(
    patch.summary ?? current.summary,
    patch.detailed_narrative ?? current.detailed_narrative,
    JSON.stringify(patch.evidence_urls ?? JSON.parse(current.evidence_urls || '[]')),
    patch.status ?? current.status,
    submittedAt,
    submittedBy,
    patch.revision_request !== undefined
      ? JSON.stringify(patch.revision_request)
      : current.revision_request,
    current.id
  );
  writeAudit({
    actor_id: req.actor.id,
    command_center_id: current.command_center_id,
    action: 'SUBMIT_INCIDENT_REPORT',
    target_entity: 'incident_report',
    target_id: current.id,
    reference: `#${current.id.toUpperCase()}`,
    old_value: { status: current.status },
    new_value: { status: patch.status ?? current.status }
  });
  const row = db.prepare('SELECT * FROM incident_reports WHERE id = ?').get(current.id);
  res.json({
    report: {
      ...row,
      evidence_urls: JSON.parse(row.evidence_urls || '[]'),
      revision_request: row.revision_request ? JSON.parse(row.revision_request) : null
    }
  });
});

function haversineKm(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function ingestAllowed(req) {
  if (INGEST_KEY && req.get('x-bantai-ingest-key') === INGEST_KEY) return true;
  const user = getUserFromRequest(req);
  return Boolean(user);
}

app.post('/api/alerts', (req, res) => {
  if (!ingestAllowed(req)) return res.status(401).json({ error: 'Ingest authorization required.' });
  const lat = Number(req.body?.location?.lat);
  const lng = Number(req.body?.location?.lng);
  const alertType = String(req.body?.alert_type || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !alertType) {
    return res.status(400).json({ error: 'location and alert_type are required.' });
  }
  const id = newId('a');
  const createdAt = nowIso();
  db.prepare(
    `INSERT INTO alerts
      (id, driver_id, device_id, lat, lng, address, alert_type, source, confidence_level, snapshot_urls, outcome, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unresolved', ?)`
  ).run(
    id,
    req.body?.driver_id ?? null,
    req.body?.device_id ?? null,
    lat,
    lng,
    String(req.body?.address || ''),
    alertType,
    String(req.body?.source || 'edge_websocket'),
    Number(req.body?.confidence_level ?? 0),
    JSON.stringify(req.body?.snapshot_urls ?? []),
    createdAt
  );

  const centers = db.prepare('SELECT * FROM command_centers').all().map(mapCenter);
  const ranked = centers
    .map((c) => ({ c, km: haversineKm(c.location, { lat, lng }) }))
    .sort((a, b) => a.km - b.km);
  const targets = ranked.length === 0 ? [] : ranked.filter((r, i) => i === 0 || r.km <= 8).map((r) => r.c);
  const insertResponse = db.prepare(
    `INSERT INTO alert_branch_responses
      (alert_id, command_center_id, status, triggered_at, acknowledged_at, dispatched_at, arrived_at, resolved_at)
     VALUES (?, ?, 'pending', ?, NULL, NULL, NULL, NULL)`
  );
  for (const center of targets) {
    insertResponse.run(id, center.id, createdAt);
    writeAudit({
      actor_id: null,
      command_center_id: center.id,
      action: 'ALERT_RECEIVED',
      target_entity: 'alert',
      target_id: id,
      reference: `#${id}`,
      new_value: { alert_type: alertType, address: req.body?.address || '' }
    });
  }

  res.status(201).json({ id, routed_to: targets.map((c) => c.id) });
});

app.post('/api/civilian-reports', (req, res) => {
  if (!ingestAllowed(req)) return res.status(401).json({ error: 'Ingest authorization required.' });
  const commandCenterId = String(req.body?.command_center_id || '');
  const name = String(req.body?.civilian_name || '').trim();
  const lat = Number(req.body?.raw_location?.lat);
  const lng = Number(req.body?.raw_location?.lng);
  if (!commandCenterId || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'command_center_id, civilian_name, and location are required.' });
  }
  const id = newId('cr');
  db.prepare(
    `INSERT INTO civilian_reports
      (id, command_center_id, civilian_name, lat, lng, human_location, media_url, media_type, statement, status, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    id,
    commandCenterId,
    name,
    lat,
    lng,
    String(req.body?.human_location || ''),
    String(req.body?.media_url || ''),
    String(req.body?.media_type || 'image'),
    req.body?.statement ?? null,
    nowIso()
  );
  res.status(201).json({ id });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

http.createServer(app).listen(PORT, () => {
  console.log(`BANTAI API listening on http://127.0.0.1:${PORT}`);
});
