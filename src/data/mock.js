export const KPIS = [
  { label: 'Active AOG Events',  value: '3',         sub: 'Response time avg 42 min', tone: 'aog'      },
  { label: 'Verified Personnel', value: '142',       sub: '64 available now',         tone: 'primary'  },
  { label: 'Escrow Balance',     value: 'ZAR 2.4M',  sub: '11 open transactions',     tone: 'mustard'  },
  { label: 'Expiring Licences',  value: '7',         sub: 'Within 90 days',           tone: 'warning'  },
  { label: 'Parts Transactions', value: '38',        sub: 'This month',               tone: 'primary'  },
];

export const AOG_EVENTS = [
  {
    id: 'aog-1',
    reg: 'ZS-OAL',
    location: 'FAOR · Johannesburg',
    part: 'CFM56-7B Fuel Pump Assembly — Part 145 engineer also required',
    matches: 2,
  },
  {
    id: 'aog-2',
    reg: 'ZS-SFN',
    location: 'FACT · Cape Town',
    part: 'Avionics LRU Module G1000 — rotable required urgently',
    matches: 1,
  },
  {
    id: 'aog-3',
    reg: '5Y-KQZ',
    location: 'HKNA · Nairobi',
    part: 'Nose Gear Actuator Assembly — KCAA-certified MRO needed',
    matches: 3,
  },
];

export const PERSONNEL = [
  { id: 1, name: 'Sipho Dlamini',   initials: 'SD', license: 'SA-0142-B1',  role: 'Licensed Aircraft Engineer', rating: 'Part 66 Cat B1', types: ['B737','A320'],  location: 'Johannesburg', status: 'verified', expires: '2025-08-14', available: true,  rate: 'ZAR 4,200/day' },
  { id: 2, name: 'Anele Mokoena',   initials: 'AM', license: 'SA-0089-P1',  role: 'Commercial Pilot',           rating: 'Part 61 ATPL',   types: ['B737','B767'],  location: 'Cape Town',    status: 'expiring', expires: '2024-12-30', available: true,  rate: 'ZAR 6,800/day' },
  { id: 3, name: 'Tariq Hassan',    initials: 'TH', license: 'KE-0301-ATC', role: 'Air Traffic Controller',     rating: 'Part 64 ATC',    types: ['Enroute','APP'],location: 'Nairobi',      status: 'pending',  expires: '—',          available: false, rate: 'ZAR 5,100/day' },
  { id: 4, name: 'Nomvula Khumalo', initials: 'NK', license: 'SA-0056-B2',  role: 'Avionics Engineer',          rating: 'Part 66 Cat B2', types: ['A320','A330'],  location: 'Durban',       status: 'expired',  expires: '2024-09-01', available: false, rate: 'ZAR 3,900/day' },
  { id: 5, name: 'Kagiso Sithole',  initials: 'KS', license: 'SA-0211-P2',  role: 'Commercial Pilot',           rating: 'Part 61 CPL',    types: ['C208','PC-12'], location: 'Pretoria',     status: 'verified', expires: '2026-03-22', available: true,  rate: 'ZAR 3,200/day' },
  { id: 6, name: 'Amara Diallo',    initials: 'AD', license: 'SA-0388-B1',  role: 'Licensed Aircraft Engineer', rating: 'Part 66 Cat B1', types: ['B737','B747'],  location: 'Johannesburg', status: 'verified', expires: '2025-11-08', available: true,  rate: 'ZAR 4,500/day' },
];

