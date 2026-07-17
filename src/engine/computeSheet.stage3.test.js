import { describe, it, expect } from 'vitest';
import { computeSheet } from './computeSheet.js';
import { blankCharacter } from './newCharacter.js';
import { collectCombined } from './modifiers.js';
import { abilityModifier } from './abilities.js';
import { babAtLevel } from './progression.js';

// Minimal fake class table, independent of src/data/*.json, per docs/engine.md
// and the pattern in computeSheet.stage2.test.js.
const fakeClassesById = {
  fighter: {
    id: 'fighter',
    system: 'champion',
    casterType: 'none',
    babType: 'full',
    goodSaves: ['fort'],
    skillsPerLevel: 2,
    classSkills: ['Acrobatics', 'Climb', 'Knowledge (all)']
  },
  highcaster: {
    id: 'highcaster',
    system: 'power',
    casterType: 'high',
    babType: 'half',
    goodSaves: ['will'],
    skillsPerLevel: 2,
    classSkills: []
  }
};
const opts = { classesById: fakeClassesById };

function makeCharacter(overrides = {}) {
  return {
    ...blankCharacter(),
    baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    classLevels: [{ classId: 'fighter', level: 4 }],
    ...overrides
  };
}

describe('collectCombined - pooled stacking across targets', () => {
  it('sums untyped bonuses on skill.all and skill.acrobatics (both stack with themselves)', () => {
    const sources = [
      { id: 'a', enabled: true, effects: [{ target: 'skill.all', type: 'untyped', value: 2 }] },
      { id: 'b', enabled: true, effects: [{ target: 'skill.acrobatics', type: 'untyped', value: 1 }] }
    ];
    expect(collectCombined(sources, ['skill.all', 'skill.acrobatics'])).toBe(3);
  });

  it('pools a competence bonus on skill.all and a competence bonus on skill.acrobatics into one stack (only the higher counts)', () => {
    const sources = [
      { id: 'a', enabled: true, effects: [{ target: 'skill.all', type: 'competence', value: 2 }] },
      { id: 'b', enabled: true, effects: [{ target: 'skill.acrobatics', type: 'competence', value: 3 }] }
    ];
    expect(collectCombined(sources, ['skill.all', 'skill.acrobatics'])).toBe(3);
  });

  it('penalties from both keys always stack, regardless of type', () => {
    const sources = [
      { id: 'a', enabled: true, effects: [{ target: 'skill.all', type: 'competence', value: -2 }] },
      { id: 'b', enabled: true, effects: [{ target: 'skill.acrobatics', type: 'competence', value: -3 }] }
    ];
    expect(collectCombined(sources, ['skill.all', 'skill.acrobatics'])).toBe(-5);
  });
});

describe('conditions - shaken', () => {
  it('drops every skill total by 2, saves by 2, and weapon to-hit by 2', () => {
    const base = makeCharacter({
      skills: { bluff: { ranks: 2, misc: 0 } },
      weapons: [{ id: 'w1', name: 'Sword', attackAbility: 'str', damageDice: '1d8', damageAbility: 'str', damageMult: 1 }]
    });
    const shaken = { ...base, conditions: ['shaken'] };

    const baseSheet = computeSheet(base, opts);
    const shakenSheet = computeSheet(shaken, opts);

    const baseBluff = baseSheet.skills.find((s) => s.id === 'bluff');
    const shakenBluff = shakenSheet.skills.find((s) => s.id === 'bluff');
    expect(shakenBluff.total).toBe(baseBluff.total - 2);

    // Every skill row, not just bluff, since shaken targets skill.all.
    for (const skill of shakenSheet.skills) {
      const baseSkill = baseSheet.skills.find((s) => s.id === skill.id);
      expect(skill.total).toBe(baseSkill.total - 2);
    }

    expect(shakenSheet.saves.fort).toBe(baseSheet.saves.fort - 2);
    expect(shakenSheet.saves.ref).toBe(baseSheet.saves.ref - 2);
    expect(shakenSheet.saves.will).toBe(baseSheet.saves.will - 2);

    expect(shakenSheet.weapons[0].attacks).toEqual(baseSheet.weapons[0].attacks.map((a) => a - 2));
  });
});

describe('conditions - fatigued', () => {
  it('lowers str/dex mods, and downstream CMB and AC dex', () => {
    const base = makeCharacter();
    const fatigued = { ...base, conditions: ['fatigued'] };

    const baseSheet = computeSheet(base, opts);
    const fatiguedSheet = computeSheet(fatigued, opts);

    expect(baseSheet.abilities.mods.str).toBe(0);
    expect(baseSheet.abilities.mods.dex).toBe(0);
    expect(fatiguedSheet.abilities.mods.str).toBe(-1); // score 10 - 2 = 8 -> mod -1
    expect(fatiguedSheet.abilities.mods.dex).toBe(-1);

    const bab = babAtLevel('full', 4);
    expect(baseSheet.cmb).toBe(bab + 0);
    expect(fatiguedSheet.cmb).toBe(bab - 1); // str mod dropped by 1

    expect(fatiguedSheet.acTotals.ac).toBe(baseSheet.acTotals.ac - 1); // dex mod dropped by 1
  });
});

