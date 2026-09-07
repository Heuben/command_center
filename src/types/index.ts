export type LatLng = {lat: number;lng: number;};

export type CommandCenterType = 'barangay' | 'police_station' | 'mdrrmo';

export type CommandCenter = {
  id: string;
  name: string;
  type: CommandCenterType;
  branch: string;
  location: LatLng;
  admin_ids: string[];
  created_at: string;
};

export type Role = 'superadmin' | 'admin' | 'responder' | 'driver';
export type Agency = 'police' | 'barangay_tanod' | 'mdrrmo';
export type Availability = 'on_duty' | 'off_duty' | 'dispatched';

export type ResponderProfile = {
  agency: Agency;
  call_sign: string | null;
  rank: string;
  availability: Availability;
  position?: LatLng;
  /** Optional free-text team label, e.g. "Alpha Team" */
  unit?: string;
};

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

export type DriverProfile = {
  service_provider: 'angkas' | 'grab' | 'joyride' | 'move_it';
  plate_number: string;
  blood_type: string;
  emergency_contacts: EmergencyContact[];
};

export type UserAccount = {
  id: string;
  f_name: string;
  l_name: string;
  role: Role;
  email: string;
  m_number?: string;
  command_center_id: string | null;
  account_status?: 'active' | 'deactivated';
  must_change_password?: boolean;
  r_profile?: ResponderProfile;
  d_profile?: DriverProfile;
};

export type DeviceStatus = 'paired' | 'unpaired' | 'lost' | 'damaged';

export type Device = {
  id: string;
  hardware_serial: string;
  status: DeviceStatus;
  driver_id: string | null;
  battery_level: number;
  online: boolean;
  last_heartbeat_at: string;
};

export type DevicePairing = {
  id: string;
  device_id: string;
  driver_id: string;
  paired_at: string;
  unpaired_at: string | null;
};

export type AlertType =
'threat_gun' |
'threat_blade' |
'threatening_person' |
'road_accident';

export type AlertOutcome = 'confirmed' | 'false_positive' | 'unresolved';

export type Alert = {
  id: string;
  driver_id: string;
  device_id: string;
  location: LatLng;
  address: string;
  alert_type: AlertType;
  source: 'edge_websocket' | 'edge_imu';
  confidence_level: number;
  snapshot_urls: string[];
  outcome: AlertOutcome;
  created_at: string;
};

export type BranchResponseStatus =
'pending' |
'viewing' |
'dispatched' |
'arrived' |
'resolved';

export type AlertBranchResponse = {
  alert_id: string;
  command_center_id: string;
  status: BranchResponseStatus;
  triggered_at: string;
  acknowledged_at: string | null;
  dispatched_at: string | null;
  arrived_at: string | null;
  resolved_at: string | null;
};

export type AssignmentStatus =
'assigned' |
'en_route' |
'arrived' |
'declined' |
'stood_down';

export type AlertResponderAssignment = {
  id: string;
  alert_id: string;
  command_center_id: string;
  responder_id: string;
  status: AssignmentStatus;
  dispatch_origin: 'admin_dispatched' | 'self_dispatched';
  assigned_by: string | null;
  assigned_at: string;
  confirmed_at: string | null;
  arrived_at: string | null;
  arrival_confirmation_method?: 'gps' | 'manual';
  /** The responder designated to lead the response and file the incident report. */
  is_lead?: boolean;
  /** Reason typed by a responder who declined the dispatch order. */
  decline_reason?: string;
  declined_at?: string;
  /** Responder assigned in place of one who declined. */
  replaced_by?: string;
};

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type AlertOutcomeReview = {
  id: string;
  alert_id: string;
  command_center_id: string;
  proposed_by: string;
  proposed_outcome: 'confirmed' | 'false_positive';
  evidence_urls: string[];
  evidence_location: LatLng;
  submitted_at: string;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes?: string | null;
};

export type ReportStatus = 'draft' | 'submitted' | 'under_review' | 'approved';

export type CivilianReportStatus = 'pending' | 'acknowledged';

export type CivilianReport = {
  id: string;
  command_center_id: string;
  civilian_name: string;
  raw_location: LatLng;
  human_location: string;
  media_url: string;
  media_type: 'image' | 'video';
  statement?: string;
  status: CivilianReportStatus;
  submitted_at: string;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
};

export type IncidentReport = {
  id: string;
  alert_id: string;
  command_center_id: string;
  assigned_reporter_id: string;
  submitted_by_id: string | null;
  summary: string;
  detailed_narrative: string;
  evidence_urls: string[];
  status: ReportStatus;
  submitted_at: string | null;
  /** Set when an admin sends the report back to the reporter for rework. */
  revision_request?: {
    reason: string;
    requested_by: string;
    requested_at: string;
  } | null;
};

export type AuditCategory =
'personnel' |
'incidents' |
'outcome_reviews' |
'system';

export type AuditAction =
'CREATE_USER' |
'UPDATE_USER' |
'CHANGE_ROLE' |
'DEACTIVATE_USER' |
'ALERT_RECEIVED' |
'ACKNOWLEDGE_ALERT' |
'DISPATCH_RESPONDER' |
'RESOLVE_ALERT' |
'PROPOSE_ALERT_OUTCOME' |
'REVIEW_ALERT_OUTCOME' |
'SUBMIT_INCIDENT_REPORT' |
'LOGIN' |
'LOGOUT' |
'CREATE_COMMAND_CENTER';

export type AuditTargetEntity =
'alert' |
'alert_branch_response' |
'alert_responder_assignment' |
'alert_outcome_review' |
'incident_report' |
'user_account' |
'command_center' |
'session';

export type SystemAuditLog = {
  id: string;
  actor_id: string | null;
  command_center_id: string | null;
  action: AuditAction;
  target_entity: AuditTargetEntity;
  target_id: string;
  reference: string;
  created_at: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
};