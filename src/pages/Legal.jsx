// Legal page — renders ToS or Privacy Policy from the markdown source
// at build time (imported as raw strings). For real launch we'd swap
// to a markdown-rendered React component (react-markdown) for clean
// formatting; for now this is plain-text-styled with a max-width.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

// Vite's `?raw` import suffix gives us the file content as a string.
import termsMarkdown   from '../../docs/legal/terms-of-service.md?raw';
import privacyMarkdown from '../../docs/legal/privacy-policy.md?raw';

const SOURCES = {
  terms:   { title: 'Terms of Service', body: termsMarkdown },
  privacy: { title: 'Privacy Policy',   body: privacyMarkdown },
};

export default function Legal({ which }) {
  const src = SOURCES[which];
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo size={28} subtitle="Aviation Platform" />
        </Link>
      </header>
      <main style={styles.main}>
        <div style={styles.overline}>Legal</div>
        <h1 style={styles.h1}>{src.title}</h1>
        <pre style={styles.body}>{src.body}</pre>
      </main>
    </div>
  );
}

const styles = {
  page:   { minHeight: '100vh', background: 'var(--surface-base)', display: 'flex', flexDirection: 'column' },
  header: { padding: '20px 32px', borderBottom: '1px solid var(--border-subtle)' },
  main:   { flex: 1, padding: '40px 32px', maxWidth: 820, width: '100%', margin: '0 auto' },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 8 },
  h1:    { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', marginBottom: 24 },
  body: {
    fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6,
    color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)', padding: 24,
  },
};
