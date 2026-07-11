const KEY = 'sop-characters-v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to read characters from storage', e);
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    console.error('Failed to save characters to storage', e);
    return false;
  }
}

export function listCharacters() {
  const all = readAll();
  return Object.values(all).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getCharacter(id) {
  const all = readAll();
  return all[id] || null;
}

export function saveCharacter(character) {
  const all = readAll();
  const now = Date.now();
  const existing = all[character.id];
  const toSave = {
    ...character,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  all[character.id] = toSave;
  writeAll(all);
  return toSave;
}

export function deleteCharacter(id) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

export function newCharacterId() {
  return 'char-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}
