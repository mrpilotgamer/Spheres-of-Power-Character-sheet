import { describe, it, expect } from 'vitest';
import { computeSheet } from './computeSheet.js';
import { blankCharacter } from './newCharacter.js';
import { talentBudgetBase } from './progression.js';

// Fake class table, independent of src/data/*.json (per docs/engine.md).
const fakeClassesById = {
  midCaster: { id: 'midCaster', system: 'power', casterType: 'mid', babType: 'threeQuarter', goodSaves: ['will'] },
  expertMartial: { id: 'expertMartial', system: 'might', casterType: 'none', babType: 'full', goodSaves: ['fort'], talentProgression: 'full' }
};
const opts = { classesById: fakeClassesById };

const sphereWith = (n) => ({
  id: 's' + n,
  name: 'Sphere ' + n,
  talents: Array.from({ length: n }, (_, i) => ({ id: `t${n}-${i}`, name: 'Talent', description: '' }))
});

function makeCharacter(overrides = {}) {
  return {
    ...blankCharacter(),
    classLevels: [{ classId: 'midCaster', level: 10 }],
    ...overrides
  };
}

describe('computeSheet - talent budget', () => {
  it('spent sums talents across the three sphere arrays', () => {
    const character = makeCharacter({
      customSpheres: [sphereWith(2)], // 2 magic talents
      customCombatSpheres: [sphereWith(3)], // 3 combat talents
      customSkillSpheres: [sphereWith(1)] // 1 skill talent
    });
    const sheet = computeSheet(character, opts);
    expect(sheet.talents.spent).toBe(6);
    expect(sheet.talents.bySystem).toEqual({ magic: 2, combat: 3, skill: 1 });
  });

  it('does NOT count talents under customEquipment (SphereBuilder is reused there)', () => {
    const character = makeCharacter({
      customSpheres: [sphereWith(2)],
      customEquipment: [sphereWith(5)] // must be ignored
    });
    const sheet = computeSheet(character, opts);
    expect(sheet.talents.spent).toBe(2);
  });

  it('budget is the class auto-base plus the manual misc field', () => {
    const character = makeCharacter({ talentsKnownMisc: 4 });
    const sheet = computeSheet(character, opts);
    const autoBase = talentBudgetBase(character.classLevels, fakeClassesById); // mid@10 = 7
    expect(sheet.talents.autoBase).toBe(autoBase);
    expect(sheet.talents.misc).toBe(4);
    expect(sheet.talents.budget).toBe(autoBase + 4);
  });

  it('auto-base sums across classes (multiclass talents stack)', () => {
    const character = makeCharacter({
      classLevels: [
        { classId: 'midCaster', level: 10 }, // threeQuarter@10 = 7
        { classId: 'expertMartial', level: 5 } // full@5 = 5
      ]
    });
    const sheet = computeSheet(character, opts);
    expect(sheet.talents.autoBase).toBe(12);
  });

  it('an old save without talentsKnownMisc defaults misc to 0', () => {
    const character = makeCharacter();
    delete character.talentsKnownMisc;
    const sheet = computeSheet(character, opts);
    expect(sheet.talents.misc).toBe(0);
    expect(sheet.talents.budget).toBe(sheet.talents.autoBase);
  });

  it('missing sphere arrays (old save) yield 0 spent, not a crash', () => {
    const character = makeCharacter();
    delete character.customSpheres;
    delete character.customCombatSpheres;
    delete character.customSkillSpheres;
    const sheet = computeSheet(character, opts);
    expect(sheet.talents.spent).toBe(0);
  });
});
