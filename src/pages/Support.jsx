import { useEffect, useState } from 'react';
import { submitSupportTicket, listMySupportTickets } from '../api/support';
import { useToast } from '../lib/toast';
import { getUser } from '../lib/auth';

const STATUS_LABEL = {
  open: { label: 'Open', color: 'var(--text-warning)' },
  in_progress: { label: 'In progress', color: 'var(--text-warning)' },
  resolved: { label: 'Resolved', color: 'var(--color-sage-500)' },
  closed: { label: 'Closed', color: 'var(--text-tertiary)' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Support() {
  const user = getUser();
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const toast = useToast();

  useEffect(() => {
    if (!user) return;
    listMySupportTickets().then(setTickets).catch(() => {});
  }, [user?.id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitSupportTicket({ email, subject, body });
      toast.success('Ticket submitted — we respond within 24 hours.');
      setSubject('');
      setBody('');
      if (user) {
        const fresh = await listMySupportTickets();
        setTickets(fresh);
      }
    } catch (err) {
      toast.error(err.message || 'Could not submit ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Help</div>
          <h1 style={styles.h1}>Support</h1>
          <div style={styles.sub}>
            Hit a snag? Send us a message — we typically respond within
            <strong style={{ color: 'var(--text-warning)' }}> 24 hours</strong>.
            For AOG emergencies, email <a href="mailto:aog@naluka.aero" style={styles.link}>aog@naluka.aero</a> directly.
          </div>
        </div>
      </div>

      <div style={styles.split}>
        <form onSubmit={onSubmit} style={styles.formCard}>
          <div style={styles.cardLabel}>Submit a ticket</div>
          <label style={styles.label}>Your email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.aero"
            required
            style={styles.input}
          />
          <label style={styles.label}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Verification taking too long"
            required
            minLength={3}
            style={styles.input}
          />
          <label style={styles.label}>What's going on?</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe what you were doing, what you expected to see, and what actually happened. Screenshots welcome — drag them into a follow-up email reply."
            required
            minLength={10}
            rows={6}
            style={{ ...styles.input, minHeight: 140, fontFamily: 'inherit', padding: 10, lineHeight: 1.5 }}
          />
          <button type="submit" disabled={submitting} style={{ ...styles.submit, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Submitting…' : 'Send message'}
          </button>
          <div style={styles.altRow}>
            Or email <a href="mailto:support@naluka.aero" style={styles.link}>support@naluka.aero</a> directly.
          </div>
        </form>

        <div style={styles.sideCard}>
          <div style={styles.cardLabel}>Common questions</div>
          <details style={styles.faq}>
            <summary style={styles.faqQ}>How long does verification take?</summary>
            <div style={styles.faqA}>Typically within 4 business hours. We check your SACAA licence references and uploaded documents. If something's missing, we'll email you to follow up.</div>
          </details>
          <details style={styles.faq}>
            <summary style={styles.faqQ}>Why is my badge "Documents on file" instead of "Verified"?</summary>
            <div style={styles.faqA}>Until live SACAA API integration lands (in progress), every verification is platform-DB only. The honest framing protects you and us — a "Verified" badge that doesn't actually verify is worse than no badge.</div>
          </details>
          <details style={styles.faq}>
            <summary style={styles.faqQ}>How do I get notified when a document is about to expire?</summary>
            <div style={styles.faqA}>You're auto-notified at 90, 30, and 7 days before expiry. Bell icon top-right. We also notify the operator who manages you (if any) so they're not blindsided.</div>
          </details>
          <details style={styles.faq}>
            <summary style={styles.faqQ}>What's the commission?</summary>
            <div style={styles.faqA}>3% on completed personnel transactions, 5% on parts. No subscription for individuals; airlines and AMOs have a monthly tier — see /pricing.</div>
          </details>
          <details style={styles.faq}>
            <summary style={styles.faqQ}>Can I delete my account?</summary>
            <div style={styles.faqA}>Yes — Profile → Delete account. We retain your data for 90 days (in case you change your mind), then hard-purge it per POPI Act.</div>
          </details>
        </div>
      </div>

      {user && tickets.length > 0 && (
        <div style={styles.ticketsSection}>
          <div style={styles.cardLabel}>Your recent tickets</div>
          <div style={styles.tickets}>
            {tickets.map((t) => {
              const s = STATUS_LABEL[t.status] || STATUS_LABEL.open;
              return (
                <div key={t.id} style={styles.ticket}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.ticketSubject}>{t.subject}</div>
                    <div style={styles.ticketMeta}>{fmtDate(t.createdAt)} · #{t.id.slice(0, 8)}</div>
                  </div>
                  <span style={{ ...styles.statusPill, color: s.color, borderColor: s.color }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1100 },
  header: { marginBottom: 22 },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1, marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 640, lineHeight: 1.6 },
  link: { color: 'var(--text-warning)', textDecoration: 'none' },
  split: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 },
  formCard: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 18 },
  sideCard: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 18 },
  cardLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 12, marginBottom: 6 },
  input: { display: 'block', width: '100%', height: 38, background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  submit: { width: '100%', height: 40, marginTop: 16, background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  altRow: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10, textAlign: 'center' },
  faq: { marginBottom: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 },
  faqQ: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' },
  faqA: { fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, marginTop: 8 },
  ticketsSection: { marginTop: 20 },
  tickets: { display: 'flex', flexDirection: 'column', gap: 6 },
  ticket: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' },
  ticketSubject: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  ticketMeta: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 },
  statusPill: { fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid', whiteSpace: 'nowrap' },
};
