export const KYC_APPS = [
  { id: 'KYC-2411-042', name: 'Thabo Nkosi',       type: 'Licensed Engineer', license: 'SA-0388-B1',     docs: ['SACAA Licence', 'ID Document', 'Medical Cert'], risk: 'low',    submitted: '2h ago' },
  { id: 'KYC-2411-041', name: 'Fatima Al-Hassan',  type: 'Commercial Pilot',  license: 'SA-0401-P1',     docs: ['SACAA Licence', 'ID Document'],                  risk: 'medium', submitted: '5h ago' },
  { id: 'KYC-2411-039', name: 'Moses Kamau',       type: 'ATC Officer',       license: 'KE-0312-ATC',    docs: ['KCAA Licence', 'ID Document', 'Medical Cert'],   risk: 'low',    submitted: '1d ago' },
  { id: 'KYC-2411-037', name: 'Priya Naidoo',      type: 'DAME',              license: 'SA-DAME-0091',   docs: ['SACAA Medical Auth', 'ID Document'],             risk: 'high',   submitted: '1d ago' },
  { id: 'KYC-2411-036', name: 'Charl Pretorius',   type: 'Licensed Engineer', license: 'SA-0199-B2',     docs: ['SACAA Licence', 'ID Document', 'Medical Cert'],  risk: 'low',    submitted: '2d ago' },
];

export const DISPUTES = [
  { id: 'TXN-2024-0031', item: 'Nose Gear Actuator Assembly', buyer: 'Kenya Airways',   seller: 'Nairobi MRO Centre',    amount: 'ZAR 211,000', reason: 'Documentation incomplete — SACAA Form 18 missing',   days: 8 },
  { id: 'TXN-2024-0027', item: 'A-Check Service — 5Y-KQZ',    buyer: 'Africa Express',  seller: 'JHB Aviation Services', amount: 'ZAR 180,000', reason: 'Buyer disputes RTS signatory authorisation level', days: 3 },
];

export const OVERVIEW_KPIS = [
  { label: 'KYC Pending',     value: '5',         sub: 'Awaiting verification', tone: 'warning' },
  { label: 'Open Disputes',   value: '2',         sub: 'Require resolution',     tone: 'aog'     },
  { label: 'Escrow Active',   value: 'ZAR 763K',  sub: '11 transactions',        tone: 'warning' },
  { label: 'Verified Users',  value: '1,204',     sub: '+14 this week',          tone: 'success' },
  { label: 'Platform GMV',    value: 'ZAR 4.2M',  sub: 'November MTD',           tone: 'primary' },
];

export const ANALYTICS_KPIS = [
  { label: 'Total Users',    value: '1,204',     sub: '+14 this week',     tone: 'warning' },
  { label: 'Verified Rate',  value: '91.2%',     sub: 'Of registered users', tone: 'success' },
  { label: 'Avg Escrow',     value: 'ZAR 69.3K', sub: 'Per transaction',    tone: 'primary' },
  { label: 'Commission Rev', value: 'ZAR 126K',  sub: 'MTD at 3%',          tone: 'warning' },
];

export const GMV_BARS = [
  { label: 'Jul', gmv: 1.2, txns: 22 },
  { label: 'Aug', gmv: 1.8, txns: 31 },
  { label: 'Sep', gmv: 2.1, txns: 38 },
  { label: 'Oct', gmv: 3.4, txns: 51 },
  { label: 'Nov', gmv: 4.2, txns: 64 },
];

export const EXPIRY_WATCH = [
  { doc: 'B737 Type Rating',     name: 'Anele Mokoena',     days: '42 days' },
  { doc: 'SACAA AMO Cert',       name: 'AeroTech Parts SA', days: '58 days' },
  { doc: 'Class 1 Medical',      name: 'Anele Mokoena',     days: '60 days' },
  { doc: 'Part 66 Cat B1',       name: 'Kagiso Sithole',    days: '78 days' },
  { doc: 'DAME Authorisation',   name: 'Dr. Priya Naidoo',  days: '85 days' },
];

export const ADMIN_NAV = [
  { id: 'overview',     path: '/admin/overview',     label: 'Overview',    icon: 'grid' },
  { id: 'kyc',          path: '/admin/kyc',          label: 'KYC Queue',   icon: 'users',  badge: 5 },
  { id: 'transactions', path: '/admin/transactions', label: 'Transactions', icon: 'card' },
  { id: 'disputes',     path: '/admin/disputes',     label: 'Disputes',    icon: 'alert',  badge: 2 },
  { id: 'analytics',    path: '/admin/analytics',    label: 'Analytics',   icon: 'chart' },
];
