import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import storage from './storage.js';
import './index.css';
import App from './App.jsx';

window.storage = storage;

function handleReset() {
  try { localStorage.removeItem('speakai_history'); } catch { /* ignore */ }
  window.location.reload();
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a14', color: '#e2e8f0', padding: '24px', textAlign: 'center' }}>
          <div role="alert">
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ color: '#718096', fontSize: 14, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
              The app encountered an unexpected error. Clearing app data usually fixes this.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleReset}
                style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                🗑️ Clear data &amp; reload
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: '10px 22px', background: 'rgba(255,255,255,0.07)', color: '#a0aec0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                ↺ Just reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
