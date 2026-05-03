import { Link } from 'react-router-dom';

const YEAR = new Date().getFullYear();

export default function MarketingFooter() {
  return (
    <footer style={styles.footer}>
      <div>
        <div style={styles.brand}>
          Nalu<span style={{ color: 'var(--text-warning)' }}>ka</span>
        </div>
        <div style={styles.tag}>Aviation Ecosystem Marketplace · South Africa</div>
      </div>

      <div style={styles.links}>
        <a href="/#features"   style={styles.link}>Platform</a>
        <Link to="/pricing"    style={styles.link}>Pricing</Link>
        <a href="/#compliance" style={styles.link}>Compliance</a>
        <Link to="/login"      style={styles.link}>Sign in</Link>
      </div>

      <div style={styles.copy}>© {YEAR} Naluka · SACAA Compliant</div>
    </footer>
  );
}

const styles = {
  footer: {
    background: 'var(--surface-raised)',
    borderTop: '1px solid var(--border-subtle)',
    padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 64px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  brand: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  tag: {
    fontSize: 11,
    color: 'var(--text-overline)',
    marginTop: 4,
  },
  links: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  link: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
  },
  copy: { fontSize: 12, color: 'var(--text-overline)' },
};
