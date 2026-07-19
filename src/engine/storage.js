import { blankCharacter } from './newCharacter.js';

const KEY = 'sop-characters-v1';

// Nested object fields with a fixed, known sub-key shape (unlike `skills`,
// which has arbitrary skill-id keys) - eligible for the one-level deep merge
// below so a partially-old/hand-edited save keeps its valid sub-keys instead
// of losing them to a whole-object fallback.
const DEEP_MERGE_KEYS = new Set(['defense', 'baseAbilities', 'abilityMods']);

// One level of a nested object: keeps `stored`'s value for a sub-key only
// when it's the same "kind" as the blank default (so garbage sub-values still
// fall back), otherwise (including missing keys) uses the blank default.
// `null` blank defaults (e.g. defense.maxDex) accept a number or null.
function mergeNestedObject(blankVal, storedVal) {
  const result = { ...blankVal };
  for (const subKey of Object.keys(blankVal)) {
    const defaultSub = blankVal[subKey];
    const storedSub = storedVal[subKey];
    if (defaultSub === null) {
      if (storedSub === null || typeof storedSub === 'number') result[subKey] = storedSub;
    } else if (typeof storedSub === typeof defaultSub) {
      result[subKey] = storedSub;
    }
  }
  return result;
}

// Fill in fields added to the schema after a character was saved, so
// older stored characters don't feed undefined into controlled inputs.
//
// Also guards against wrong-typed fields (corrupt/foreign imports, hand-edited
// JSON): for every key in blankCharacter(), if the blank default is an Array
// but the stored value isn't, or the blank default is a plain object but the
// stored value isn't a plain object (null/array/primitive both disqualify),
// fall back to the blank default rather than passing the bad value through to
// computeSheet()/JSX. Driven generically off blankCharacter()'s shape so new
// schema fields are covered automatically - no hand-maintained field list.
//
// For the fixed-shape nested objects in DEEP_MERGE_KEYS, a *partially* correct
// stored object (e.g. `defense: { armorBonus: 3 }` missing every other key)
// is deep-merged one level instead of being kept as-is - missing/wrong-typed
// sub-keys get their blank default, valid ones are preserved.
function normalizeCharacter(stored) {
  const blank = blankCharacter();
  const merged = { ...blank, ...stored, id: stored.id ?? blank.id };
  for (const key of Object.keys(blank)) {
    if (key === 'id') continue;
    const blankVal = blank[key];
    if (Array.isArray(blankVal)) {
      if (!Array.isArray(merged[key])) merged[key] = blankVal;
    } else if (blankVal !== null && typeof blankVal === 'object') {
      const val = merged[key];
      const isPlainObject = val !== null && typeof val === 'object' && !Array.isArray(val);
      if (!isPlainObject) {
        merged[key] = blankVal;
      } else if (DEEP_MERGE_KEYS.has(key)) {
        merged[key] = mergeNestedObject(blankVal, val);
      }
    }
  }
  // `skills`: arbitrary skill-id keys (not a fixed shape, so not deep-merged
  // above), but each per-skill value must itself be a plain object - drop any
  // that aren't (e.g. `{ acrobatics: 'oops' }`) rather than passing a string
  // through to skillTotal()/JSX.
  if (merged.skills && typeof merged.skills === 'object' && !Array.isArray(merged.skills)) {
    const cleanSkills = {};
    for (const [skillId, state] of Object.entries(merged.skills)) {
      if (state !== null && typeof state === 'object' && !Array.isArray(state)) {
        cleanSkills[skillId] = state;
      }
    }
    merged.skills = cleanSkills;
  }
  return merged;
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

// --- Write-failure observability -------------------------------------------
// writeAll() still returns a boolean and never throws, so the return shapes of
// the mutating functions are UNCHANGED: saveCharacter/duplicateCharacter/
// importCharacter still return the saved character object, deleteCharacter
// still returns nothing. The *outcome* of the most recent write is recorded
// separately so the UI can surface silent quota failures:
//   - lastWriteOk() -> boolean: did the most recent write succeed?
//   - subscribeToWriteFailures(cb) -> unsubscribe fn: cb(ok) is called after
//     every write with the boolean success flag. It fires on both failure
//     (false) and later recovery (true), so a banner can be shown on failure
//     and cleared once a subsequent write (e.g. after a delete frees space)
//     succeeds.
let lastWriteSucceeded = true;
const writeListeners = new Set();

export function lastWriteOk() {
  return lastWriteSucceeded;
}

export function subscribeToWriteFailures(cb) {
  writeListeners.add(cb);
  return () => writeListeners.delete(cb);
}

function writeAll(all) {
  let ok;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    ok = true;
  } catch (e) {
    console.error('Failed to save characters to storage', e);
    ok = false;
  }
  lastWriteSucceeded = ok;
  for (const cb of writeListeners) cb(ok);
  return ok;
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
