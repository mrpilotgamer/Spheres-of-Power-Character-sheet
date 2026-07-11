import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import CharacterSheet from './components/CharacterSheet.jsx';
import SphereMark from './components/SphereMark.jsx';
import { listCharacters, saveCharacter, deleteCharacter } from './engine/storage.js';
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

  return (
    <div className="app-shell">
      <Sidebar
        characters={characters}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
      />
      <main className="main">
        {active ? (
          <CharacterSheet character={active} onChange={handleChange} />
        ) : (
          <div className="empty-state">
            <SphereMark size={56} />
            <h1>No character selected</h1>
            <p>Create a new spherecaster to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}
