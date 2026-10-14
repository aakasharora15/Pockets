import { Component, type ReactNode } from 'react';
import { reportError } from '../lib/report';

/**
 * Last line of defence: if a screen crashes while drawing, report it and offer a reload instead of
 * leaving a blank page. Saved data is untouched; the crash only affects what's on screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError('render', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="app">
        <div className="screen flow">
          <div className="flow-body">
            <div className="flow-head" style={{ position: 'static' }}>
              <span className="flow-title">Something went wrong</span>
              <span className="flow-sub">Spendr hit a problem drawing this screen. Your expenses are safe. Reload to carry on.</span>
            </div>
          </div>
          <div className="flow-foot">
            <button className="primary-btn bottom-primary press" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
