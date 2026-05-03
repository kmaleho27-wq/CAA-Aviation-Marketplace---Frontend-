import { fixtures, parseAmount, formatZar, recomputeKpis, issueMockJwt } from './fixtures';

// Each handler signature: ({ params, body, query, headers }) => responseBody
// Throw HttpError to signal a non-2xx response.
export class HttpError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body || { message };
  }
}

const ok = (data) => data;
const notFound = () => { throw new HttpError(404, 'Not found'); };
const badRequest = (msg) => { throw new HttpError(400, msg); };
const unauthorized = (msg = 'Unauthorized') => { throw new HttpError(401, msg); };

export const handlers = [
  // ── Auth ───────────────────────────────────────────────────
  {
    method: 'POST', path: '/auth/login',
    handler: ({ body }) => {
      if (!body?.email || !body?.password) badRequest('Email and password required.');
      const user = fixtures.users.find(
        (u) => u.email.toLowerCase() === String(body.email).toLowerCase() && u.password === body.password,
      );
      if (!user) {
        // Accept any "demo*" password for any email — easier to demo
        if (String(body.password).startsWith('demo')) {
          const guest = {
            id: Date.now(),
            email: body.email,
            name: body.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            role: 'OPERATOR',
          };
          return ok({ token: issueMockJwt(guest), user: { id: guest.id, email: guest.email, name: guest.name, role: guest.role } });
        }
        unauthorized('Invalid email or password.');
      }
      return ok({ token: issueMockJwt(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    },
  },
  {
    method: 'POST', path: '/auth/register',
    handler: ({ body }) => {
      if (!body?.email || !body?.password) badRequest('Email and password required.');
      if (fixtures.users.some((u) => u.email.toLowerCase() === String(body.email).toLowerCase())) {
        badRequest('An account with that email already exists.');
      }
      const user = {
        id: fixtures.users.length + 1,
        email: body.email,
        password: body.password,
        name: body.name || body.email.split('@')[0],
        role: body.role || 'AME',
      };
      fixtures.users.push(user);
      return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
    },
  },
  {
    method: 'GET', path: '/auth/me',
    handler: ({ headers }) => {
      const token = (headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) unauthorized();
      // Decode our mock JWT (base64url payload, segment 1)
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return ok({ id: payload.sub, email: payload.email, name: payload.name, role: payload.role });
      } catch {
        unauthorized();
      }
    },
  },

  // ── Operator dashboard ────────────────────────────────────
  { method: 'GET', path: '/dashboard/kpis',  handler: () => { recomputeKpis(); return ok(fixtures.kpis); } },
  { method: 'GET', path: '/dashboard/aog',   handler: () => ok(fixtures.aog) },

  // ── Marketplace ───────────────────────────────────────────
  {
    method: 'GET', path: '/parts',
    handler: ({ query }) => {
      const { search, category } = query;
      let parts = fixtures.parts;
      if (category && category !== 'All') {
        if (category === 'AOG Priority') parts = parts.filter((p) => p.aog);
        // Other categories are fixture-only stubs in this mock
      }
      if (search) {
        const term = search.toLowerCase();
        parts = parts.filter((p) => p.name.toLowerCase().includes(term) || p.pn.toLowerCase().includes(term));
      }
      return ok(parts);
    },
  },
  {
    method: 'POST', path: '/parts/:id/procure',
    handler: ({ params }) => {
      const part = fixtures.parts.find((p) => String(p.id) === String(params.id));
      if (!part) notFound();
      const txn = {
        id: `TXN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
        type: 'Parts',
        item: part.name,
        party: part.supplier,
        amount: part.price,
        status: 'in-escrow',
        created: new Date().toISOString().slice(0, 10),
        updated: 'just now',
        aog: part.aog,
      };
      fixtures.transactions.unshift(txn);
      recomputeKpis();
      return ok({ transaction: txn });
    },
  },

  // ── Personnel ─────────────────────────────────────────────
  {
    method: 'GET', path: '/personnel',
    handler: ({ query }) => {
      const filter = query.filter || 'All';
      let list = fixtures.personnel;
      if (filter === 'Available') list = list.filter((c) => c.available && c.status !== 'expired');
      else if (filter === 'Part 66') list = list.filter((c) => c.rating.includes('Part 66'));
      else if (filter === 'Part 61') list = list.filter((c) => c.rating.includes('Part 61'));
      else if (filter === 'Part 64') list = list.filter((c) => c.rating.includes('Part 64'));
      else if (filter === 'Johannesburg' || filter === 'Cape Town') list = list.filter((c) => c.location === filter);
      return ok(list);
    },
  },
  {
    method: 'POST', path: '/personnel/:id/hire',
    handler: ({ params }) => {
      const c = fixtures.personnel.find((p) => String(p.id) === String(params.id));
      if (!c) notFound();
      const contractId = `HIRE-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
      const txn = {
        id: `TXN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
        type: 'Personnel',
        item: `${c.role} — 14-day contract`,
        party: c.name,
        amount: c.rate.replace('/day', '/day · 14d'),
        status: 'in-escrow',
        created: new Date().toISOString().slice(0, 10),
        updated: 'just now',
        aog: false,
      };
      fixtures.transactions.unshift(txn);
      return ok({ contractId, transaction: txn });
    },
  },

  // ── Compliance Vault ──────────────────────────────────────
  {
    method: 'GET', path: '/documents',
    handler: ({ query }) => {
      const { type, status } = query;
      let docs = fixtures.documents;
      if (type && type !== 'All') docs = docs.filter((d) => d.type === type);
      if (status && status !== 'All') docs = docs.filter((d) => d.status === status);
      return ok(docs);
    },
  },

  // ── Transactions / Escrow ─────────────────────────────────
  { method: 'GET', path: '/transactions', handler: () => ok(fixtures.transactions) },
  {
    method: 'POST', path: '/transactions/:id/sign-rts',
    handler: ({ params }) => {
      const t = fixtures.transactions.find((x) => x.id === params.id);
      if (!t) notFound();
      if (t.status !== 'rts-pending') badRequest('Transaction is not awaiting sign-off.');
      t.status = 'completed';
      t.updated = 'just now';
      t.aog = false;
      recomputeKpis();
      return ok({ transaction: t });
    },
  },

  // ── Notifications ─────────────────────────────────────────
  { method: 'GET', path: '/notifications', handler: () => ok(fixtures.notifications) },
  {
    method: 'POST', path: '/notifications/mark-all-read',
    handler: () => {
      fixtures.notifications = fixtures.notifications.map((n) => ({ ...n, unread: false }));
      return ok({ unread: 0 });
    },
  },

  // ── Admin: KYC ────────────────────────────────────────────
  { method: 'GET', path: '/admin/kyc', handler: () => ok(fixtures.kyc) },
  {
    method: 'POST', path: '/admin/kyc/:id/approve',
    handler: ({ params }) => {
      const a = fixtures.kyc.find((x) => x.id === params.id);
      if (!a) notFound();
      a.status = 'approved';
      return ok(a);
    },
  },
  {
    method: 'POST', path: '/admin/kyc/:id/reject',
    handler: ({ params }) => {
      const a = fixtures.kyc.find((x) => x.id === params.id);
      if (!a) notFound();
      a.status = 'rejected';
      return ok(a);
    },
  },

  // ── Admin: Disputes ───────────────────────────────────────
  { method: 'GET', path: '/admin/disputes', handler: () => ok(fixtures.disputes) },
  {
    method: 'POST', path: '/admin/disputes/:id/resolve',
    handler: ({ params, body }) => {
      const d = fixtures.disputes.find((x) => x.id === params.id);
      if (!d) notFound();
      const outcome = body?.outcome;
      if (!['released', 'refunded', 'docs'].includes(outcome)) badRequest('Invalid outcome.');
      d.status = outcome;
      return ok(d);
    },
  },

  // ── Admin: Analytics ──────────────────────────────────────
  {
    method: 'GET', path: '/admin/analytics',
    handler: () => ok({
      kpis: fixtures.analyticsKpis,
      gmv: fixtures.gmv,
      expiryWatch: fixtures.expiryWatch,
    }),
  },

  // ── Admin: Overview KPIs ──────────────────────────────────
  {
    method: 'GET', path: '/admin/overview',
    handler: () => ok({
      kpis: fixtures.overviewKpis,
      recentKyc: fixtures.kyc.slice(0, 3),
      openDisputes: fixtures.disputes.filter((d) => d.status === 'open').length,
    }),
  },

  // ── Contractor (mobile) ───────────────────────────────────
  { method: 'GET', path: '/contractor/wallet',     handler: () => ok({ docs: fixtures.walletDocs, earnings: fixtures.earnings, user: fixtures.contractor }) },
  { method: 'GET', path: '/contractor/jobs',       handler: () => ok(fixtures.jobs) },
  {
    method: 'POST', path: '/contractor/jobs/:id/accept',
    handler: ({ params }) => {
      const job = fixtures.jobs.find((j) => j.id === params.id);
      if (!job) notFound();
      job.accepted = true;
      return ok(job);
    },
  },
  { method: 'GET', path: '/contractor/work-order', handler: () => ok(fixtures.workOrder) },
  {
    method: 'POST', path: '/contractor/work-order/sign',
    handler: () => {
      fixtures.workOrder.signed = true;
      return ok(fixtures.workOrder);
    },
  },
];

// Path matcher: returns params object or null
export function matchPath(template, actual) {
  const tParts = template.split('/').filter(Boolean);
  const aParts = actual.split('/').filter(Boolean);
  if (tParts.length !== aParts.length) return null;
  const params = {};
  for (let i = 0; i < tParts.length; i++) {
    if (tParts[i].startsWith(':')) {
      params[tParts[i].slice(1)] = decodeURIComponent(aParts[i]);
    } else if (tParts[i] !== aParts[i]) {
      return null;
    }
  }
  return params;
}
