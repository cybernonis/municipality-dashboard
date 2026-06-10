import React from 'react';

interface State { hasError: boolean; message: string }

export class MapErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('[MapErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', minHeight: 320,
          background: '#0B1B2B', color: '#8aa0b6', gap: 12, padding: 32,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Σφάλμα χάρτη</div>
          <div style={{ fontSize: 12, opacity: 0.7, maxWidth: 400, textAlign: 'center' }}>{this.state.message}</div>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            style={{ marginTop: 8, padding: '8px 20px', background: '#2E86AB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Επαναφόρτωση
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
