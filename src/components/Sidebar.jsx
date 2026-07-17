import { useState } from 'react';
import SphereMark from './SphereMark.jsx';
import { classesById } from '../engine/classLoader.js';

export default function Sidebar({ characters, activeId, onSelect, onNew, onDelete, onDuplicate, onImport }) {
  const [importError, setImportError] = useState(null);
  const active = characters.find((c) => c.id === activeId) || null;

  function handleExport() {
    if (!active) return;
    const json = JSON.stringify(active, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName(active.name)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        onImport(parsed);
        setImportError(null);
      } catch (err) {
        setImportError(err.message || 'Could not import that file.');
      }
    };
    reader.onerror = () => setImportError('Could not read that file.');
    reader.readAsText(file);
  }

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
            <div className="char-list-item-actions">
              <button
                className="btn btn-ghost btn-sm"
                title="Duplicate character"
                aria-label={`Duplicate ${c.name || 'character'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(c.id);
                }}
              >
                ⧉
              </button>
              <button
                className="btn btn-danger btn-sm"
                title="Delete character"
                aria-label={`Delete ${c.name || 'character'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${c.name || 'Unnamed'}"? This can't be undone.`)) {
                    onDelete(c.id);
                  }
                }}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {characters.length === 0 && (
          <li className="char-list-item-meta" style={{ padding: '10px 4px' }}>
            No characters yet.
          </li>
        )}
      </ul>

      <div className="sidebar-io">
        <button className="btn btn-ghost btn-sm btn-block" onClick={handleExport} disabled={!active}>
          Export active
        </button>
        <label className="btn btn-ghost btn-sm btn-block sidebar-import-label">
          Import
          <input type="file" accept="application/json" onChange={handleImportFile} />
        </label>
        {importError && <div className="import-error">{importError}</div>}
      </div>

      <div className="sidebar-footer">
        Saved locally in this browser. Free &amp; open source —{' '}
        <a href="https://github.com/mrpilotgamer/Spheres-of-Power-Character-sheet" target="_blank" rel="noreferrer">
          fork it on GitHub
        </a>
        .
      </div>
    </aside>
  );
}

// Keeps exported filenames filesystem-safe across OSes without pulling in a dependency.
function safeFileName(name) {
  const trimmed = (name || 'character').trim() || 'character';
  return trimmed.replace(/[\\/:*?"<>|]/g, '_');
}

function summarizeClasses(c) {
  const levels = (c.classLevels || []).filter((l) => l.classId);
  if (levels.length === 0) return 'No class yet';
  const total = levels.reduce((s, l) => s + (l.level || 0), 0);
  const names = levels.map((l) => classesById[l.classId]?.name || l.classId).join(' / ');
  return `Level ${total} · ${names}`;
}
