export default function PageStub({ overline, title, phase, description }) {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>{overline}</div>
          <h1 style={styles.h1}>{title}</h1>
        </div>
      </div>
      <div style={styles.card}>
        <div style={styles.phaseTag}>Phase {phase}</div>
        <h2 style={styles.h2}>Coming next</h2>
        <p style={styles.body}>{description}</p>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { marginBottom: 24 },
  overline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 4,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 32,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    lineHeight: 1,
  },
  card: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px 28px',
    maxWidth: 640,
  },
  phaseTag: {
    display: 'inline-block',
    background: 'rgba(212, 169, 52, 0.10)',
    color: 'var(--text-accent)',
    border: '1px solid rgba(212, 169, 52, 0.25)',
    borderRadius: 'var(--radius-pill)',
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
    marginBottom: 16,
  },
  h2: {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 400,
    color: 'var(--text-primary)',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
    maxWidth: 520,
  },
};
