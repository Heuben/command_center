import type { CommandCenter } from '../types';

export const commandCenters: CommandCenter[] = [
{
  id: 'cc-171',
  name: 'Barangay 171',
  type: 'barangay',
  branch: 'Caloocan City, District 2',
  location: { lat: 14.6577, lng: 120.9842 },
  admin_ids: ['u-1002'],
  created_at: '2025-11-04T02:10:00Z'
},
{
  id: 'cc-pnp-cal',
  name: 'Caloocan Police Station 3',
  type: 'police_station',
  branch: 'Caloocan City',
  location: { lat: 14.651, lng: 120.977 },
  admin_ids: ['u-2002'],
  created_at: '2025-11-04T02:22:00Z'
},
{
  id: 'cc-mdrrmo-cal',
  name: 'Caloocan MDRRMO',
  type: 'mdrrmo',
  branch: 'Caloocan City, District 1',
  location: { lat: 14.6625, lng: 120.9905 },
  admin_ids: ['u-3002'],
  created_at: '2026-01-16T01:05:00Z'
}];


export function centerById(id: string | null | undefined): CommandCenter | undefined {
  if (!id) return undefined;
  return commandCenters.find((c) => c.id === id);
}

export function centerName(id: string | null | undefined): string {
  return centerById(id)?.name ?? 'System-wide';
}