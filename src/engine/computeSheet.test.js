import { describe, it, expect } from 'vitest';
import { computeSheet } from './computeSheet.js';
import { blankCharacter } from './newCharacter.js';
import { abilityModifier } from './abilities.js';
import { spellPoints, sphereDC, casterLevelAtLevel } from './progression.js';

// Minimal fake class table, independent of src/data/*.json, per docs/engine.md.
const fakeClassesById = {
  caster: {
    id: 'caster',
    system: 'power',
    casterType: 'mid',
    babType: 'threeQuarter',
    goodSaves: ['will']
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

describe('computeSheet - casting mode', () => {
  it('house mode: INT drives the pool, the highest mental mod drives the DC', () => {
    const character = makeCharacter({ castingRules: 'house' });
    const sheet = computeSheet(character, opts);

    const casterLevel = casterLevelAtLevel('mid', 10); // 7, from casterProgression.json
    expect(sheet.casting.casterClassLevels).toBe(10);
    expect(sheet.casting.casterLevel).toBe(casterLevel);

    const intMod = abilityModifier(14); // +2
    const wisMod = abilityModifier(12); // +1
    expect(sheet.casting.spellPoints).toBe(spellPoints(10, intMod));
    expect(sheet.casting.sphereDC).toBe(sphereDC(casterLevel, Math.max(intMod, wisMod, 0)));
  });

  it('standard mode: the chosen casting ability drives both pool and DC', () => {
    const character = makeCharacter({ castingRules: 'standard', castingAbility: 'cha' });
    const sheet = computeSheet(character, opts);

    const casterLevel = casterLevelAtLevel('mid', 10);
    const chaMod = abilityModifier(10); // +0
    expect(sheet.casting.spellPoints).toBe(spellPoints(10, chaMod));
    expect(sheet.casting.sphereDC).toBe(sphereDC(casterLevel, chaMod));
  });

  it('house and standard pool/DC differ when the abilities differ', () => {
    const house = computeSheet(makeCharacter({ castingRules: 'house' }), opts);
    const standard = computeSheet(makeCharacter({ castingRules: 'standard', castingAbility: 'cha' }), opts);

    // INT (+2, house pool) beats CHA (+0, standard pool/DC here).
    expect(house.casting.spellPoints).toBeGreaterThan(standard.casting.spellPoints);
    expect(house.casting.sphereDC).toBeGreaterThan(standard.casting.sphereDC);
  });

  it('a character missing castingRules/castingAbility/modifiers behaves as house mode', () => {
    const character = {
      baseAbilities: { str: 10, dex: 10, con: 10, int: 14, wis: 12, cha: 10 },
      classLevels: [{ classId: 'caster', level: 10 }]
      // no castingRules, castingAbility, abilityMods, or modifiers field at all
    };
    const sheet = computeSheet(character, opts);

    expect(sheet.castingRules).toBe('house');
    expect(sheet.casting.castingAbility).toBe('int');
    const intMod = abilityModifier(14);
    expect(sheet.casting.poolAbilityMod).toBe(intMod);
    expect(sheet.casting.spellPoints).toBe(spellPoints(10, intMod));
  });
});

describe('computeSheet - modifier effects', () => {
  it('an ability.str enhancement effect changes abilities.mods.str', () => {
    const character = makeCharacter({
      modifiers: [
        {
          id: 'belt', name: 'Belt of Giant Strength', enabled: true,
          effects: [{ target: 'ability.str', type: 'enhancement', value: 4 }]
        }
      ]
    });
    const sheet = computeSheet(character, opts);

    expect(sheet.abilities.scores.str).toBe(14); // 10 base + 4 enhancement
    expect(sheet.abilities.mods.str).toBe(abilityModifier(14));
  });

  it('a casterLevel effect raises casting.casterLevel and sphereDC', () => {
    const base = computeSheet(makeCharacter(), opts);
    const boosted = computeSheet(
      makeCharacter({
        modifiers: [
          {
            id: 'trance', name: "Wizard's Trance", enabled: true,
            effects: [{ target: 'casterLevel', type: 'untyped', value: 1 }]
          }
        ]
      }),
      opts
    );

    expect(boosted.casting.casterLevel).toBe(base.casting.casterLevel + 1);
    // Base caster level (mid @ 10 = 7) is odd, so +1 crosses a half-CL
    // threshold and the DC actually goes up, not just the raw caster level.
    expect(boosted.casting.sphereDC).toBe(base.casting.sphereDC + 1);
  });

  it('a modifier source with no `enabled` key at all still contributes (enabled !== false semantics)', () => {
    const character = makeCharacter({
      modifiers: [
        // no `enabled` key - a hand-built source, per modifiers.js activeSources().
        { id: 'no-enabled-key', name: 'Ancient Buff', effects: [{ target: 'ac', type: 'untyped', value: 1 }] }
      ]
    });
    const base = computeSheet(makeCharacter(), opts);
    const sheet = computeSheet(character, opts);

    expect(sheet.acTotals.ac).toBe(base.acTotals.ac + 1);
  });

  it('disabled modifier sources are ignored', () => {
    const character = makeCharacter({
      modifiers: [
        {
          id: 'belt', name: 'Belt of Giant Strength', enabled: false,
          effects: [{ target: 'ability.str', type: 'enhancement', value: 4 }]
        },
        {
          id: 'trance', name: "Wizard's Trance", enabled: false,
          effects: [{ target: 'casterLevel', type: 'untyped', value: 1 }]
        }
      ]
    });
    const base = computeSheet(makeCharacter(), opts);
    const withDisabled = computeSheet(character, opts);

    expect(withDisabled.abilities.scores.str).toBe(base.abilities.scores.str);
    expect(withDisabled.casting.casterLevel).toBe(base.casting.casterLevel);
  });
});
