import type { AlertOutcomeReview, CivilianReport, IncidentReport } from '../types';
import { EVIDENCE } from './alerts';

export const outcomeReviews: AlertOutcomeReview[] = [
{
  id: 'aor-2',
  alert_id: 'a-9004',
  command_center_id: 'cc-pnp-cal',
  proposed_by: 'u-2003',
  proposed_outcome: 'false_positive',
  evidence_urls: [EVIDENCE.person],
  evidence_location: { lat: 14.6499, lng: 120.9755 },
  submitted_at: '2026-08-19T14:39:20Z',
  review_status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  reviewer_notes: null
},
{
  id: 'aor-7',
  alert_id: 'a-9010',
  command_center_id: 'cc-171',
  proposed_by: 'u-1004',
  proposed_outcome: 'false_positive',
  evidence_urls: [EVIDENCE.accident],
  evidence_location: { lat: 14.6595, lng: 120.9885 },
  submitted_at: '2026-08-13T06:41:19Z',
  review_status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  reviewer_notes: null
},
{
  id: 'aor-3',
  alert_id: 'a-9005',
  command_center_id: 'cc-mdrrmo-cal',
  proposed_by: 'u-3001',
  proposed_outcome: 'confirmed',
  evidence_urls: [EVIDENCE.accident],
  evidence_location: { lat: 14.6644, lng: 120.9918 },
  submitted_at: '2026-08-18T09:04:41Z',
  review_status: 'approved',
  reviewed_by: 'u-3002',
  reviewed_at: '2026-08-18T09:22:10Z',
  reviewer_notes: 'Evidence location matches alert GPS. Transport to hospital logged.'
},
{
  id: 'aor-4',
  alert_id: 'a-9006',
  command_center_id: 'cc-171',
  proposed_by: 'u-1001',
  proposed_outcome: 'false_positive',
  evidence_urls: [EVIDENCE.firearm],
  evidence_location: { lat: 14.6566, lng: 120.9851 },
  submitted_at: '2026-08-17T17:52:30Z',
  review_status: 'approved',
  reviewed_by: 'u-1002',
  reviewed_at: '2026-08-17T18:05:12Z',
  reviewer_notes: 'Object in frame was a toy replica. Classification error accepted.'
},
{
  id: 'aor-5',
  alert_id: 'a-9008',
  command_center_id: 'cc-171',
  proposed_by: 'u-1003',
  proposed_outcome: 'confirmed',
  evidence_urls: [EVIDENCE.person],
  evidence_location: { lat: 14.6612, lng: 120.9779 },
  submitted_at: '2026-08-16T21:48:10Z',
  review_status: 'rejected',
  reviewed_by: 'u-1002',
  reviewed_at: '2026-08-16T22:19:55Z',
  reviewer_notes:
  'Evidence GPS is 380 m from the alert location. Re-submit with on-scene capture.'
},
{
  id: 'aor-6',
  alert_id: 'a-9009',
  command_center_id: 'cc-pnp-cal',
  proposed_by: 'u-2001',
  proposed_outcome: 'confirmed',
  evidence_urls: [EVIDENCE.person],
  evidence_location: { lat: 14.6521, lng: 120.9764 },
  submitted_at: '2026-08-15T20:11:03Z',
  review_status: 'approved',
  reviewed_by: 'u-2002',
  reviewed_at: '2026-08-15T20:40:15Z',
  reviewer_notes: 'Suspect turned over to station. Blotter entry filed.'
}];


