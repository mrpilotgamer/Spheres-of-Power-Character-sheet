import { describe, it, expect } from 'vitest';
import { computeSheet } from './computeSheet.js';
import { blankCharacter } from './newCharacter.js';
import { abilityModifier } from './abilities.js';
import { babAtLevel } from './progression.js';

// Fake class table, matching the pattern in the stage2/stage3 suites.
const fakeClassesById = {
  fighter: {
    id: 'fighter',
    system: 'champion',
    casterType: 'none',
    babType: 'full',
    goodSaves: ['fort'],
    skillsPerLevel: 2,
    classSkills: ['Acrobatics', 'Climb', 'Knowledge (all)']
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

// A dodge-typed +1 AC effect, used to prove dodge is dropped under denyDex.
const dodgeBuff = {
  id: 'mobility', name: 'Mobility', enabled: true,
  effects: [{ target: 'ac', type: 'dodge', value: 1 }]
};

describe('denyDex - blinded on a Dex 18 character', () => {
  it('AC and touch lose positive dex (4), dodgeMisc + dodge effect (2), plus the blinded -2 penalty', () => {
    const defense = {
      armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 0,
      dodgeMisc: 1, miscAc: 0, maxDex: null, acp: 0
    };
    const base = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
      defense, modifiers: [dodgeBuff]
    }), opts);
    const blinded = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
      defense, modifiers: [dodgeBuff], conditions: ['blinded']
    }), opts);

    expect(abilityModifier(18)).toBe(4);
    // baseline AC = 10 + dodgeMisc 1 + dex 4 + dodge effect 1 = 16
    expect(base.acTotals.ac).toBe(16);
    // lose dex 4 + dodgeMisc 1 + dodge effect 1 + blinded -2 = -8 -> 8
    expect(blinded.acTotals.ac).toBe(base.acTotals.ac - 8);
    expect(blinded.acTotals.ac).toBe(8);

    // touch follows the identical logic (armor/shield/natural already absent).
    expect(base.acTotals.touch).toBe(16);
    expect(blinded.acTotals.touch).toBe(base.acTotals.touch - 8);
    expect(blinded.acTotals.touch).toBe(8);

    expect(blinded.denyDex).toBe(true);
    expect(base.denyDex).toBe(false);
  });
});

describe('denyDex - negative dex is retained', () => {
  it('a Dex 8 (-1) blinded character keeps the -1 in AC (only positive dex is lost)', () => {
    const blinded = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 8, con: 10, int: 10, wis: 10, cha: 10 },
      conditions: ['blinded']
    }), opts);

    expect(abilityModifier(8)).toBe(-1);
    // 10 + dex -1 + blinded -2 = 7 (the -1 survives; it is not clamped to 0).
    expect(blinded.acTotals.ac).toBe(7);
    expect(blinded.acTotals.touch).toBe(7);
    expect(blinded.denyDex).toBe(true);
  });
});

describe('denyDex - CMD', () => {
  it('drops dex and dodge from CMD but keeps deflection (and the blinded penalty)', () => {
    const withDeflection = {
      armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 2,
      dodgeMisc: 1, miscAc: 0, maxDex: null, acp: 0
    };
    const noDeflection = { ...withDeflection, deflection: 0 };

    const base = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
      defense: withDeflection
    }), opts);
    const blinded = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
      defense: withDeflection, conditions: ['blinded']
    }), opts);
    const blindedNoDeflect = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
      defense: noDeflection, conditions: ['blinded']
    }), opts);

    const bab = babAtLevel('full', 4);
    // baseline CMD = 10 + bab + str 0 + dex 4 + deflection 2 + dodgeMisc 1
    expect(base.cmd).toBe(10 + bab + 4 + 2 + 1);
    // blinded: lose dex 4 + dodgeMisc 1, keep deflection 2, apply blinded -2
    expect(blinded.cmd).toBe(10 + bab + 0 + 0 + 2 - 2);
    // deflection is retained: dropping it lowers CMD by exactly 2.
    expect(blinded.cmd - blindedNoDeflect.cmd).toBe(2);
  });
});

describe('denyDex - custom buff (no condition)', () => {
  it('a modifier source flagged loseDexToAc denies dex on its own', () => {
    const flagged = {
      id: 'off-guard', name: 'Off-Guard Aura', enabled: true,
      flags: ['loseDexToAc'], effects: []
    };
    const sheet = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      modifiers: [flagged]
    }), opts);

    expect(abilityModifier(14)).toBe(2);
    expect(sheet.denyDex).toBe(true);
    expect(sheet.acTotals.ac).toBe(10); // +2 dex is denied
    expect(sheet.acTotals.touch).toBe(10);
  });

  it('a disabled flagged source does not trip denyDex', () => {
    const sheet = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      modifiers: [{ id: 'off', name: 'Off', enabled: false, flags: ['loseDexToAc'], effects: [] }]
    }), opts);
    expect(sheet.denyDex).toBe(false);
    expect(sheet.acTotals.ac).toBe(12); // dex applies normally
  });
});

describe('denyDex - regression: no flag changes nothing', () => {
  it('a Dex 14 character with dodgeMisc and a dodge effect keeps every number when no flag is present', () => {
    const sheet = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      defense: { armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 0,
                 dodgeMisc: 1, miscAc: 0, maxDex: null, acp: 0 },
      modifiers: [dodgeBuff]
    }), opts);
    const bab = babAtLevel('full', 4);

    expect(sheet.denyDex).toBe(false);
    // 10 + dodgeMisc 1 + dex 2 + dodge effect 1 = 14
    expect(sheet.acTotals.ac).toBe(14);
    expect(sheet.acTotals.touch).toBe(14);
    // dodge lost when flat-footed, dex lost too: 10
    expect(sheet.acTotals.flatFooted).toBe(10);
    // CMD unchanged: 10 + bab + dex 2 + dodge effect 1 + dodgeMisc 1
    expect(sheet.cmd).toBe(10 + bab + 2 + 1 + 1);
  });
});
