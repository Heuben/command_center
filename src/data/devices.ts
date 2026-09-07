import type { Device, DevicePairing } from '../types';

export const devices: Device[] = [
{
  id: 'dev-0231',
  hardware_serial: 'BNT-CAM-0231',
  status: 'paired',
  driver_id: 'u-5001',
  battery_level: 78,
  online: true,
  last_heartbeat_at: '2026-08-19T14:51:12Z'
},
{
  id: 'dev-0232',
  hardware_serial: 'BNT-CAM-0232',
  status: 'paired',
  driver_id: 'u-5002',
  battery_level: 41,
  online: true,
  last_heartbeat_at: '2026-08-19T14:50:48Z'
},
{
  id: 'dev-0233',
  hardware_serial: 'BNT-CAM-0233',
  status: 'unpaired',
  driver_id: null,
  battery_level: 92,
  online: false,
  last_heartbeat_at: '2026-08-14T09:12:00Z'
},
{
  id: 'dev-0234',
  hardware_serial: 'BNT-CAM-0234',
  status: 'lost',
  driver_id: null,
  battery_level: 0,
  online: false,
  last_heartbeat_at: '2026-07-28T22:04:31Z'
},
{
  id: 'dev-0235',
  hardware_serial: 'BNT-CAM-0235',
  status: 'paired',
  driver_id: 'u-5003',
  battery_level: 16,
  online: true,
  last_heartbeat_at: '2026-08-19T14:49:02Z'
},
{
  id: 'dev-0236',
  hardware_serial: 'BNT-CAM-0236',
  status: 'damaged',
  driver_id: null,
  battery_level: 34,
  online: false,
  last_heartbeat_at: '2026-08-02T11:44:19Z'
}];


export const devicePairingHistory: DevicePairing[] = [
{
  id: 'dph-1',
  device_id: 'dev-0231',
  driver_id: 'u-5001',
  paired_at: '2026-03-02T01:00:00Z',
  unpaired_at: null
},
{
  id: 'dph-2',
  device_id: 'dev-0231',
  driver_id: 'u-5002',
  paired_at: '2025-11-18T03:20:00Z',
  unpaired_at: '2026-03-01T23:40:00Z'
},
{
  id: 'dph-3',
  device_id: 'dev-0232',
  driver_id: 'u-5002',
  paired_at: '2026-03-04T02:15:00Z',
  unpaired_at: null
},
{
  id: 'dph-4',
  device_id: 'dev-0235',
  driver_id: 'u-5003',
  paired_at: '2026-05-21T05:02:00Z',
  unpaired_at: null
},
{
  id: 'dph-5',
  device_id: 'dev-0234',
  driver_id: 'u-5003',
  paired_at: '2026-01-09T04:00:00Z',
  unpaired_at: '2026-05-20T08:30:00Z'
}];


export function deviceById(id: string): Device | undefined {
  return devices.find((d) => d.id === id);
}