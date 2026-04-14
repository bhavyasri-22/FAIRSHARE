import { Component } from 'react';

// ─────────────────────────────────────────────────────────────
// ErrorBoundary
//
// Usage:
//   <ErrorBoundary>                        ← catches any child crash
//   <ErrorBoundary page="Dashboard">       ← shows page name in the error UI
//   <ErrorBoundary fallback={<MyUI />}>    ← custom fallback
// ─────────────────────────────────────────────────────────────

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev — swap for a real error-reporting service later
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Allow a fully custom fallback
    if (this.props.fallback) return this.props.fallback;

    const { page, full } = this.props;

    // ── Full-screen fallback (used at the root App level) ──
    if (full) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 40px',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--red)' }} />

            <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px' }}>
              Fair<span style={{ color: 'var(--accent)' }}>Share</span>
            </div>

            <div style={{ color: 'var(--red)', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
              Something went wrong
            </div>

            <div style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: 1.7, marginBottom: '28px' }}>
              The app crashed unexpectedly. This is usually a temporary issue.
            </div>

            {this.state.error && (
              <div style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                fontSize: '11px',
                color: 'var(--text3)',
                fontFamily: 'var(--font-mono)',
                textAlign: 'left',
                marginBottom: '24px',
                wordBreak: 'break-word'
              }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(0,212,170,0.1)',
                  border: '1px solid rgba(0,212,170,0.3)',
                  color: 'var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--border2)',
                  color: 'var(--text2)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Inline page-level fallback ──
    return (
      <div className="fade-up" style={{ padding: '40px 0' }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 32px',
          maxWidth: '480px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--red)' }} />

          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, marginBottom: '8px', color: 'var(--red)' }}>
            {page ? `${page} failed to load` : 'This section crashed'}
          </div>

          <div style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: 1.7, marginBottom: '20px' }}>
            An unexpected error occurred. The rest of the app is still working — try reloading this section.
          </div>

          {this.state.error && (
            <div style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              fontSize: '11px',
              color: 'var(--text3)',
              fontFamily: 'var(--font-mono)',
              marginBottom: '20px',
              wordBreak: 'break-word'
            }}>
              {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '9px 18px',
                background: 'rgba(0,212,170,0.1)',
                border: '1px solid rgba(0,212,170,0.3)',
                color: 'var(--accent)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '9px 18px',
                background: 'transparent',
                border: '1px solid var(--border2)',
                color: 'var(--text2)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}