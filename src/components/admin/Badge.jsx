const SCHEMES = {
  verified: { bg: 'rgba(58, 138, 110, 0.12)', color: 'var(--color-sage-500)', border: 'rgba(58, 138, 110, 0.25)' },
  pending:  { bg: 'rgba(212, 169, 52, 0.12)', color: 'var(--text-warning)',   border: 'rgba(212, 169, 52, 0.25)' },
  rejected: { bg: 'rgba(196, 48, 48, 0.12)',  color: 'var(--text-danger)',    border: 'rgba(196, 48, 48, 0.25)' },
  dispute:  { bg: 'rgba(184, 74, 26, 0.12)',  color: 'var(--text-aog)',       border: 'rgba(184, 74, 26, 0.25)' },
  aog:      { bg: 'rgba(184, 74, 26, 0.15)',  color: 'var(--text-aog)',       border: 'rgba(184, 74, 26, 0.30)' },
  neutral:  { bg: 'rgba(255, 255, 255, 0.06)',color: 'var(--text-tertiary)',  border: 'transparent'             },
};

export default function Badge({ label, scheme = 'neutral' }) {
  const s = SCHEMES[scheme] || SCHEMES.neutral;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: 'var(--radius-pill)',
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
}
