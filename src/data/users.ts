import type { UserAccount } from '../types';

export const users: UserAccount[] = [
{
  id: 'u-0001',
  f_name: 'Heuben Clyde B.',
  l_name: 'Dagami',
  role: 'superadmin',
  email: 'heuben.clyde.b.dagami@bantai.gov.ph',
  command_center_id: null
},

// Admins provisioned but not yet assigned to a command center
{
  id: 'u-0101',
  f_name: 'Kirby',
  l_name: 'Gabayno',
  role: 'admin',
  email: 'kirby.gabayno@bantai.gov.ph',
  command_center_id: null,
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: null,
    rank: 'none',
    availability: 'on_duty'
  }
},
{
  id: 'u-0102',
  f_name: 'Emmanuel Solomon',
  l_name: 'Dator',
  role: 'admin',
  email: 'emmanuel.solomon.dator@bantai.gov.ph',
  command_center_id: null,
  r_profile: {
    agency: 'police',
    call_sign: null,
    rank: 'PLt',
    availability: 'on_duty'
  }
},
{
  id: 'u-0103',
  f_name: 'Kurt',
  l_name: 'Banatao',
  role: 'admin',
  email: 'kurt.banatao@bantai.gov.ph',
  command_center_id: null,
  r_profile: {
    agency: 'mdrrmo',
    call_sign: null,
    rank: 'none',
    availability: 'off_duty'
  }
},
{
  id: 'u-0104',
  f_name: 'Majan Isabelle',
  l_name: 'Tagana',
  role: 'admin',
  email: 'majan.isabelle.tagana@bantai.gov.ph',
  command_center_id: null,
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: null,
    rank: 'none',
    availability: 'on_duty'
  }
},

// Barangay 171
{
  id: 'u-1002',
  f_name: 'Christian Dwight',
  l_name: 'Lumanog',
  role: 'admin',
  email: 'christian.dwight.lumanog@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: null,
    rank: 'none',
    availability: 'on_duty'
  }
},
{
  id: 'u-1001',
  f_name: 'Carlos',
  l_name: 'Cruz',
  role: 'responder',
  email: 'c.cruz@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: 'BRGY-171-1',
    rank: 'none',
    availability: 'dispatched',
    position: { lat: 14.6569, lng: 120.9829 },
    unit: 'Alpha Team'
  }
},
{
  id: 'u-1003',
  f_name: 'Miguel',
  l_name: 'Santos',
  role: 'responder',
  email: 'm.santos@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: 'BRGY-171-4',
    rank: 'none',
    availability: 'dispatched',
    position: { lat: 14.6581, lng: 120.9839 },
    unit: 'Alpha Team'
  }
},
{
  id: 'u-1004',
  f_name: 'Rosa',
  l_name: 'Villanueva',
  role: 'responder',
  email: 'r.villanueva@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  account_status: 'deactivated',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: 'BRGY-171-2',
    rank: 'none',
    availability: 'off_duty',
    unit: 'Alpha Team'
  }
},
{
  id: 'u-1005',
  f_name: 'Dante',
  l_name: 'Ilagan',
  role: 'responder',
  email: 'd.ilagan@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: 'BRGY-171-6',
    rank: 'none',
    availability: 'on_duty',
    position: { lat: 14.6497, lng: 120.9885 },
    unit: 'Alpha Team'
  }
},
{
  id: 'u-1006',
  f_name: 'Nestor',
  l_name: 'Aguilar',
  role: 'responder',
  email: 'n.aguilar@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: 'BRGY-171-8',
    rank: 'none',
    availability: 'on_duty',
    position: { lat: 14.6604, lng: 120.9822 },
    unit: 'Bravo Team'
  }
},
{
  id: 'u-1007',
  f_name: 'Bea',
  l_name: 'Lorenzo',
  role: 'responder',
  email: 'b.lorenzo@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: 'BRGY-171-9',
    rank: 'none',
    availability: 'on_duty',
    position: { lat: 14.6543, lng: 120.9877 },
    unit: 'Bravo Team'
  }
},
{
  id: 'u-1008',
  f_name: 'Tomas',
  l_name: 'Reyes',
  role: 'responder',
  email: 't.reyes@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: 'BRGY-171-10',
    rank: 'none',
    availability: 'off_duty',
    unit: 'Charlie Team'
  }
},
{
  id: 'u-1009',
  f_name: 'Lina',
  l_name: 'Cortez',
  role: 'responder',
  email: 'l.cortez@brgy171.bantai.gov.ph',
  command_center_id: 'cc-171',
  r_profile: {
    agency: 'barangay_tanod',
    call_sign: 'BRGY-171-11',
    rank: 'none',
    availability: 'off_duty',
    unit: 'Charlie Team'
  }
},