export const PARTS = [
  { id: 1, name: 'CFM56-7B Fuel Pump Assembly', pn: 'CFM-FP-7B-0042', cert: 'EASA Form 1', supplier: 'AeroTech Parts SA',  location: 'Johannesburg', price: 'ZAR 142,500', status: 'verified', condition: 'Overhauled',  aog: true  },
  { id: 2, name: 'Avionics LRU Module G1000',   pn: 'AV-LRU-G1000-11', cert: 'FAA 8130-3',  supplier: 'Global Avionics Ltd', location: 'Cape Town',    price: 'ZAR 89,000',  status: 'verified', condition: 'Serviceable', aog: true  },
  { id: 3, name: 'Nose Gear Actuator Assembly', pn: 'NG-ACT-737-006',  cert: 'SACAA F-18',  supplier: 'Nairobi MRO Centre',  location: 'Nairobi',      price: 'ZAR 211,000', status: 'verified', condition: 'New',         aog: false },
  { id: 4, name: 'APU Starter Motor',           pn: 'APU-SM-RE150-02', cert: 'EASA Form 1', supplier: 'Cape Aviation Parts', location: 'Cape Town',    price: 'ZAR 34,200',  status: 'verified', condition: 'Overhauled',  aog: false },
  { id: 5, name: 'Brake Control Unit',          pn: 'BCU-B737-443',    cert: 'SACAA F-18',  supplier: 'SA AeroSpares',       location: 'Pretoria',     price: 'ZAR 56,800',  status: 'expiring', condition: 'Serviceable', aog: false },
  { id: 6, name: 'Engine Bleed Air Valve',      pn: 'BAV-CFM-B1-019',  cert: 'FAA 8130-3',  supplier: 'Pan-African Aviation',location: 'Addis Ababa',  price: 'ZAR 28,400',  status: 'verified', condition: 'New',         aog: false },
];

export const TRANSACTIONS = [
  { id: 'TXN-2024-0041', type: 'Parts',     item: 'CFM56-7B Fuel Pump Assembly',         party: 'AeroTech Parts SA',     amount: 'ZAR 142,500', status: 'rts-pending', created: '2024-11-12', updated: '2 hours ago',  aog: true  },
  { id: 'TXN-2024-0039', type: 'Personnel', item: 'Licensed Engineer — 3-day contract',  party: 'Sipho Dlamini',         amount: 'ZAR 12,600',  status: 'completed',   created: '2024-11-08', updated: '4 days ago',   aog: false },
  { id: 'TXN-2024-0038', type: 'Parts',     item: 'Avionics LRU Module G1000',           party: 'Global Avionics Ltd',   amount: 'ZAR 89,000',  status: 'in-escrow',   created: '2024-11-07', updated: '5 days ago',   aog: true  },
  { id: 'TXN-2024-0035', type: 'MRO',       item: 'A-Check Service — ZS-OAL',            party: 'JHB Aviation Services', amount: 'ZAR 320,000', status: 'in-escrow',   created: '2024-10-30', updated: '12 days ago',  aog: false },
  { id: 'TXN-2024-0031', type: 'Parts',     item: 'Nose Gear Actuator Assembly',         party: 'Nairobi MRO Centre',    amount: 'ZAR 211,000', status: 'dispute',     created: '2024-10-22', updated: '20 days ago',  aog: false },
  { id: 'TXN-2024-0028', type: 'Personnel', item: 'ATPL Pilot — Ferry Flight',           party: 'Anele Mokoena',         amount: 'ZAR 6,800',   status: 'completed',   created: '2024-10-18', updated: '24 days ago',  aog: false },
];