describe('conditions - stacking, unknown ids, and old saves', () => {
  it('shaken + sickened stack their untyped penalties (skill.all, attack, saves all -4; damage only -2 from sickened)', () => {
    const base = makeCharacter({
      skills: { bluff: { ranks: 2, misc: 0 } },
      weapons: [{ id: 'w1', name: 'Sword', attackAbility: 'str', damageDice: '1d8', damageAbility: 'str', damageMult: 1 }]
    });
    const stacked = { ...base, conditions: ['shaken', 'sickened'] };

    const baseSheet = computeSheet(base, opts);
    const stackedSheet = computeSheet(stacked, opts);

    const baseBluff = baseSheet.skills.find((s) => s.id === 'bluff');
    const stackedBluff = stackedSheet.skills.find((s) => s.id === 'bluff');
    expect(stackedBluff.total).toBe(baseBluff.total - 4);

    expect(stackedSheet.saves.fort).toBe(baseSheet.saves.fort - 4);
    expect(stackedSheet.saves.ref).toBe(baseSheet.saves.ref - 4);
    expect(stackedSheet.saves.will).toBe(baseSheet.saves.will - 4);

    expect(stackedSheet.weapons[0].attacks).toEqual(baseSheet.weapons[0].attacks.map((a) => a - 4));
    // Only sickened carries a damage penalty (-2); shaken has none.
    expect(stackedSheet.damageBonus).toBe(baseSheet.damageBonus - 2);
  });

  it('an unknown condition id is silently ignored', () => {
    const base = makeCharacter({ skills: { bluff: { ranks: 2, misc: 0 } } });
    const withBogus = { ...base, conditions: ['not-real'] };

    const baseSheet = computeSheet(base, opts);
    const bogusSheet = computeSheet(withBogus, opts);

    expect(bogusSheet.saves).toEqual(baseSheet.saves);
    expect(bogusSheet.acTotals).toEqual(baseSheet.acTotals);
    expect(bogusSheet.skills.find((s) => s.id === 'bluff').total)
      .toBe(baseSheet.skills.find((s) => s.id === 'bluff').total);
  });

  it('conditions apply even when character.modifiers is undefined (old save)', () => {
    const oldSaveNoConditions = {
      baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 4 }]
      // no `modifiers` field at all, mimicking a pre-Stage-1 save.
    };
    const oldSaveShaken = { ...oldSaveNoConditions, conditions: ['shaken'] };

    let baseSheet, shakenSheet;
    expect(() => { baseSheet = computeSheet(oldSaveNoConditions, opts); }).not.toThrow();
    expect(() => { shakenSheet = computeSheet(oldSaveShaken, opts); }).not.toThrow();

    expect(shakenSheet.saves.fort).toBe(baseSheet.saves.fort - 2);
    expect(shakenSheet.saves.will).toBe(baseSheet.saves.will - 2);
  });
});

describe('play state - hp', () => {
  it('a brand-new blankCharacter has hpMax 0 and explicit hpCurrent 0, so both stay 0', () => {
    const sheet = computeSheet(blankCharacter(), opts);
    expect(sheet.play.hp.max).toBe(0);
    expect(sheet.play.hp.current).toBe(0); // explicit 0, not defaulted to max
  });

  it('an old save with hpCurrent undefined and hpMax 20 starts at full (current = max)', () => {
    const character = {
      baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 1 }],
      hpMax: 20
      // hpCurrent intentionally omitted
    };
    const sheet = computeSheet(character, opts);
    expect(sheet.play.hp.current).toBe(20);
  });

  it('explicit hpCurrent 0 with hpMax 20 stays 0 (a downed character)', () => {
    const character = {
      baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 1 }],
      hpMax: 20,
      hpCurrent: 0
    };
    const sheet = computeSheet(character, opts);
    expect(sheet.play.hp.current).toBe(0);
  });

  it('hpCurrent null with hpMax 20 is treated as missing -> current = max (20)', () => {
    const character = {
      baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 1 }],
      hpMax: 20,
      hpCurrent: null
    };
    const sheet = computeSheet(character, opts);
    expect(sheet.play.hp.current).toBe(20);
  });
});

