import type {
  Agency,
  AlertType,
  AlertOutcome,
  AssignmentStatus,
  Availability,
  AuditAction,
  AuditCategory,
  AuditTargetEntity,
  BranchResponseStatus,
  CommandCenterType,
  DeviceStatus,
  ReportStatus,
  ReviewStatus,
  Role } from
'../types';

export const alertTypeLabel: Record<AlertType, string> = {
  threat_gun: 'Firearm Threat',
  threat_blade: 'Bladed Weapon Threat',
  threatening_person: 'Threatening Person',
  road_accident: 'Road Accident'
};

export const alertTypeShort: Record<AlertType, string> = {
  threat_gun: 'Firearm',
  threat_blade: 'Blade',
  threatening_person: 'Threat',
  road_accident: 'Accident'
};

export const branchStatusLabel: Record<BranchResponseStatus, string> = {
  pending: 'Pending',
  viewing: 'Viewing',
  dispatched: 'Dispatched',
  arrived: 'On Scene',
  resolved: 'Resolved'
};

export const assignmentStatusLabel: Record<AssignmentStatus, string> = {
  assigned: 'Awaiting Response',
  en_route: 'En Route',
  arrived: 'Arrived',
  declined: 'Declined Dispatch',
  stood_down: 'Stood Down'
};

export const reviewStatusLabel: Record<ReviewStatus, string> = {
  pending: 'Awaiting Review',
  approved: 'Approved',
  rejected: 'Rejected'
};

export const reportStatusLabel: Record<ReportStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved'
};

export const outcomeLabel: Record<AlertOutcome, string> = {
  confirmed: 'Confirmed Incident',
  false_positive: 'False Alarm',
  unresolved: 'Unresolved'
};

export const proposedOutcomeLabel: Record<'confirmed' | 'false_positive', string> = {
  confirmed: 'Confirmed Incident',
  false_positive: 'False Alarm'
};

export const agencyLabel: Record<Agency, string> = {
  police: 'Philippine National Police',
  barangay_tanod: 'Barangay Tanod',
  mdrrmo: 'MDRRMO'
};

export const agencyShort: Record<Agency, string> = {
  police: 'PNP',
  barangay_tanod: 'Tanod',
  mdrrmo: 'MDRRMO'
};

export const availabilityLabel: Record<Availability, string> = {
  on_duty: 'On Duty',
  off_duty: 'Off Duty',
  dispatched: 'Dispatched'
};

export const deviceStatusLabel: Record<DeviceStatus, string> = {
  paired: 'Paired',
  unpaired: 'Unpaired',
  lost: 'Reported Lost',
  damaged: 'Damaged'
};

export const roleLabel: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  responder: 'Responder',
  driver: 'Driver'
};

export const centerTypeLabel: Record<CommandCenterType, string> = {
  barangay: 'Barangay Hall',
  police_station: 'Police Station',
  mdrrmo: 'MDRRMO Office'
};

export const actionLabel: Record<AuditAction, string> = {
  CREATE_USER: 'Created User',
  UPDATE_USER: 'Updated User',
  CHANGE_ROLE: 'Changed Role',
  DEACTIVATE_USER: 'Deactivated User',
  ALERT_RECEIVED: 'Alert Received',
  ACKNOWLEDGE_ALERT: 'Acknowledged Alert',
  DISPATCH_RESPONDER: 'Dispatched Responder',
  RESOLVE_ALERT: 'Resolved Alert',
  PROPOSE_ALERT_OUTCOME: 'Proposed Alert Outcome',
  REVIEW_ALERT_OUTCOME: 'Reviewed Alert Outcome',
  SUBMIT_INCIDENT_REPORT: 'Submitted Incident Report',
  LOGIN: 'Logged In',
  LOGOUT: 'Logged Out',
  CREATE_COMMAND_CENTER: 'Created Command Center'
};

export const categoryLabel: Record<AuditCategory, string> = {
  personnel: 'Personnel',
  incidents: 'Incidents',
  outcome_reviews: 'Outcome Reviews',
  system: 'System'
};

/** Every audited action belongs to exactly one facet category. */
export const actionCategory: Record<AuditAction, AuditCategory> = {
  CREATE_USER: 'personnel',
  UPDATE_USER: 'personnel',
  CHANGE_ROLE: 'personnel',
  DEACTIVATE_USER: 'personnel',
  ACKNOWLEDGE_ALERT: 'incidents',
  DISPATCH_RESPONDER: 'incidents',
  RESOLVE_ALERT: 'incidents',
  SUBMIT_INCIDENT_REPORT: 'incidents',
  PROPOSE_ALERT_OUTCOME: 'outcome_reviews',
  REVIEW_ALERT_OUTCOME: 'outcome_reviews',
  ALERT_RECEIVED: 'system',
  LOGIN: 'system',
  LOGOUT: 'system',
  CREATE_COMMAND_CENTER: 'system'
};

export const targetEntityLabel: Record<AuditTargetEntity, string> = {
  alert: 'Alert',
  alert_branch_response: 'Branch Response',
  alert_responder_assignment: 'Responder Assignment',
  alert_outcome_review: 'Outcome Review',
  incident_report: 'Incident Report',
  user_account: 'User Account',
  command_center: 'Command Center',
  session: 'Session'
};

export const serviceProviderLabel: Record<string, string> = {
  angkas: 'Angkas',
  grab: 'Grab',
  joyride: 'JoyRide',
  move_it: 'Move It'
};

export function fullName(user: {f_name: string;l_name: string;}): string {
  return `${user.f_name} ${user.l_name}`;
}

export function rankDisplay(rank: string, agency: Agency): string {
  if (agency !== 'police' || rank === 'none' || !rank) return '—';
  return rank;
}

export function confidenceDisplay(value: number): string {
  return `${Math.round(value * 100)}%`;
}