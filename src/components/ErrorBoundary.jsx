import { Component } from 'react';

// Class component wrapper (function components can't catch render errors).
// Guards a single character's sheet: if computeSheet()/JSX throws on
// corrupt/foreign data that slipped past normalizeCharacter(), this renders a
// recovery card instead of taking down the whole app. Keyed by character id
// in App.jsx so switching characters resets the boundary.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Character sheet crashed', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card error-boundary-card">
          <h2 className="card-title">Something went wrong</h2>
          <p>This character&apos;s data couldn&apos;t be displayed.</p>
          <div className="tracker-controls">
            <button className="btn btn-danger btn-sm" onClick={() => this.props.onDelete?.()}>
              Delete this character
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
