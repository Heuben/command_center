import type { Alert, AlertBranchResponse, AlertResponderAssignment } from '../types';

export const EVIDENCE = {
  firearm: "/1e6e2bd7-d70f-4468-a8ca-f7a2421a96a0.jpg",
  accident: "/e3d81b2e-2045-4daf-89b4-c52ee706d59e.jpg",
  person: "/f1e7890c-436a-4355-9546-13ce19a3b94b.jpg"
};

export const alerts: Alert[] = [
{
  id: 'a-9001',
  driver_id: 'u-5001',
  device_id: 'dev-0231',
  location: { lat: 14.658, lng: 120.9838 },
  address: 'Plaza Roma cor. M. Hizon St., Barangay 171',
  alert_type: 'threat_gun',
  source: 'edge_websocket',
  confidence_level: 0.94,
  snapshot_urls: [EVIDENCE.firearm],
  outcome: 'unresolved',
  created_at: '2026-08-19T14:32:01Z'
},
{
  id: 'a-9002',
  driver_id: 'u-5002',
  device_id: 'dev-0232',
  location: { lat: 14.6602, lng: 120.9871 },
  address: 'Gen. Luis St. northbound, near Camarin Rd.',
  alert_type: 'road_accident',
  source: 'edge_imu',
  confidence_level: 0.88,
  snapshot_urls: [EVIDENCE.accident],
  outcome: 'unresolved',
  created_at: '2026-08-19T14:47:31Z'
},
{
  id: 'a-9003',
  driver_id: 'u-5003',
  device_id: 'dev-0235',
  location: { lat: 14.6551, lng: 120.9819 },
  address: 'A. Mabini St. cor. Barangay 171 Market',
  alert_type: 'threat_blade',
  source: 'edge_websocket',
  confidence_level: 0.79,
  snapshot_urls: [EVIDENCE.person],
  outcome: 'unresolved',
  created_at: '2026-08-19T14:41:10Z'
},
{
  id: 'a-9004',
  driver_id: 'u-5002',
  device_id: 'dev-0232',
  location: { lat: 14.6499, lng: 120.9755 },
  address: '10th Ave. cor. Rizal Ave. Ext.',
  alert_type: 'threatening_person',
  source: 'edge_websocket',
  confidence_level: 0.66,
  snapshot_urls: [EVIDENCE.person],
  outcome: 'unresolved',
  created_at: '2026-08-19T14:22:05Z'
},
{
  id: 'a-9007',
  driver_id: 'u-5003',
  device_id: 'dev-0235',
  location: { lat: 14.6538, lng: 120.9792 },
  address: 'MacArthur Hwy. southbound, near Monumento',
  alert_type: 'road_accident',
  source: 'edge_imu',
  confidence_level: 0.83,
  snapshot_urls: [EVIDENCE.accident],
  outcome: 'unresolved',
  created_at: '2026-08-19T14:28:52Z'
},
{
  id: 'a-9005',
  driver_id: 'u-5001',
  device_id: 'dev-0231',
  location: { lat: 14.6644, lng: 120.9918 },
  address: 'Zabarte Rd. cor. Susano Rd.',
  alert_type: 'road_accident',
  source: 'edge_imu',
  confidence_level: 0.91,
  snapshot_urls: [EVIDENCE.accident],
  outcome: 'confirmed',
  created_at: '2026-08-18T08:41:12Z'
},
{
  id: 'a-9006',
  driver_id: 'u-5002',
  device_id: 'dev-0232',
  location: { lat: 14.6566, lng: 120.9851 },
  address: 'P. Sevilla St., Barangay 171',
  alert_type: 'threat_gun',
  source: 'edge_websocket',
  confidence_level: 0.72,
  snapshot_urls: [EVIDENCE.firearm],
  outcome: 'false_positive',
  created_at: '2026-08-17T17:22:40Z'
},
{
  id: 'a-9008',
  driver_id: 'u-5003',
  device_id: 'dev-0235',
  location: { lat: 14.6589, lng: 120.9807 },
  address: 'Bagong Silang Phase 3, Barangay 171',
  alert_type: 'threatening_person',
  source: 'edge_websocket',
  confidence_level: 0.58,
  snapshot_urls: [EVIDENCE.person],
  outcome: 'unresolved',
  created_at: '2026-08-16T21:03:55Z'
},
{
  id: 'a-9009',
  driver_id: 'u-5001',
  device_id: 'dev-0231',
  location: { lat: 14.6521, lng: 120.9764 },
  address: '5th Ave. cor. C-3 Rd.',
  alert_type: 'threat_blade',
  source: 'edge_websocket',
  confidence_level: 0.87,
  snapshot_urls: [EVIDENCE.person],
  outcome: 'confirmed',
  created_at: '2026-08-15T19:47:02Z'
},
{
  id: 'a-9010',
  driver_id: 'u-5002',
  device_id: 'dev-0232',
  location: { lat: 14.6595, lng: 120.9885 },
  address: 'Camarin Rd. cor. Deparo Rd.',
  alert_type: 'road_accident',
  source: 'edge_imu',
  confidence_level: 0.69,
  snapshot_urls: [EVIDENCE.accident],
  outcome: 'unresolved',
  created_at: '2026-08-13T06:15:33Z'
}];


