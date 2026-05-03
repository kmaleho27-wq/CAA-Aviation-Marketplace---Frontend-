export default function Logo({ size = 28, showWordmark = true, subtitle = 'Aviation Platform' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="10" cy="22" r="6" stroke="#D4A934" strokeWidth="2" />
        <circle cx="10" cy="22" r="2.5" fill="#D4A934" />
        <line x1="16" y1="18" x2="26" y2="12" stroke="#D4A934" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="22" x2="28" y2="22" stroke="#D4A934" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="26" x2="26" y2="32" stroke="#D4A934" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="28" cy="12" r="3" stroke="#D4A934" strokeWidth="1.5" />
        <circle cx="30" cy="22" r="3" fill="rgba(212,169,52,0.25)" stroke="#D4A934" strokeWidth="1.5" />
        <circle cx="28" cy="32" r="3" stroke="#D4A934" strokeWidth="1.5" />
      </svg>
      {showWordmark && (
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontSize: Math.round(size * 0.6) + 2,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              letterSpacing: '0.02em',
            }}
          >
            Nalu<span style={{ color: 'var(--color-mustard-500)' }}>ka</span>
          </div>
          {subtitle && (
            <div style={{ fontSize: 10, color: 'var(--text-overline)', marginTop: 1, letterSpacing: '0.02em' }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
