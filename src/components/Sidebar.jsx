import SphereMark from './SphereMark.jsx';

export default function Sidebar({ characters, activeId, onSelect, onNew, onDelete }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <SphereMark />
        <div>
          <div className="brand-title">Spherecaster</div>
          <div className="brand-subtitle">Spheres of Power builder</div>
        </div>
      </div>

      <button className="btn btn-primary btn-block" onClick={onNew}>
        + New Character
      </button>

      <ul className="char-list">
        {characters.map((c) => (
          <li
            key={c.id}
            className={`char-list-item${c.id === activeId ? ' active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div style={{ overflow: 'hidden' }}>
              <div className="char-list-item-name">{c.name || 'Unnamed'}</div>
              <div className="char-list-item-meta">
                {summarizeClasses(c)}
              </div>
            </div>
            <button
              className="btn btn-danger btn-sm"
              title="Delete character"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${c.name || 'Unnamed'}"? This can't be undone.`)) {
                  onDelete(c.id);
                }
              }}
            >
              ✕
            </button>
          </li>
        ))}
        {characters.length === 0 && (
          <li className="char-list-item-meta" style={{ padding: '10px 4px' }}>
            No characters yet.
          </li>
        )}
      </ul>

      <div className="sidebar-footer">
        Saved locally in this browser. Free &amp; open source —{' '}
        <a href="https://github.com" target="_blank" rel="noreferrer">
          fork it on GitHub
        </a>
        .
      </div>
    </aside>
  );
}

function summarizeClasses(c) {
  const levels = c.classLevels || [];
  if (levels.length === 0) return 'No class yet';
  const total = levels.reduce((s, l) => s + (l.level || 0), 0);
  const names = levels.map((l) => l.classId).join(' / ');
  return `Level ${total} · ${names}`;
}
