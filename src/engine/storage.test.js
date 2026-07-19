import { describe, it, expect, beforeEach } from 'vitest';
import {
  listCharacters,
  getCharacter,
  saveCharacter,
  deleteCharacter,
  duplicateCharacter,
  importCharacter,
  newCharacterId,
  lastWriteOk,
  subscribeToWriteFailures
} from './storage.js';
import { blankCharacter } from './newCharacter.js';
import { computeSheet } from './computeSheet.js';

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

describe('normalizeCharacter - wrong-typed fields coerce back to blank defaults', () => {
  it('a stored string for an array field, and an array for an object field, become their blank defaults on read', () => {
    const junk = {
      name: 'Corrupted',
      classLevels: 'oops',
      skills: [1, 2],
      baseAbilities: null
    };
    const saved = importCharacter(junk);

    const viaGetCharacter = getCharacter(saved.id);
    const viaListCharacters = listCharacters().find((c) => c.id === saved.id);

    for (const normalized of [viaGetCharacter, viaListCharacters]) {
      expect(Array.isArray(normalized.classLevels)).toBe(true);
      expect(normalized.classLevels).toEqual(blankCharacter().classLevels);
      expect(typeof normalized.skills).toBe('object');
      expect(Array.isArray(normalized.skills)).toBe(false);
      expect(normalized.skills).toEqual({});
      expect(normalized.baseAbilities).toEqual(blankCharacter().baseAbilities);
    }

    // computeSheet must not throw on the normalized, corrected result.
    expect(() => computeSheet(viaGetCharacter)).not.toThrow();
  });

  it('coerces every array-default field back to an array, generically, when given the wrong type', () => {
    const arrayFields = [
      'racialTraits', 'customSpheres', 'customCombatSpheres', 'customSkillSpheres',
      'customEquipment', 'classFeatures', 'feats', 'modifiers', 'conditions',
      'trackers', 'weapons', 'customSkills'
    ];
    const junk = { name: 'Junk' };
    for (const field of arrayFields) junk[field] = 'not-an-array';

    const saved = importCharacter(junk);
    const normalized = getCharacter(saved.id);

    for (const field of arrayFields) {
      expect(Array.isArray(normalized[field])).toBe(true);
      expect(normalized[field]).toEqual([]);
    }
  });

  it('coerces every object-default field back to a plain object when given null or an array', () => {
    const saved = importCharacter({
      name: 'Junk2',
      abilityMods: null,
      defense: [1, 2, 3]
    });
    const normalized = getCharacter(saved.id);

    expect(normalized.abilityMods).toEqual(blankCharacter().abilityMods);
    expect(normalized.defense).toEqual(blankCharacter().defense);
  });
});

// Stage 6 hardening sweep (audit #15): a *partially* old/hand-edited nested
// object shouldn't lose its valid sub-keys just because it's missing others -
// deep-merge one level for defense/baseAbilities/abilityMods.
describe('normalizeCharacter - deep-merges partially-present nested objects (audit #15)', () => {
  it('a defense object missing every key but armorBonus keeps armorBonus and backfills the rest', () => {
    const saved = importCharacter({
      name: 'Partial Defense',
      defense: { armorBonus: 3 }
    });
    const normalized = getCharacter(saved.id);

    expect(normalized.defense).toEqual({ ...blankCharacter().defense, armorBonus: 3 });
    // and computeSheet can consume the result without throwing
    expect(() => computeSheet(normalized)).not.toThrow();
  });

  it('a wrong-typed sub-key within an otherwise-valid defense object falls back to its own default', () => {
    const saved = importCharacter({
      name: 'Bad Subkey',
      defense: { armorBonus: 3, acp: 'oops', maxDex: 2 }
    });
    const normalized = getCharacter(saved.id);

    expect(normalized.defense.armorBonus).toBe(3);
    expect(normalized.defense.maxDex).toBe(2);
    expect(normalized.defense.acp).toBe(0); // blank default, since the stored value was a string
  });

  it('a baseAbilities object missing some scores keeps the present ones and defaults the rest to 10', () => {
    const saved = importCharacter({
      name: 'Partial Abilities',
      baseAbilities: { str: 16, dex: 14 }
    });
    const normalized = getCharacter(saved.id);

    expect(normalized.baseAbilities).toEqual({ str: 16, dex: 14, con: 10, int: 10, wis: 10, cha: 10 });
  });

  it('drops non-object per-skill entries but keeps valid ones, and computeSheet does not throw', () => {
    const saved = importCharacter({
      name: 'Bad Skills',
      skills: { acrobatics: 'oops', bluff: { ranks: 2, misc: 1 } }
    });
    const normalized = getCharacter(saved.id);

    expect(normalized.skills.acrobatics).toBeUndefined();
    expect(normalized.skills.bluff).toEqual({ ranks: 2, misc: 1 });
    expect(() => computeSheet(normalized)).not.toThrow();
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

// Simulate a full disk: setItem throws the same DOMException-shaped error the
// browser raises when the localStorage quota is exceeded.
function throwQuotaExceeded() {
  const err = new Error('The quota has been exceeded.');
  err.name = 'QuotaExceededError';
  throw err;
}

describe('write-failure observability', () => {
  it('saveCharacter still returns the character, but the failure is observable', () => {
    globalThis.localStorage.setItem = throwQuotaExceeded;

    const c = { ...blankCharacter(), name: 'Full Disk' };
    const saved = saveCharacter(c);

    // return shape is unchanged - callers/tests still get the saved character
    expect(saved.id).toBe(c.id);
    expect(saved.name).toBe('Full Disk');
    // ...but the silent failure is now observable
    expect(lastWriteOk()).toBe(false);
  });

  it('notifies subscribers on failure and clears (ok=true) once a later write succeeds', () => {
    const events = [];
    const unsub = subscribeToWriteFailures((ok) => events.push(ok));

    // first write fails
    globalThis.localStorage.setItem = throwQuotaExceeded;
    saveCharacter({ ...blankCharacter(), name: 'A' });
    expect(lastWriteOk()).toBe(false);
    expect(events.at(-1)).toBe(false);

    // stub stops throwing (e.g. user deleted something to free space)
    globalThis.localStorage = makeLocalStorageStub();
    saveCharacter({ ...blankCharacter(), name: 'B' });
    expect(lastWriteOk()).toBe(true);
    expect(events.at(-1)).toBe(true);

    unsub();
  });
});