export const branchResponses: AlertBranchResponse[] = [
{
  alert_id: 'a-9001',
  command_center_id: 'cc-171',
  status: 'dispatched',
  triggered_at: '2026-08-19T14:32:01Z',
  acknowledged_at: '2026-08-19T14:32:20Z',
  dispatched_at: '2026-08-19T14:33:05Z',
  arrived_at: null,
  resolved_at: null
},
{
  alert_id: 'a-9001',
  command_center_id: 'cc-pnp-cal',
  status: 'pending',
  triggered_at: '2026-08-19T14:32:01Z',
  acknowledged_at: null,
  dispatched_at: null,
  arrived_at: null,
  resolved_at: null
},
{
  alert_id: 'a-9002',
  command_center_id: 'cc-171',
  status: 'pending',
  triggered_at: '2026-08-19T14:47:31Z',
  acknowledged_at: null,
  dispatched_at: null,
  arrived_at: null,
  resolved_at: null
},
{
  alert_id: 'a-9002',
  command_center_id: 'cc-mdrrmo-cal',
  status: 'viewing',
  triggered_at: '2026-08-19T14:47:31Z',
  acknowledged_at: '2026-08-19T14:48:02Z',
  dispatched_at: null,
  arrived_at: null,
  resolved_at: null
},
{
  alert_id: 'a-9003',
  command_center_id: 'cc-171',
  status: 'viewing',
  triggered_at: '2026-08-19T14:41:10Z',
  acknowledged_at: '2026-08-19T14:41:52Z',
  dispatched_at: null,
  arrived_at: null,
  resolved_at: null
},
{
  alert_id: 'a-9004',
  command_center_id: 'cc-pnp-cal',
  status: 'arrived',
  triggered_at: '2026-08-19T14:22:05Z',
  acknowledged_at: '2026-08-19T14:22:44Z',
  dispatched_at: '2026-08-19T14:23:40Z',
  arrived_at: '2026-08-19T14:31:00Z',
  resolved_at: null
},
{
  alert_id: 'a-9007',
  command_center_id: 'cc-pnp-cal',
  status: 'dispatched',
  triggered_at: '2026-08-19T14:28:52Z',
  acknowledged_at: '2026-08-19T14:29:11Z',
  dispatched_at: '2026-08-19T14:29:40Z',
  arrived_at: null,
  resolved_at: null
},
{
  alert_id: 'a-9005',
  command_center_id: 'cc-mdrrmo-cal',
  status: 'resolved',
  triggered_at: '2026-08-18T08:41:12Z',
  acknowledged_at: '2026-08-18T08:41:39Z',
  dispatched_at: '2026-08-18T08:42:30Z',
  arrived_at: '2026-08-18T08:49:04Z',
  resolved_at: '2026-08-18T09:22:44Z'
},
{
  alert_id: 'a-9006',
  command_center_id: 'cc-171',
  status: 'resolved',
  triggered_at: '2026-08-17T17:22:40Z',
  acknowledged_at: '2026-08-17T17:23:05Z',
  dispatched_at: '2026-08-17T17:24:11Z',
  arrived_at: '2026-08-17T17:31:48Z',
  resolved_at: '2026-08-17T18:05:12Z'
},
{
  alert_id: 'a-9008',
  command_center_id: 'cc-171',
  status: 'arrived',
  triggered_at: '2026-08-16T21:03:55Z',
  acknowledged_at: '2026-08-16T21:04:20Z',
  dispatched_at: '2026-08-16T21:05:02Z',
  arrived_at: '2026-08-16T21:14:38Z',
  resolved_at: null
},
{
  alert_id: 'a-9009',
  command_center_id: 'cc-pnp-cal',
  status: 'resolved',
  triggered_at: '2026-08-15T19:47:02Z',
  acknowledged_at: '2026-08-15T19:47:20Z',
  dispatched_at: '2026-08-15T19:48:00Z',
  arrived_at: '2026-08-15T19:53:27Z',
  resolved_at: '2026-08-15T20:40:15Z'
},
{
  alert_id: 'a-9010',
  command_center_id: 'cc-171',
  status: 'arrived',
  triggered_at: '2026-08-13T06:15:33Z',
  acknowledged_at: '2026-08-13T06:16:01Z',
  dispatched_at: '2026-08-13T06:16:48Z',
  arrived_at: '2026-08-13T06:24:12Z',
  resolved_at: null
}];


