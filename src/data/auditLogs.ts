import type { SystemAuditLog } from '../types';

export const auditLogs: SystemAuditLog[] = [
{
  id: 'log-14',
  actor_id: 'u-1002',
  command_center_id: 'cc-171',
  action: 'DISPATCH_RESPONDER',
  target_entity: 'alert_responder_assignment',
  target_id: 'ara-1',
  reference: '#ARA-1',
  created_at: '2026-08-19T14:33:05Z',
  old_value: null,
  new_value: {
    alert_id: 'a-9001',
    responder_id: 'u-1001',
    status: 'assigned',
    dispatch_origin: 'admin_dispatched'
  }
},
{
  id: 'log-13',
  actor_id: 'u-1002',
  command_center_id: 'cc-171',
  action: 'ACKNOWLEDGE_ALERT',
  target_entity: 'alert_branch_response',
  target_id: 'a-9001',
  reference: '#9001',
  created_at: '2026-08-19T14:32:20Z',
  old_value: { status: 'pending', acknowledged_at: null },
  new_value: { status: 'viewing', acknowledged_at: '2026-08-19T14:32:20Z' }
},
{
  id: 'log-15',
  actor_id: 'u-1001',
  command_center_id: 'cc-171',
  action: 'PROPOSE_ALERT_OUTCOME',
  target_entity: 'alert_outcome_review',
  target_id: 'aor-1',
  reference: '#AOR-1',
  created_at: '2026-08-19T14:45:00Z',
  old_value: null,
  new_value: {
    alert_id: 'a-9001',
    proposed_outcome: 'confirmed',
    review_status: 'pending'
  }
},
{
  id: 'log-12',
  actor_id: 'u-0001',
  command_center_id: 'cc-pnp-cal',
  action: 'DISPATCH_RESPONDER',
  target_entity: 'alert_responder_assignment',
  target_id: 'ara-5',
  reference: '#ARA-5',
  created_at: '2026-08-19T14:29:40Z',
  old_value: null,
  new_value: {
    alert_id: 'a-9007',
    responder_id: 'u-2001',
    status: 'assigned',
    dispatch_origin: 'admin_dispatched'
  }
},
{
  id: 'log-11',
  actor_id: null,
  command_center_id: 'cc-171',
  action: 'ALERT_RECEIVED',
  target_entity: 'alert',
  target_id: 'a-9002',
  reference: '#9002',
  created_at: '2026-08-19T14:47:31Z',
  old_value: null,
  new_value: {
    alert_id: 'a-9002',
    alert_type: 'road_accident',
    source: 'edge_imu',
    confidence_level: 0.88,
    broadcast_radius_km: 3
  }
},
{
  id: 'log-17',
  actor_id: 'u-1002',
  command_center_id: 'cc-171',
  action: 'DEACTIVATE_USER',
  target_entity: 'user_account',
  target_id: 'u-1004',
  reference: '#U-1004',
  created_at: '2026-08-19T13:20:44Z',
  old_value: { availability: 'on_duty', account_status: 'active' },
  new_value: { availability: 'off_duty', account_status: 'deactivated' }
},
{
  id: 'log-10',
  actor_id: 'u-3002',
  command_center_id: 'cc-mdrrmo-cal',
  action: 'REVIEW_ALERT_OUTCOME',
  target_entity: 'alert_outcome_review',
  target_id: 'aor-3',
  reference: '#AOR-3',
  created_at: '2026-08-18T09:22:10Z',
  old_value: { review_status: 'pending', reviewed_by: null },
  new_value: { review_status: 'approved', reviewed_by: 'u-3002' }
},
{
  id: 'log-9',
  actor_id: 'u-3002',
  command_center_id: 'cc-mdrrmo-cal',
  action: 'RESOLVE_ALERT',
  target_entity: 'alert_branch_response',
  target_id: 'a-9005',
  reference: '#9005',
  created_at: '2026-08-18T09:22:44Z',
  old_value: { status: 'arrived', resolved_at: null },
  new_value: { status: 'resolved', resolved_at: '2026-08-18T09:22:44Z' }
},
{
  id: 'log-8',
  actor_id: 'u-1002',
  command_center_id: 'cc-171',
  action: 'RESOLVE_ALERT',
  target_entity: 'alert_branch_response',
  target_id: 'a-9006',
  reference: '#9006',
  created_at: '2026-08-17T18:05:12Z',
  old_value: { status: 'arrived', resolved_at: null },
  new_value: { status: 'resolved', resolved_at: '2026-08-17T18:05:12Z' }
},
{
  id: 'log-7',
  actor_id: 'u-1001',
  command_center_id: 'cc-171',
  action: 'SUBMIT_INCIDENT_REPORT',
  target_entity: 'incident_report',
  target_id: 'ir-2',
  reference: '#IR-2',
  created_at: '2026-08-17T19:40:00Z',
  old_value: { status: 'draft', submitted_at: null },
  new_value: { status: 'submitted', submitted_at: '2026-08-17T19:40:00Z' }
},
{
  id: 'log-6',
  actor_id: 'u-1002',
  command_center_id: 'cc-171',
  action: 'CREATE_USER',
  target_entity: 'user_account',
  target_id: 'u-1005',
  reference: '#U-1005',
  created_at: '2026-08-16T02:11:09Z',
  old_value: null,
  new_value: {
    f_name: 'Dante',
    l_name: 'Ilagan',
    role: 'responder',
    command_center_id: 'cc-171',
    must_change_password: true
  }
},
{
  id: 'log-5',
  actor_id: 'u-1002',
  command_center_id: 'cc-171',
  action: 'CHANGE_ROLE',
  target_entity: 'user_account',
  target_id: 'u-1004',
  reference: '#U-1004',
  created_at: '2026-08-15T07:32:55Z',
  old_value: { role: 'responder', call_sign: 'BRGY-171-9' },
  new_value: { role: 'responder', call_sign: 'BRGY-171-2' }
},
{
  id: 'log-4',
  actor_id: 'u-1002',
  command_center_id: 'cc-171',
  action: 'LOGIN',
  target_entity: 'session',
  target_id: 'sess-8841',
  reference: '#S-8841',
  created_at: '2026-08-19T13:58:02Z',
  old_value: null,
  new_value: { ip: '112.198.44.19', client: 'Command Center Desktop 2.4.1' }
},
{
  id: 'log-1',
  actor_id: 'u-0001',
  command_center_id: null,
  action: 'CREATE_COMMAND_CENTER',
  target_entity: 'command_center',
  target_id: 'cc-mdrrmo-cal',
  reference: '#CC-MDRRMO-CAL',
  created_at: '2026-01-16T01:05:00Z',
  old_value: null,
  new_value: {
    name: 'Caloocan MDRRMO',
    type: 'mdrrmo',
    branch: 'Caloocan City, District 1'
  }
}];


/** Actions an admin can never generate — hardware and branch creation are superadmin-only. */
export const superadminOnlyActions = ['CREATE_COMMAND_CENTER'];