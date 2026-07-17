import { describe, it, expect, beforeEach } from 'vitest';
import {
  listCharacters,
  getCharacter,
  saveCharacter,
  deleteCharacter,
  duplicateCharacter,
  importCharacter,
  newCharacterId
} from './storage.js';
import { blankCharacter } from './newCharacter.js';

// storage.js talks to the browser localStorage API directly; stub an
// in-memory version so these tests can run under plain Node/vitest.
function makeLocalStorageStub() {
  let store = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
}

beforeEach(() => {
  globalThis.localStorage = makeLocalStorageStub();
});

describe('saveCharacter / listCharacters', () => {
  it('round-trips a character through storage', () => {
    const c = { ...blankCharacter(), name: 'Vesk' };
    saveCharacter(c);

    const list = listCharacters();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(c.id);
    expect(list[0].name).toBe('Vesk');
  });

  it('getCharacter returns the saved character by id, or null if missing', () => {
    const c = { ...blankCharacter(), name: 'Orin' };
    saveCharacter(c);

    expect(getCharacter(c.id).name).toBe('Orin');
    expect(getCharacter('not-a-real-id')).toBeNull();
  });
});

describe('duplicateCharacter', () => {
  it('gives the copy a new id, a "(copy)" name, and the same classLevels', () => {
    const c = {
      ...blankCharacter(),
      name: 'Alaric',
      classLevels: [{ classId: 'incanter', level: 3 }]
    };
    saveCharacter(c);

    const copy = duplicateCharacter(c.id);

    expect(copy.id).not.toBe(c.id);
    expect(copy.name).toBe('Alaric (copy)');
    expect(copy.classLevels).toEqual(c.classLevels);

    // and it's actually persisted, not just returned
    expect(listCharacters()).toHaveLength(2);
  });

  it('throws when the source id does not exist', () => {
    expect(() => duplicateCharacter('missing-id')).toThrow();
  });
});

describe('importCharacter', () => {
  it('assigns a fresh id and survives junk fields', () => {
    const junk = {
      name: 'Imported Hero',
      classLevels: [{ classId: 'armorist', level: 2 }],
      thisFieldDoesNotExistInTheSchema: 'garbage',
      nested: { also: 'garbage' }
    };

    const saved = importCharacter(junk);

    expect(saved.id).toBeTruthy();
    expect(saved.name).toBe('Imported Hero');
    expect(saved.thisFieldDoesNotExistInTheSchema).toBe('garbage');

    // normalizeCharacter (via getCharacter/listCharacters) backfills any
    // fields missing from the import, so old/foreign exports don't crash the UI.
    const normalized = getCharacter(saved.id);
    expect(normalized.abilityMods).toBeDefined();
    expect(normalized.customSpheres).toEqual([]);
  });

  it('never collides with an existing id, even if the import claims one', () => {
    const existing = { ...blankCharacter(), name: 'Original' };
    saveCharacter(existing);

    const imported = importCharacter({ ...existing, name: 'Impostor' });

    expect(imported.id).not.toBe(existing.id);
    expect(listCharacters()).toHaveLength(2);
  });

  it('throws a clear error on non-object input', () => {
    expect(() => importCharacter(null)).toThrow();
    expect(() => importCharacter('just a string')).toThrow();
    expect(() => importCharacter(42)).toThrow();
    expect(() => importCharacter([1, 2, 3])).toThrow();
  });
});

describe('deleteCharacter', () => {
  it('removes the character from storage', () => {
    const c = { ...blankCharacter(), name: 'Temp' };
    saveCharacter(c);
    expect(listCharacters()).toHaveLength(1);

    deleteCharacter(c.id);
    expect(listCharacters()).toHaveLength(0);
  });
});

describe('newCharacterId', () => {
  it('generates unique-looking ids', () => {
    expect(newCharacterId()).not.toBe(newCharacterId());
  });
});