export const responderAssignments: AlertResponderAssignment[] = [
{
  id: 'ara-1',
  alert_id: 'a-9001',
  command_center_id: 'cc-171',
  responder_id: 'u-1001',
  status: 'en_route',
  dispatch_origin: 'admin_dispatched',
  assigned_by: 'u-1002',
  assigned_at: '2026-08-19T14:33:05Z',
  confirmed_at: '2026-08-19T14:33:40Z',
  arrived_at: null,
  is_lead: true
},
{
  id: 'ara-2',
  alert_id: 'a-9001',
  command_center_id: 'cc-171',
  responder_id: 'u-1003',
  status: 'en_route',
  dispatch_origin: 'self_dispatched',
  assigned_by: null,
  assigned_at: '2026-08-19T14:32:45Z',
  confirmed_at: '2026-08-19T14:32:45Z',
  arrived_at: null
},
{
  id: 'ara-3',
  alert_id: 'a-9001',
  command_center_id: 'cc-171',
  responder_id: 'u-1005',
  status: 'declined',
  dispatch_origin: 'admin_dispatched',
  assigned_by: 'u-1002',
  assigned_at: '2026-08-19T14:33:05Z',
  confirmed_at: null,
  arrived_at: null,
  declined_at: '2026-08-19T14:34:12Z',
  decline_reason: 'Family emergency, cannot respond.'
},
{
  id: 'ara-4',
  alert_id: 'a-9004',
  command_center_id: 'cc-pnp-cal',
  responder_id: 'u-2003',
  status: 'arrived',
  dispatch_origin: 'admin_dispatched',
  assigned_by: 'u-2002',
  assigned_at: '2026-08-19T14:23:40Z',
  confirmed_at: '2026-08-19T14:24:02Z',
  arrived_at: '2026-08-19T14:31:00Z',
  arrival_confirmation_method: 'gps'
},
{
  id: 'ara-5',
  alert_id: 'a-9007',
  command_center_id: 'cc-pnp-cal',
  responder_id: 'u-2001',
  status: 'en_route',
  dispatch_origin: 'admin_dispatched',
  assigned_by: 'u-0001',
  assigned_at: '2026-08-19T14:29:40Z',
  confirmed_at: '2026-08-19T14:30:02Z',
  arrived_at: null
},
{
  id: 'ara-6',
  alert_id: 'a-9005',
  command_center_id: 'cc-mdrrmo-cal',
  responder_id: 'u-3001',
  status: 'arrived',
  dispatch_origin: 'admin_dispatched',
  assigned_by: 'u-3002',
  assigned_at: '2026-08-18T08:42:30Z',
  confirmed_at: '2026-08-18T08:42:55Z',
  arrived_at: '2026-08-18T08:49:04Z',
  arrival_confirmation_method: 'gps'
},
{
  id: 'ara-7',
  alert_id: 'a-9006',
  command_center_id: 'cc-171',
  responder_id: 'u-1001',
  status: 'arrived',
  dispatch_origin: 'admin_dispatched',
  assigned_by: 'u-1002',
  assigned_at: '2026-08-17T17:24:11Z',
  confirmed_at: '2026-08-17T17:24:40Z',
  arrived_at: '2026-08-17T17:31:48Z',
  arrival_confirmation_method: 'manual'
},
{
  id: 'ara-8',
  alert_id: 'a-9006',
  command_center_id: 'cc-171',
  responder_id: 'u-1004',
  status: 'stood_down',
  dispatch_origin: 'self_dispatched',
  assigned_by: null,
  assigned_at: '2026-08-17T17:23:30Z',
  confirmed_at: '2026-08-17T17:23:30Z',
  arrived_at: null
},
{
  id: 'ara-9',
  alert_id: 'a-9008',
  command_center_id: 'cc-171',
  responder_id: 'u-1003',
  status: 'arrived',
  dispatch_origin: 'admin_dispatched',
  assigned_by: 'u-1002',
  assigned_at: '2026-08-16T21:05:02Z',
  confirmed_at: '2026-08-16T21:05:30Z',
  arrived_at: '2026-08-16T21:14:38Z',
  arrival_confirmation_method: 'gps'
},
{
  id: 'ara-10',
  alert_id: 'a-9009',
  command_center_id: 'cc-pnp-cal',
  responder_id: 'u-2001',
  status: 'arrived',
  dispatch_origin: 'admin_dispatched',
  assigned_by: 'u-2002',
  assigned_at: '2026-08-15T19:48:00Z',
  confirmed_at: '2026-08-15T19:48:22Z',
  arrived_at: '2026-08-15T19:53:27Z',
  arrival_confirmation_method: 'gps'
},
{
  id: 'ara-11',
  alert_id: 'a-9010',
  command_center_id: 'cc-171',
  responder_id: 'u-1004',
  status: 'arrived',
  dispatch_origin: 'self_dispatched',
  assigned_by: null,
  assigned_at: '2026-08-13T06:16:48Z',
  confirmed_at: '2026-08-13T06:16:48Z',
  arrived_at: '2026-08-13T06:24:12Z',
  arrival_confirmation_method: 'gps'
}];


export function alertById(id: string): Alert | undefined {
  return alerts.find((a) => a.id === id);
}

export function alertReference(id: string): string {
  return `#${id.replace('a-', '')}`;
}