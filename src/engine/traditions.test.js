import { describe, it, expect } from 'vitest';
import { traditionSpellPoints, spellPoints } from './progression.js';
import { computeSheet } from './computeSheet.js';
import { blankCharacter } from './newCharacter.js';
import { abilityModifier } from './abilities.js';

// ---- Pure table: traditionSpellPoints(unexchangedDrawbacks, casterClassLevels) ----
// Closed forms (RAW spheresofpower.wikidot.com/casting-traditions):
//   1 → 1 + floor(L/6) | 2 → 1 + floor(L/3) | 3 → ceil(L/2)
//   4 → 1 + floor(2L/3) | 5 → L | >5 → clamp to L

describe('traditionSpellPoints - table rows at multiple levels', () => {
  it('row 1 (+1, +1 per 6 levels) = 1 + floor(L/6)', () => {
    expect(traditionSpellPoints(1, 1)).toBe(1);
    expect(traditionSpellPoints(1, 5)).toBe(1);
    expect(traditionSpellPoints(1, 6)).toBe(2);
    expect(traditionSpellPoints(1, 11)).toBe(2);
    expect(traditionSpellPoints(1, 12)).toBe(3);
    expect(traditionSpellPoints(1, 20)).toBe(4);
  });

  it('row 2 (+1, +1 per 3 levels) = 1 + floor(L/3)', () => {
    expect(traditionSpellPoints(2, 1)).toBe(1);
    expect(traditionSpellPoints(2, 2)).toBe(1);
    expect(traditionSpellPoints(2, 3)).toBe(2);
    expect(traditionSpellPoints(2, 6)).toBe(3);
    expect(traditionSpellPoints(2, 9)).toBe(4);
    expect(traditionSpellPoints(2, 20)).toBe(7);
  });

  it('row 3 (+1 per odd level 1,3,5,…) = ceil(L/2)', () => {
    expect(traditionSpellPoints(3, 1)).toBe(1);
    expect(traditionSpellPoints(3, 2)).toBe(1);
    expect(traditionSpellPoints(3, 3)).toBe(2);
    expect(traditionSpellPoints(3, 4)).toBe(2);
    expect(traditionSpellPoints(3, 5)).toBe(3);
    expect(traditionSpellPoints(3, 20)).toBe(10);
  });

  it('row 4 (+1, +1 per 1.5 levels) = 1 + floor(2L/3), gains at 2,3,5,6,8,9,…', () => {
    // Explicit per-level values L=1..12 verified against the RAW gain-level list.
    const expected = [1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 9];
    for (let L = 1; L <= 12; L++) {
      expect(traditionSpellPoints(4, L)).toBe(expected[L - 1]);
    }
    // The increments (over the base +1 at L1) land at exactly these levels.
    const gainLevels = [];
    let prev = traditionSpellPoints(4, 1);
    for (let L = 2; L <= 12; L++) {
      const v = traditionSpellPoints(4, L);
      if (v > prev) gainLevels.push(L);
      prev = v;
    }
    expect(gainLevels).toEqual([2, 3, 5, 6, 8, 9, 11, 12]);
  });

  it('row 5 (+1 per level) = L', () => {
    expect(traditionSpellPoints(5, 1)).toBe(1);
    expect(traditionSpellPoints(5, 10)).toBe(10);
    expect(traditionSpellPoints(5, 20)).toBe(20);
  });

  it('more than 5 unexchanged drawbacks clamps to the 5-drawback rate (L)', () => {
    expect(traditionSpellPoints(6, 10)).toBe(10);
    expect(traditionSpellPoints(9, 7)).toBe(7);
    expect(traditionSpellPoints(6, 10)).toBe(traditionSpellPoints(5, 10));
  });

  it('zero cases: no drawbacks or no caster-class levels ⇒ 0', () => {
    expect(traditionSpellPoints(0, 10)).toBe(0);
    expect(traditionSpellPoints(3, 0)).toBe(0);
    expect(traditionSpellPoints(0, 0)).toBe(0);
    // defensive: missing/undefined args
    expect(traditionSpellPoints(undefined, undefined)).toBe(0);
    expect(traditionSpellPoints(2)).toBe(0);
  });
});

// ---- computeSheet integration ----

const fakeClassesById = {
  caster: {
    id: 'caster',
    system: 'power',
    casterType: 'mid',
    babType: 'threeQuarter',
    goodSaves: ['will']
  },
  fighter: {
    id: 'fighter',
    system: 'might',
    casterType: 'none',
    babType: 'full',
    goodSaves: ['fort']
  }
};
const opts = { classesById: fakeClassesById };

function makeCharacter(overrides = {}) {
  return {
    ...blankCharacter(),
    baseAbilities: { str: 10, dex: 10, con: 10, int: 14, wis: 12, cha: 10 },
    classLevels: [{ classId: 'caster', level: 10 }],
    ...overrides
  };
}

function drawbacks(n, countsAsTwo = false) {
  return Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    name: `Drawback ${i}`,
    description: '',
    countsAsTwo
  }));
}

function boons(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `b${i}`, name: `Boon ${i}`, description: '' }));
}