export const incidentReports: IncidentReport[] = [
{
  id: 'ir-1',
  alert_id: 'a-9001',
  command_center_id: 'cc-171',
  assigned_reporter_id: 'u-1001',
  submitted_by_id: null,
  summary: 'Armed threat reported near Plaza Roma.',
  detailed_narrative:
  'Response in progress. BRGY-171-1 en route as lead reporter; narrative to be completed on scene.',
  evidence_urls: [EVIDENCE.firearm],
  status: 'draft',
  submitted_at: null
},
{
  id: 'ir-2',
  alert_id: 'a-9006',
  command_center_id: 'cc-171',
  assigned_reporter_id: 'u-1001',
  submitted_by_id: 'u-1001',
  summary: 'Firearm classification on P. Sevilla St. found to be a replica.',
  detailed_narrative:
  'On arrival the object detected by the device was identified as a plastic replica carried by a minor. No threat to the driver. Driver continued trip after brief interview. Device footage retained for model retraining.',
  evidence_urls: [EVIDENCE.firearm],
  status: 'submitted',
  submitted_at: '2026-08-17T19:40:00Z'
},
{
  id: 'ir-3',
  alert_id: 'a-9005',
  command_center_id: 'cc-mdrrmo-cal',
  assigned_reporter_id: 'u-3001',
  submitted_by_id: 'u-3001',
  summary: 'Two-vehicle collision at Zabarte Rd. cor. Susano Rd.',
  detailed_narrative:
  'IMU-triggered collision alert confirmed on scene. Driver sustained abrasions to the left forearm and was transported to Caloocan Medical Center. Motorcycle towed to the barangay impound. Traffic cleared at 09:05.',
  evidence_urls: [EVIDENCE.accident],
  status: 'approved',
  submitted_at: '2026-08-18T10:02:00Z'
},
{
  id: 'ir-4',
  alert_id: 'a-9008',
  command_center_id: 'cc-171',
  assigned_reporter_id: 'u-1003',
  submitted_by_id: 'u-1003',
  summary: 'Threatening person alert at Bagong Silang Phase 3.',
  detailed_narrative:
  'Responder arrived 10 minutes after dispatch. Driver had already left the location. Follow-up contact with the driver is pending. Outcome proposal was returned for re-submission due to an evidence location mismatch.',
  evidence_urls: [EVIDENCE.person],
  status: 'under_review',
  submitted_at: '2026-08-16T23:30:00Z'
},
{
  id: 'ir-5',
  alert_id: 'a-9009',
  command_center_id: 'cc-pnp-cal',
  assigned_reporter_id: 'u-2001',
  submitted_by_id: 'u-2001',
  summary: 'Bladed weapon threat at 5th Ave. cor. C-3 Rd.',
  detailed_narrative:
  'Suspect apprehended on scene by PNP-BRAVO-3 and turned over to Caloocan Police Station 3. Bladed weapon recovered and inventoried. Driver gave a sworn statement at the station.',
  evidence_urls: [EVIDENCE.person],
  status: 'approved',
  submitted_at: '2026-08-15T21:15:00Z'
},
{
  id: 'ir-6',
  alert_id: 'a-9010',
  command_center_id: 'cc-171',
  assigned_reporter_id: 'u-1004',
  submitted_by_id: null,
  summary: 'Suspected collision on Camarin Rd. — no damage observed.',
  detailed_narrative: '',
  evidence_urls: [EVIDENCE.accident],
  status: 'draft',
  submitted_at: null
}];


export const civilianReports: CivilianReport[] = [
{
  id: 'cr-1',
  command_center_id: 'cc-171',
  civilian_name: 'Maria Clara Santos',
  raw_location: { lat: 14.6582, lng: 120.9841 },
  human_location: 'Near Plaza Roma, Barangay 171',
  media_url: EVIDENCE.firearm,
  media_type: 'image',
  statement: 'I saw someone holding what looked like a gun near the sari-sari store.',
  status: 'pending',
  submitted_at: '2026-08-19T14:40:00Z'
},
{
  id: 'cr-2',
  command_center_id: 'cc-pnp-cal',
  civilian_name: 'Jose Rizal',
  raw_location: { lat: 14.6501, lng: 120.976 },
  human_location: '10th Ave. cor. Rizal Ave. Ext.',
  media_url: EVIDENCE.person,
  media_type: 'image',
  statement: 'Suspicious person loitering around the parked motorcycles.',
  status: 'acknowledged',
  submitted_at: '2026-08-19T14:15:00Z',
  acknowledged_by: 'u-2002',
  acknowledged_at: '2026-08-19T14:20:00Z'
}];