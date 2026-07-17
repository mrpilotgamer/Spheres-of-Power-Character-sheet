import { blankCharacter } from './newCharacter.js';

const KEY = 'sop-characters-v1';

// Fill in fields added to the schema after a character was saved, so
// older stored characters don't feed undefined into controlled inputs.
function normalizeCharacter(stored) {
  return { ...blankCharacter(), ...stored, id: stored.id };
}

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
  return Object.values(all)
    .map(normalizeCharacter)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getCharacter(id) {
  const all = readAll();
  return all[id] ? normalizeCharacter(all[id]) : null;
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

// Deep-copies a saved character under a fresh id. Throws if the source id
// isn't in storage (e.g. the row was deleted from another tab).
export function duplicateCharacter(id) {
  const all = readAll();
  const source = all[id];
  if (!source) throw new Error(`No character found with id "${id}".`);
  const now = Date.now();
  const copy = {
    ...JSON.parse(JSON.stringify(source)),
    id: newCharacterId(),
    name: `${source.name || 'Unnamed'} (copy)`,
    createdAt: now,
    updatedAt: now
  };
  all[copy.id] = copy;
  writeAll(all);
  return copy;
}

// Saves a character parsed from an imported JSON file. Always assigns a
// fresh id so importing never collides with (or overwrites) an existing
// save. Any fields missing from the import are backfilled later by
// normalizeCharacter() on read (listCharacters/getCharacter), so we don't
// need to validate the full schema here - just that it's an object at all.
export function importCharacter(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('That file is not a valid character export (expected a JSON object).');
  }
  const all = readAll();
  const now = Date.now();
  const toSave = {
    ...parsed,
    id: newCharacterId(),
    createdAt: now,
    updatedAt: now
  };
  all[toSave.id] = toSave;
  writeAll(all);
  return toSave;
}