// Caloocan Police Station 3
{
  id: 'u-2002',
  f_name: 'Jeffrey',
  l_name: 'Aspiras',
  role: 'admin',
  email: 'jeffrey.aspiras@pnp-cal3.bantai.gov.ph',
  command_center_id: 'cc-pnp-cal',
  r_profile: {
    agency: 'police',
    call_sign: null,
    rank: 'PSSg',
    availability: 'on_duty'
  }
},
{
  id: 'u-2001',
  f_name: 'Antonio',
  l_name: 'Bautista',
  role: 'responder',
  email: 'a.bautista@pnp-cal3.bantai.gov.ph',
  command_center_id: 'cc-pnp-cal',
  r_profile: {
    agency: 'police',
    call_sign: 'PNP-BRAVO-3',
    rank: 'PCpl',
    availability: 'dispatched',
    position: { lat: 14.6523, lng: 120.9784 }
  }
},
{
  id: 'u-2003',
  f_name: 'Rico',
  l_name: 'Delgado',
  role: 'responder',
  email: 'r.delgado@pnp-cal3.bantai.gov.ph',
  command_center_id: 'cc-pnp-cal',
  r_profile: {
    agency: 'police',
    call_sign: 'PNP-BRAVO-7',
    rank: 'PSSg',
    availability: 'on_duty',
    position: { lat: 14.6544, lng: 120.9801 }
  }
},

// Caloocan MDRRMO
{
  id: 'u-3002',
  f_name: 'Clarence',
  l_name: 'Sabangan',
  role: 'admin',
  email: 'clarence.sabangan@mdrrmo-cal.bantai.gov.ph',
  command_center_id: 'cc-mdrrmo-cal',
  r_profile: {
    agency: 'mdrrmo',
    call_sign: null,
    rank: 'none',
    availability: 'on_duty'
  }
},
{
  id: 'u-3001',
  f_name: 'Leah',
  l_name: 'Mendoza',
  role: 'responder',
  email: 'l.mendoza@mdrrmo-cal.bantai.gov.ph',
  command_center_id: 'cc-mdrrmo-cal',
  r_profile: {
    agency: 'mdrrmo',
    call_sign: 'MDRRMO-2',
    rank: 'none',
    availability: 'on_duty',
    position: { lat: 14.6631, lng: 120.9893 }
  }
},

// Drivers
{
  id: 'u-5001',
  f_name: 'Juan',
  l_name: 'Dela Cruz',
  role: 'driver',
  email: 'j.delacruz@rider.bantai.ph',
  m_number: '+639171234567',
  command_center_id: null,
  d_profile: {
    service_provider: 'angkas',
    plate_number: 'NBC-1234',
    blood_type: 'O+',
    emergency_contacts: [
    { name: 'Maria Dela Cruz', relationship: 'Spouse', phone: '+639179876543' },
    { name: 'Noel Dela Cruz', relationship: 'Brother', phone: '+639064412298' }]

  }
},
{
  id: 'u-5002',
  f_name: 'Ariel',
  l_name: 'Panganiban',
  role: 'driver',
  email: 'a.panganiban@rider.bantai.ph',
  m_number: '+639285512340',
  command_center_id: null,
  d_profile: {
    service_provider: 'grab',
    plate_number: 'NDA-8842',
    blood_type: 'A+',
    emergency_contacts: [
    { name: 'Liza Panganiban', relationship: 'Sister', phone: '+639285512999' }]

  }
},
{
  id: 'u-5003',
  f_name: 'Josefa',
  l_name: 'Marquez',
  role: 'driver',
  email: 'j.marquez@rider.bantai.ph',
  m_number: '+639331120084',
  command_center_id: null,
  d_profile: {
    service_provider: 'joyride',
    plate_number: 'NCC-2210',
    blood_type: 'O-',
    emergency_contacts: [
    { name: 'Rodel Marquez', relationship: 'Father', phone: '+639331120085' }]

  }
}];


export function userById(id: string | null | undefined): UserAccount | undefined {
  if (!id) return undefined;
  return users.find((u) => u.id === id);
}

export function userName(id: string | null | undefined): string {
  const u = userById(id);
  return u ? `${u.f_name} ${u.l_name}` : 'System';
}

export const responders = users.filter((u) => u.role === 'responder');
export const staff = users.filter((u) => u.role === 'responder' || u.role === 'admin');
export const drivers = users.filter((u) => u.role === 'driver');