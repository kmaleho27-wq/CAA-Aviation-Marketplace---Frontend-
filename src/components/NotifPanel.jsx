import { useEffect } from 'react';

const COLOR = { aog: 'var(--text-aog)',     warning: 'var(--text-warning)', success: 'var(--text-success)' };
const BG    = { aog: 'rgba(184, 74, 26, 0.15)', warning: 'rgba(212, 169, 52, 0.10)', success: 'rgba(58, 138, 110, 0.10)' };
const BORDER = { aog: 'rgba(220, 90, 54, 0.20)', warning: 'rgba(212, 169, 52, 0.20)', success: 'rgba(91, 170, 142, 0.20)' };
const ICON  = { aog: '⚡', warning: '⚠', success: '✓' };

export default function NotifPanel({ open, onClose, notifications, onMarkAllRead }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div onClick={onClose} style={styles.scrim} aria-hidden />}
      <aside
        style={{ ...styles.panel, transform: open ? 'translateX(0)' : 'translateX(100%)' }}
        aria-hidden={!open}
        aria-label="Notifications"
      >
        <div style={styles.header}>
          <div style={styles.title}>Notifications</div>
          <button onClick={onClose} style={styles.close} aria-label="Close">×</button>
        </div>

        <div style={styles.list}>
          {notifications.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyHero}>🎉</div>
              <div style={styles.emptyTitle}>You're all caught up</div>
              <div style={styles.emptyBody}>
                Document expiry alerts, AOG events, MRO quote responses,
                and admin replies will land here as they happen.
              </div>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} style={{ ...styles.item, background: n.unread ? 'rgba(212, 169, 52, 0.04)' : 'transparent' }}>
                <div
                  style={{
                    ...styles.dot,
                    background: BG[n.type] || BG.success,
                    borderColor: BORDER[n.type] || BORDER.success,
                    color: COLOR[n.type] || COLOR.success,
                  }}
                >
                  {ICON[n.type] || '•'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...styles.itemTitle, fontWeight: n.unread ? 600 : 500 }}>
                    {n.title}
                    {n.unread && <span style={styles.unreadDot} aria-label="unread" />}
                  </div>
                  <div style={styles.itemBody}>{n.title2}</div>
                  <div style={styles.itemTime}>{n.time}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.footer}>
          <button onClick={onMarkAllRead} style={styles.markBtn}>Mark all as read</button>
        </div>
      </aside>
    </>
  );
}

const styles = {
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(7, 12, 32, 0.50)',
    backdropFilter: 'blur(2px)',
    zIndex: 299,
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 360,
    maxWidth: '100vw',
    zIndex: 300,
    background: 'var(--surface-raised)',
    borderLeft: '1px solid var(--border-default)',
    boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.50)',
    transition: 'transform 280ms ease-out',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '18px 18px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 18,
    letterSpacing: '0.02em',
    color: 'var(--text-primary)',
  },
  close: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: 20,
    lineHeight: 1,
  },
  list: { flex: 1, overflowY: 'auto', padding: '6px 0' },
  item: {
    padding: '12px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    flexShrink: 0,
    marginTop: 1,
  },
  itemTitle: {
    fontSize: 12,
    color: 'var(--text-primary)',
    marginBottom: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--color-mustard-500)',
    display: 'inline-block',
    flexShrink: 0,
  },
  itemBody: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    lineHeight: 1.5,
    marginBottom: 3,
  },
  itemTime: { fontSize: 10, color: 'var(--text-overline)' },
  empty: { padding: '40px 24px', textAlign: 'center' },
  emptyHero: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 },
  emptyBody: { fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto' },
  footer: { padding: '12px 18px', borderTop: '1px solid var(--border-subtle)' },
  markBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: 8,
    fontSize: 12,
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
  },
};
