export function LoadingBlock({ label = 'Loading…', minHeight = 240 }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px dashed var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 24px',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: 13,
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
      role="status"
      aria-live="polite"
    >
      <span style={{
        width: 14, height: 14, borderRadius: '50%',
        border: '2px solid var(--border-default)',
        borderTopColor: 'var(--text-warning)',
        display: 'inline-block', animation: 'aogRing 0.8s linear infinite',
      }} />
      {label}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }) {
  const message = error?.response?.data?.message || error?.message || 'Something went wrong.';
  return (
    <div
      style={{
        background: 'rgba(212, 86, 86, 0.06)',
        border: '1px solid rgba(212, 86, 86, 0.30)',
        borderLeft: '3px solid var(--text-danger)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
      role="alert"
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-danger)' }}>Couldn't load data</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{message}</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'transparent',
            color: 'var(--text-warning)',
            border: '1px solid rgba(212, 169, 52, 0.30)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Convenience wrapper for async UI:
 *   <ApiState query={query}>{(data) => <Page data={data} />}</ApiState>
 */
export default function ApiState({ query, loadingLabel, children, fallback }) {
  if (query.loading && !query.data) return <LoadingBlock label={loadingLabel} />;
  if (query.error) return <ErrorBlock error={query.error} onRetry={query.refetch} />;
  if (!query.data) return fallback || null;
  return children(query.data);
}