describe('play state - spell points', () => {
  it('remaining = max - spent, floored at 0 when spent exceeds max', () => {
    const character = makeCharacter({
      classLevels: [{ classId: 'highcaster', level: 5 }],
      spellPointsSpent: 10
    });
    const sheet = computeSheet(character, opts);

    expect(sheet.casting.spellPoints).toBe(5); // 5 caster levels + int mod 0, min 1
    expect(sheet.play.spellPoints.max).toBe(5);
    expect(sheet.play.spellPoints.spent).toBe(10);
    expect(sheet.play.spellPoints.remaining).toBe(0); // floored, not negative
  });

  it('remaining is max - spent when spent is within budget', () => {
    const character = makeCharacter({
      classLevels: [{ classId: 'highcaster', level: 5 }],
      spellPointsSpent: 2
    });
    const sheet = computeSheet(character, opts);
    expect(sheet.play.spellPoints.remaining).toBe(3);
  });
});

describe('play state - martial focus', () => {
  it('missing martialFocusCurrent defaults to max (starts focused)', () => {
    const character = makeCharacter({ martialFocusMax: 3, martialFocusCurrent: undefined });
    const sheet = computeSheet(character, opts);
    expect(sheet.play.martialFocus.max).toBe(3);
    expect(sheet.play.martialFocus.current).toBe(3);
  });

  it('a stored current larger than max is clamped down to max', () => {
    const character = makeCharacter({ martialFocusMax: 3, martialFocusCurrent: 10 });
    const sheet = computeSheet(character, opts);
    expect(sheet.play.martialFocus.current).toBe(3);
  });
});

describe('play state - trackers', () => {
  it('clamps current into [0, max], defaults a missing max to 0, and never produces NaN', () => {
    const character = makeCharacter({
      trackers: [
        { id: 't1', name: 'Ki Pool', max: 5, current: 8 },   // clamp down
        { id: 't2', name: 'Rage', max: 5, current: -3 },      // clamp up to 0
        { id: 't3', name: 'No Max', current: 7 }              // missing max -> 0
      ]
    });
    const sheet = computeSheet(character, opts);
    const t1 = sheet.play.trackers.find((t) => t.id === 't1');
    const t2 = sheet.play.trackers.find((t) => t.id === 't2');
    const t3 = sheet.play.trackers.find((t) => t.id === 't3');

    expect(t1.current).toBe(5);
    expect(t2.current).toBe(0);
    expect(t3.max).toBe(0);
    expect(t3.current).toBe(0);

    for (const t of sheet.play.trackers) {
      expect(Number.isNaN(t.current)).toBe(false);
      expect(Number.isNaN(t.max)).toBe(false);
    }
  });
});

describe('buff toggle semantics', () => {
  it('a disabled modifier source contributes nothing; enabling it changes AC', () => {
    const disabled = makeCharacter({
      modifiers: [
        { id: 'mage-armor', name: 'Mage Armor', enabled: false, effects: [{ target: 'ac', type: 'armor', value: 4 }] }
      ]
    });
    const enabled = { ...disabled, modifiers: [{ ...disabled.modifiers[0], enabled: true }] };

    const disabledSheet = computeSheet(disabled, opts);
    const enabledSheet = computeSheet(enabled, opts);
    const dexMod = abilityModifier(10);

    expect(disabledSheet.acTotals.ac).toBe(10 + dexMod); // no armor bonus applied
    expect(enabledSheet.acTotals.ac).toBe(10 + dexMod + 4); // armor bonus now applies
  });
});

// PF1e stacking between the manual defense inputs and typed `ac` effects:
// worn armor and an armor-typed buff (e.g. Mage Armor) take the higher value,
// they never sum. (Core Rulebook, bonus stacking.)
describe('manual defense inputs stack as typed bonuses with ac effects', () => {
  const armored = (effects) => makeCharacter({
    defense: { armorBonus: 4, shieldBonus: 0, naturalArmor: 0, deflection: 2,
               dodgeMisc: 0, miscAc: 0, maxDex: null, acp: 0 },
    modifiers: effects
      ? [{ id: 'b1', name: 'buff', enabled: true, effects }]
      : []
  });

  it('same-type armor effect does not stack with the armor input', () => {
    const base = computeSheet(armored(null), opts);
    const withMageArmor = computeSheet(armored([{ target: 'ac', type: 'armor', value: 4 }]), opts);
    expect(withMageArmor.acTotals.ac).toBe(base.acTotals.ac);
  });

  it('a larger same-type effect contributes only the difference', () => {
    const base = computeSheet(armored(null), opts);
    const bigger = computeSheet(armored([{ target: 'ac', type: 'armor', value: 6 }]), opts);
    expect(bigger.acTotals.ac).toBe(base.acTotals.ac + 2);
  });

  it('deflection effects reach CMD but do not double with the deflection input', () => {
    const base = computeSheet(armored(null), opts);
    const sameDeflect = computeSheet(armored([{ target: 'ac', type: 'deflection', value: 2 }]), opts);
    const biggerDeflect = computeSheet(armored([{ target: 'ac', type: 'deflection', value: 3 }]), opts);
    expect(sameDeflect.cmd).toBe(base.cmd);
    expect(biggerDeflect.cmd).toBe(base.cmd + 1);
    expect(biggerDeflect.acTotals.touch).toBe(base.acTotals.touch + 1);
  });
});
