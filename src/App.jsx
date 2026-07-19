import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import CharacterSheet from './components/CharacterSheet.jsx';
import SphereMark from './components/SphereMark.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import {
  listCharacters,
  saveCharacter,
  deleteCharacter,
  duplicateCharacter,
  importCharacter,
  subscribeToWriteFailures
} from './engine/storage.js';
import { blankCharacter } from './engine/newCharacter.js';

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [writeFailed, setWriteFailed] = useState(false);

  useEffect(() => {
    const list = listCharacters();
    setCharacters(list);
    if (list.length > 0) setActiveId(list[0].id);
  }, []);

  // Surface localStorage write failures (quota exceeded). In-memory edits still
  // proceed; the banner just warns they may be lost on reload. A later
  // successful write (ok === true) clears it automatically.
  useEffect(() => subscribeToWriteFailures((ok) => setWriteFailed(!ok)), []);

  const active = characters.find((c) => c.id === activeId) || null;

  function handleNew() {
    const c = blankCharacter();
    const saved = saveCharacter(c);
    setCharacters(listCharacters());
    setActiveId(saved.id);
  }

  function handleChange(updated) {
    const saved = saveCharacter(updated);
    setCharacters((prev) => {
      const next = prev.map((c) => (c.id === saved.id ? saved : c));
      return next;
    });
  }

  function handleDelete(id) {
    deleteCharacter(id);
    const list = listCharacters();
    setCharacters(list);
    if (activeId === id) {
      setActiveId(list.length > 0 ? list[0].id : null);
    }
  }

  function handleDuplicate(id) {
    const copy = duplicateCharacter(id);
    setCharacters(listCharacters());
    setActiveId(copy.id);
  }

  function handleImport(parsed) {
    const saved = importCharacter(parsed);
    setCharacters(listCharacters());
    setActiveId(saved.id);
  }

  return (
    <>
      {writeFailed && (
        <div className="storage-banner" role="alert">
          <span className="storage-banner-text">
            Couldn't save — browser storage is full. Recent changes may be lost on reload.
          </span>
          <button
            type="button"
            className="storage-banner-dismiss"
            aria-label="Dismiss storage error"
            onClick={() => setWriteFailed(false)}
          >
            ✕
          </button>
        </div>
      )}
      <div className="app-shell">
        <Sidebar
          characters={characters}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={handleNew}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onImport={handleImport}
        />
        <main className="main">
          {active ? (
            <ErrorBoundary key={active.id} onDelete={() => handleDelete(active.id)}>
              <CharacterSheet character={active} onChange={handleChange} />
            </ErrorBoundary>
          ) : (
            <div className="empty-state">
              <SphereMark size={56} />
              <h1>No character selected</h1>
              <p>Create a new spherecaster to get started.</p>
              <ol className="onboarding-steps">
                <li>Create a character with the button in the sidebar.</li>
                <li>Add your race, classes, and ability scores on the Character tab.</li>
                <li>The sheet computes everything from there - skills, AC, DCs, and more.</li>
              </ol>
              <p className="onboarding-hint">
                Once you're at the table, switch to the Play tab to track buffs, conditions, and HP.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
