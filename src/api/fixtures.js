// Mutable in-memory fixtures used by the mock API adapter.
// Imported here from data/* and cloned so handlers can mutate without
// affecting the static mock exports used elsewhere as fallbacks.

import {
  KPIS as INITIAL_KPIS,
  AOG_EVENTS as INITIAL_AOG,
  PERSONNEL as INITIAL_PERSONNEL,
  PARTS as INITIAL_PARTS,
  TRANSACTIONS as INITIAL_TRANSACTIONS,
  DOCUMENTS as INITIAL_DOCUMENTS,
  NOTIFICATIONS as INITIAL_NOTIFS,
} from '../data/mock';
import {
  KYC_APPS as INITIAL_KYC,
  DISPUTES as INITIAL_DISPUTES,
  OVERVIEW_KPIS as INITIAL_OVERVIEW_KPIS,
  ANALYTICS_KPIS as INITIAL_ANALYTICS_KPIS,
  GMV_BARS as INITIAL_GMV,
  EXPIRY_WATCH as INITIAL_EXPIRY,
} from '../data/admin';
import {
  JOBS as INITIAL_JOBS,
  WALLET_DOCS as INITIAL_WALLET_DOCS,
  EARNINGS as INITIAL_EARNINGS,
  ACTIVE_WORK_ORDER as INITIAL_WORK_ORDER,
  CURRENT_USER as INITIAL_CONTRACTOR,
} from '../data/mobile';

const clone = (v) => JSON.parse(JSON.stringify(v));

export const fixtures = {
  kpis: clone(INITIAL_KPIS),
  aog: clone(INITIAL_AOG),
  personnel: clone(INITIAL_PERSONNEL),
  parts: clone(INITIAL_PARTS),
  transactions: clone(INITIAL_TRANSACTIONS),
  documents: clone(INITIAL_DOCUMENTS),
  notifications: clone(INITIAL_NOTIFS),

  kyc: clone(INITIAL_KYC).map((a) => ({ ...a, status: 'pending' })),
  disputes: clone(INITIAL_DISPUTES).map((d) => ({ ...d, status: 'open' })),
  overviewKpis: clone(INITIAL_OVERVIEW_KPIS),
  analyticsKpis: clone(INITIAL_ANALYTICS_KPIS),
  gmv: clone(INITIAL_GMV),
  expiryWatch: clone(INITIAL_EXPIRY),

  jobs: clone(INITIAL_JOBS).map((j) => ({ ...j, accepted: false })),
  walletDocs: clone(INITIAL_WALLET_DOCS),
  earnings: clone(INITIAL_EARNINGS),
  workOrder: { ...clone(INITIAL_WORK_ORDER), signed: false },
  contractor: clone(INITIAL_CONTRACTOR),

  // Test users for /auth/login. In real backend this is the users table.
  users: [
    { id: 1, email: 'operator@naluka.aero',  password: 'demo1234', name: 'Sipho Dlamini',  role: 'OPERATOR' },
    { id: 2, email: 'admin@naluka.aero',     password: 'demo1234', name: 'Trust Admin',     role: 'ADMIN'    },
    { id: 3, email: 'contractor@naluka.aero', password: 'demo1234', name: 'Sipho Dlamini', role: 'AME'      },
  ],
};

// Helpers used by handlers ────────────────────────────────────
export function parseAmount(amount) {
  const n = Number(String(amount).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatZar(n) {
  return `ZAR ${n.toLocaleString('en-ZA')}`;
}

export function recomputeKpis() {
  const aogCount = fixtures.aog.length;
  const escrow = fixtures.transactions
    .filter((t) => t.status === 'in-escrow' || t.status === 'rts-pending')
    .reduce((acc, t) => acc + parseAmount(t.amount), 0);

  fixtures.kpis = fixtures.kpis.map((k) => {
    if (k.label === 'Active AOG Events') return { ...k, value: String(aogCount) };
    if (k.label === 'Escrow Balance')    return { ...k, value: formatZar(escrow) };
    return k;
  });
}

// Pseudo-JWT builder (base64url of the header + payload). Not signed —
// fine for a mock; the real backend issues a properly signed token.
export function issueMockJwt(user) {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = {
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const enc = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${enc(header)}.${enc(payload)}.mock`;
}