describe('computeSheet - casting tradition', () => {
  it('drawbackPoints sums countsAsTwo drawbacks as 2 each', () => {
    const character = makeCharacter({
      castingTradition: {
        name: 'Test',
        drawbacks: [...drawbacks(2), ...drawbacks(1, true)], // 2 + 2 = 4 points
        boons: [],
        bonusSpellPointsMisc: 0
      }
    });
    const t = computeSheet(character, opts).casting.tradition;
    expect(t.drawbackPoints).toBe(4);
    expect(t.unexchanged).toBe(4);
    expect(t.boonCount).toBe(0);
    expect(t.boonDeficit).toBe(false);
  });

  it('boon exchange: 2 drawbacks buy 1 boon; the rest grant bonus spell points', () => {
    const character = makeCharacter({
      castingTradition: { name: 'T', drawbacks: drawbacks(5), boons: boons(1) }
    });
    const t = computeSheet(character, opts).casting.tradition;
    // 5 drawback points − 2 (one boon) = 3 unexchanged.
    expect(t.drawbackPoints).toBe(5);
    expect(t.boonCount).toBe(1);
    expect(t.unexchanged).toBe(3);
    expect(t.bonusSpellPoints).toBe(traditionSpellPoints(3, 10)); // ceil(10/2) = 5
  });

  it('boonDeficit flags buying more boons than drawbacks afford; unexchanged floors at 0', () => {
    const character = makeCharacter({
      castingTradition: { name: 'T', drawbacks: drawbacks(1), boons: boons(2) } // cost 4 > 1
    });
    const t = computeSheet(character, opts).casting.tradition;
    expect(t.drawbackPoints).toBe(1);
    expect(t.boonCount).toBe(2);
    expect(t.unexchanged).toBe(0);
    expect(t.boonDeficit).toBe(true);
    expect(t.bonusSpellPoints).toBe(0);
  });

  it('bonusSpellPointsMisc adjusts the tradition bonus (and the pool)', () => {
    const character = makeCharacter({
      castingTradition: { name: 'T', drawbacks: drawbacks(5), boons: [], bonusSpellPointsMisc: 3 }
    });
    const sheet = computeSheet(character, opts);
    const t = sheet.casting.tradition;
    expect(t.unexchanged).toBe(5);
    expect(t.bonusSpellPoints).toBe(traditionSpellPoints(5, 10) + 3); // 10 + 3 = 13
    // misc alone (0 unexchanged) still applies when there are caster levels.
    const miscOnly = computeSheet(
      makeCharacter({ castingTradition: { drawbacks: [], boons: [], bonusSpellPointsMisc: 2 } }),
      opts
    ).casting.tradition;
    expect(miscOnly.unexchanged).toBe(0);
    expect(miscOnly.bonusSpellPoints).toBe(2);
  });

  it('adds the tradition bonus to the pool in HOUSE mode (only, when caster levels > 0)', () => {
    const character = makeCharacter({
      castingRules: 'house',
      castingTradition: { name: 'T', drawbacks: drawbacks(5), boons: [] }
    });
    const sheet = computeSheet(character, opts);
    const intMod = abilityModifier(14); // +2
    const bonus = traditionSpellPoints(5, 10); // 10
    expect(sheet.casting.tradition.bonusSpellPoints).toBe(bonus);
    expect(sheet.casting.spellPoints).toBe(spellPoints(10, intMod) + bonus);
  });

  it('adds the tradition bonus to the pool in STANDARD mode too', () => {
    const character = makeCharacter({
      castingRules: 'standard',
      castingAbility: 'cha',
      castingTradition: { name: 'T', drawbacks: drawbacks(5), boons: [] }
    });
    const sheet = computeSheet(character, opts);
    const chaMod = abilityModifier(10); // +0
    const bonus = traditionSpellPoints(5, 10); // 10
    expect(sheet.casting.spellPoints).toBe(spellPoints(10, chaMod) + bonus);
  });

  it('no caster-class levels ⇒ no bonus and no pool, even with drawbacks', () => {
    const character = makeCharacter({
      classLevels: [{ classId: 'fighter', level: 10 }], // casterType none
      castingTradition: { name: 'T', drawbacks: drawbacks(5), boons: [], bonusSpellPointsMisc: 3 }
    });
    const sheet = computeSheet(character, opts);
    expect(sheet.casting.casterClassLevels).toBe(0);
    expect(sheet.casting.spellPoints).toBe(0);
    const t = sheet.casting.tradition;
    expect(t.drawbackPoints).toBe(5); // still surfaced for the UI
    expect(t.bonusSpellPoints).toBe(0); // but no bonus without a pool
  });

  it('old save with no castingTradition ⇒ all zeros, pool unchanged (regression)', () => {
    const withTradition = makeCharacter();
    const withoutField = { ...withTradition };
    delete withoutField.castingTradition;

    const a = computeSheet(withTradition, opts); // blankCharacter default = empty tradition
    const b = computeSheet(withoutField, opts); // field entirely absent

    const intMod = abilityModifier(14);
    expect(a.casting.spellPoints).toBe(spellPoints(10, intMod));
    expect(b.casting.spellPoints).toBe(spellPoints(10, intMod));
    expect(b.casting.tradition).toEqual({
      name: '',
      drawbackPoints: 0,
      boonCount: 0,
      unexchanged: 0,
      bonusSpellPoints: 0,
      boonDeficit: false
    });
  });
});
