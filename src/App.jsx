import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import CharacterSheet from './components/CharacterSheet.jsx';
import SphereMark from './components/SphereMark.jsx';
import {
  listCharacters,
  saveCharacter,
  deleteCharacter,
  duplicateCharacter,
  importCharacter
} from './engine/storage.js';
import { blankCharacter } from './engine/newCharacter.js';

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const list = listCharacters();
    setCharacters(list);
    if (list.length > 0) setActiveId(list[0].id);
  }, []);

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
          <CharacterSheet character={active} onChange={handleChange} />
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
  );
}
