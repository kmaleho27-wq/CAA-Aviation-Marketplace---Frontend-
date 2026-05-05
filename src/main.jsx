import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initSentry, SentryErrorBoundary } from './lib/sentry'
import { ThemeProvider } from './lib/theme.jsx'

// Initialise Sentry before React mounts so errors during the very
// first render (e.g. broken imports, missing globals) are captured.
initSentry();

// Top-level error boundary catches any uncaught render error in the
// route tree. Sends to Sentry + shows a minimal fallback. Most pages
// have their own ErrorBlock for API-level failures; this is for the
// "the app itself crashed" tier.
function CrashFallback({ error, resetError }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      background: 'var(--surface-base)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 28,
          marginBottom: 12,
        }}>
          Something went wrong on our side
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          We've logged the error and our team will look into it. You can try
          reloading — most of the time that gets you back where you were.
        </p>
        <button
          onClick={() => { resetError(); window.location.reload(); }}
          style={{
            background: 'var(--action-primary)',
            color: 'var(--action-primary-text)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reload Naluka
        </button>
        {import.meta.env.DEV && error && (
          <pre style={{
            marginTop: 24,
            padding: 12,
            background: 'var(--surface-input)',
            borderRadius: 8,
            fontSize: 11,
            textAlign: 'left',
            color: 'var(--text-danger)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>{String(error)}</pre>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <SentryErrorBoundary fallback={CrashFallback}>
        <App />
      </SentryErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
)
