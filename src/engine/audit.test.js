import { describe, it, expect } from 'vitest';
import { computeSheet } from './computeSheet.js';
import { blankCharacter } from './newCharacter.js';
import { abilityModifier } from './abilities.js';
import { isClassSkill } from './skills.js';
import buffLibrary from '../data/buffLibrary.json';
import mightClasses from '../data/mightClasses.json';
import skillsData from '../data/skills.json';

// Data-file regression tests from the audit pass. Each covers a fix that lives
// in a JSON data file rather than engine logic, so they're grouped here rather
// than bolted onto an unrelated engine test file.

// Minimal fake class table, independent of src/data/*.json, per docs/engine.md.
const fakeClassesById = {
  fighter: {
    id: 'fighter',
    system: 'champion',
    casterType: 'none',
    babType: 'full',
    goodSaves: ['fort'],
    skillsPerLevel: 2,
    classSkills: ['Acrobatics', 'Climb']
  }
};
const opts = { classesById: fakeClassesById };

describe('data fix - Enlarge Person no longer double-counts the size shift', () => {
  const enlargeBuff = buffLibrary.find((b) => b.id === 'enlarge-person');

  it('only carries ability.str/ability.dex effects - no attack/ac effects (those belong to the Size field)', () => {
    expect(enlargeBuff).toBeTruthy();
    const targets = enlargeBuff.effects.map((e) => e.target).sort();
    expect(targets).toEqual(['ability.dex', 'ability.str']);
  });

  function makeFighter(overrides) {
    return {
      ...blankCharacter(),
      baseAbilities: { str: 16, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 4 }],
      weapons: [
        { id: 'w1', name: 'Longsword', attackAbility: 'str', damageDice: '1d8', damageAbility: 'str', damageMult: 1 }
      ],
      ...overrides
    };
  }

  it('attack: the size penalty is applied exactly once, cancelled by the +1 STR mod bump (net unchanged)', () => {
    const medium = computeSheet(makeFighter({ size: 'medium' }), opts);
    const largeWithBuff = computeSheet(makeFighter({
      size: 'large',
      modifiers: [{
        id: 'enlarge', name: enlargeBuff.name, enabled: true,
        effects: enlargeBuff.effects.map((e) => ({ ...e }))
      }]
    }), opts);

    const strModBefore = abilityModifier(16); // +3
    const strModAfterSize = abilityModifier(16 + 2); // +4 - enlarge's own +2 size bonus to Str
    expect(strModAfterSize - strModBefore).toBe(1);

    // If the buff still carried its own -1 attack effect (the pre-fix bug),
    // largeWithBuff's to-hit would be one lower than medium's here. It isn't:
    // the -1 size penalty (via `size: 'large'`) is exactly offset by the +1
    // Str mod bump, so the two are equal.
    expect(largeWithBuff.weapons[0].attacks).toEqual(medium.weapons[0].attacks);
  });

  it('AC: only the size field applies its own -1, not a duplicate from the buff', () => {
    const medium = computeSheet(makeFighter({ size: 'medium' }), opts);
    const largeWithBuff = computeSheet(makeFighter({
      size: 'large',
      modifiers: [{
        id: 'enlarge', name: enlargeBuff.name, enabled: true,
        effects: enlargeBuff.effects.map((e) => ({ ...e }))
      }]
    }), opts);

    // Dex drops 14 -> 12 (enlarge's -2 size effect): mod +2 -> +1 (-1).
    // Size itself contributes another -1 to AC. Total expected shift: -2.
    // A lingering `ac: -1` effect on the buff (the pre-fix bug) would make
    // this -3 instead.
    expect(largeWithBuff.acTotals.ac).toBe(medium.acTotals.ac - 2);
  });
});

describe('data fix - Savant class-skill list uses explicit Knowledge subskills', () => {
  const savant = mightClasses.find((c) => c.id === 'savant');
  const knowledgeNature = skillsData.find((s) => s.id === 'knowledge-nature');
  const knowledgeArcana = skillsData.find((s) => s.id === 'knowledge-arcana');

  it('exists and no longer uses the unsupported "Knowledge (all except arcana)" string', () => {
    expect(savant).toBeTruthy();
    expect(savant.classSkills).not.toContain('Knowledge (all except arcana)');
  });

  it('grants knowledge-nature as a class skill but not knowledge-arcana', () => {
    expect(isClassSkill(knowledgeNature, savant.classSkills)).toBe(true);
    expect(isClassSkill(knowledgeArcana, savant.classSkills)).toBe(false);
  });

  it('grants every non-arcana Knowledge subskill as a class skill', () => {
    const nonArcanaKnowledge = skillsData.filter((s) => s.family === 'Knowledge' && s.id !== 'knowledge-arcana');
    expect(nonArcanaKnowledge.length).toBe(9);
    for (const k of nonArcanaKnowledge) {
      expect(isClassSkill(k, savant.classSkills)).toBe(true);
    }
  });
});
