export const CURRENT_USER = {
  name: 'Sipho Dlamini',
  initials: 'SD',
  role: 'Licensed Aircraft Engineer',
  rating: 'Part 66 Cat B1',
  license: 'SA-0142-B1',
  location: 'Johannesburg',
};

export const JOBS = [
  { id: 'JOB-2411-041', title: 'B737 AOG — Fuel Pump R&R',     airline: 'South African Airways', location: 'FAOR · Johannesburg',  duration: '2 days',  rate: 'ZAR 4,200/day', urgency: 'aog',    match: '98%', rating: 'Part 66 Cat B1' },
  { id: 'JOB-2411-038', title: 'A320 Line Maintenance Check',  airline: 'FlySafair',             location: 'FACT · Cape Town',     duration: '5 days',  rate: 'ZAR 4,200/day', urgency: 'normal', match: '94%', rating: 'Part 66 Cat B1' },
  { id: 'JOB-2411-031', title: 'C-Check Support — B767',       airline: 'Ethiopian Airlines',    location: 'HAAB · Addis Ababa',   duration: '3 weeks', rate: 'ZAR 4,000/day', urgency: 'normal', match: '87%', rating: 'Part 66 Cat B1' },
];

export const WALLET_DOCS = [
  { name: 'SACAA Part 66 — Cat B1', ref: 'SA-0142-B1',     status: 'verified', expires: '2025-08-14' },
  { name: 'Class 1 Medical',         ref: 'MED-SA-2024-CL1', status: 'verified', expires: '2025-02-28' },
  { name: 'B737 Type Rating',        ref: 'TR-B737-SA-0142', status: 'expiring', expires: '2024-12-30' },
  { name: 'A320 Type Rating',        ref: 'TR-A320-SA-0142', status: 'verified', expires: '2026-01-15' },
];

export const EARNINGS = [
  { label: 'Paid Out', value: 'ZAR 29,400', tone: 'success' },
  { label: 'Pending',  value: 'ZAR 12,600', tone: 'warning' },
];

export const PROFILE_STATS = [
  { label: 'Contracts', value: '24',   tone: 'warning' },
  { label: 'Rating',    value: '4.9★', tone: 'warning' },
  { label: 'Jobs Done', value: '19',   tone: 'success' },
  { label: 'Disputes',  value: '0',    tone: 'primary' },
];

export const SETTINGS_ROWS = [
  { label: 'Notifications', sub: 'Push alerts for AOG matches' },
  { label: 'Type Ratings',  sub: 'B737, A320, C208' },
  { label: 'Bank Account',  sub: '•••• •••• •••• 4821' },
  { label: 'Support',       sub: 'Contact Naluka' },
];

export const ACTIVE_WORK_ORDER = {
  aircraft: 'ZS-OAL · Boeing 737-800',
  task: 'Fuel Pump Assembly Replacement',
  airline: 'South African Airways',
  reference: 'WO-2024-11-0041',
  partUsed: 'CFM56-7B · S/N 872341-A',
  payout: 'ZAR 8,400',
};

export const MOBILE_TABS = [
  { id: 'wallet',  path: '/m/wallet',  label: 'Wallet'   },
  { id: 'jobs',    path: '/m/jobs',    label: 'Jobs',    badge: 3 },
  { id: 'signoff', path: '/m/signoff', label: 'Sign-off' },
  { id: 'profile', path: '/m/profile', label: 'Profile'  },
];