export const DOCUMENTS = [
  { id: 1, name: 'SACAA Part 66 Licence — Sipho Dlamini',  ref: 'SA-0142-B1',         type: 'Personnel Licence',     issued: '2022-08-14', expires: '2025-08-14', status: 'verified', cert: 'Part 66 Cat B1' },
  { id: 2, name: 'EASA Form 1 — CFM56-7B Fuel Pump',       ref: 'EASA-F1-2024-0342',  type: 'Release Certificate',   issued: '2024-01-10', expires: '2026-01-10', status: 'verified', cert: 'EASA Form 1' },
  { id: 3, name: 'SACAA AMO Certificate — AeroTech SA',    ref: 'AMO-SA-2023-0089',   type: 'Organisation Cert',     issued: '2023-03-01', expires: '2025-03-01', status: 'expiring', cert: 'Part 145 AMO' },
  { id: 4, name: 'Class 1 Medical — Anele Mokoena',        ref: 'MED-SA-0089-CL1',    type: 'Medical Certificate',   issued: '2023-06-15', expires: '2024-12-30', status: 'expiring', cert: 'Class 1 Medical' },
  { id: 5, name: 'FAA 8130-3 — Avionics LRU G1000',        ref: 'FAA-8130-2024-1102', type: 'Release Certificate',   issued: '2024-04-22', expires: '2027-04-22', status: 'verified', cert: 'FAA 8130-3' },
  { id: 6, name: 'SACAA Part 66 — Nomvula Khumalo',        ref: 'SA-0056-B2',         type: 'Personnel Licence',     issued: '2022-03-01', expires: '2024-09-01', status: 'expired',  cert: 'Part 66 Cat B2' },
  { id: 7, name: 'Digital RTS — ZS-OAL Maintenance',       ref: 'RTS-2024-11-0041',   type: 'Release to Service',    issued: '2024-11-12', expires: '—',          status: 'verified', cert: 'Digital RTS' },
  { id: 8, name: 'SACAA Form 18 — Imported APU Parts',     ref: 'F18-SA-2024-0078',   type: 'Import Clearance',      issued: '2024-09-30', expires: '2025-03-30', status: 'verified', cert: 'SACAA Form 18' },
];

export const NOTIFICATIONS = [
  { id: 1, type: 'aog',     title: 'AOG Alert — ZS-OAL',                title2: 'CFM56-7B Fuel Pump matched to 2 suppliers. Escrow ready.',                  time: '2 min ago',  unread: true  },
  { id: 2, type: 'warning', title: 'Licence Expiring — Anele Mokoena',  title2: 'Part 61 ATPL expires in 42 days. Renewal reminder sent.',                   time: '1 hour ago', unread: true  },
  { id: 3, type: 'success', title: 'RTS Signed — ZS-SFN',               title2: 'Sipho Dlamini signed Digital Release to Service. ZAR 89,000 released.',     time: '3 hours ago',unread: false },
  { id: 4, type: 'success', title: 'KYC Approved — Kagiso Sithole',     title2: 'Identity verified. Compliance Badge now active.',                            time: 'Yesterday',  unread: false },
  { id: 5, type: 'warning', title: 'AOG Resolved — 5Y-KQZ',             title2: 'Nose Gear Actuator dispatched. Awaiting delivery confirmation.',             time: 'Yesterday',  unread: false },
];

// IA spine — every nav item declares the platform roles that can see
// it. Sidebar filters by the signed-in user's role at render time.
// Per /autoplan design review: 4-5 items max per role to keep IA
// uncluttered. Compliance features (expiry, audit) progressive-
// disclose inside the relevant entity, not top-level nav.
export const NAV_ITEMS = [
  { id: 'dashboard',    path: '/app/dashboard',    label: 'Dashboard',         icon: 'grid',        roles: ['OPERATOR', 'AMO', 'SUPPLIER', 'ADMIN'] },
  { id: 'personnel',    path: '/app/personnel',    label: 'Crew',              icon: 'users',                                                         roles: ['OPERATOR', 'ADMIN'] },
  { id: 'marketplace',  path: '/app/marketplace',  label: 'Parts',             icon: 'package',     badge: 3,                                         roles: ['OPERATOR', 'SUPPLIER', 'ADMIN'] },
  { id: 'mro',          path: '/app/mro',          label: 'MRO Services',      icon: 'wrench',                                                        roles: ['OPERATOR', 'AMO', 'ADMIN'] },
  { id: 'vault',        path: '/app/vault',        label: 'Compliance Vault',  icon: 'shield',                                                        roles: ['OPERATOR', 'AMO', 'ADMIN'] },
  { id: 'transactions', path: '/app/transactions', label: 'Transactions',      icon: 'credit-card',                                                   roles: ['OPERATOR', 'AMO', 'SUPPLIER', 'ADMIN'] },
];

/** Filter NAV_ITEMS to those allowed for the given platform role. */
export function navItemsForRole(role) {
  if (!role) return NAV_ITEMS;  // unauthenticated fallback
  return NAV_ITEMS.filter((item) => item.roles?.includes(role));
}
