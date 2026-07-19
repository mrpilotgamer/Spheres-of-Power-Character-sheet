import { describe, it, expect } from 'vitest';
import { computeSheet, SIZE_MODS } from './computeSheet.js';
import { blankCharacter } from './newCharacter.js';
import { abilityModifier } from './abilities.js';
import { babAtLevel, attacksFromBab } from './progression.js';

// Minimal fake class table, independent of src/data/*.json, per docs/engine.md.
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
  rogue: {
    id: 'rogue',
    system: 'guile',
    casterType: 'none',
    babType: 'threeQuarter',
    goodSaves: ['ref'],
    skillsPerLevel: 8,
    classSkills: ['Stealth', 'Craft']
  }
};
const opts = { classesById: fakeClassesById };

function makeCharacter(overrides = {}) {
  return {
    ...blankCharacter(),
    baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    classLevels: [{ classId: 'fighter', level: 1 }],
    ...overrides
  };
}

describe('computeSheet - acTotals', () => {
  it('armor, shield, and natural armor are excluded from touch but kept in flat-footed', () => {
    const character = makeCharacter({
      baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      defense: { armorBonus: 4, shieldBonus: 2, naturalArmor: 1, deflection: 0, dodgeMisc: 0, miscAc: 0, maxDex: null, acp: 0 }
    });
    const sheet = computeSheet(character, opts);
    const dexMod = abilityModifier(14);

    expect(sheet.acTotals.ac).toBe(10 + 4 + 2 + 1 + dexMod);
    expect(sheet.acTotals.touch).toBe(10 + dexMod); // no armor/shield/natural
    expect(sheet.acTotals.flatFooted).toBe(10 + 4 + 2 + 1); // no dex, kept armor/shield/natural
  });

  it('dex bonus to AC is capped by defense.maxDex', () => {
    const character = makeCharacter({
      baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
      defense: { armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 0, dodgeMisc: 0, miscAc: 0, maxDex: 1, acp: 0 }
    });
    const sheet = computeSheet(character, opts);
    const uncapped = computeSheet(makeCharacter({
      baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
      defense: { armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 0, dodgeMisc: 0, miscAc: 0, maxDex: null, acp: 0 }
    }), opts);

    expect(abilityModifier(18)).toBe(4); // sanity: without cap dex would give +4
    expect(sheet.acTotals.ac).toBe(11); // 10 + capped dex (1)
    expect(uncapped.acTotals.ac).toBe(14); // 10 + uncapped dex (4)
  });

  it('a dodge-type "ac" effect appears in AC and touch but not flat-footed', () => {
    const character = makeCharacter({
      modifiers: [
        {
          id: 'dodge-feat', name: 'Dodge', enabled: true,
          effects: [{ target: 'ac', type: 'dodge', value: 2 }]
        }
      ]
    });
    const sheet = computeSheet(character, opts);

    expect(sheet.acTotals.ac).toBe(12); // 10 + 2 dodge
    expect(sheet.acTotals.touch).toBe(12); // dodge applies to touch too
    expect(sheet.acTotals.flatFooted).toBe(10); // dodge lost when flat-footed
  });

  it('deflection appears in AC, touch, and flat-footed', () => {
    const character = makeCharacter({
      defense: { armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 3, dodgeMisc: 0, miscAc: 0, maxDex: null, acp: 0 }
    });
    const sheet = computeSheet(character, opts);

    expect(sheet.acTotals.ac).toBe(13);
    expect(sheet.acTotals.touch).toBe(13);
    expect(sheet.acTotals.flatFooted).toBe(13);
  });

  it('applies the size modifier to AC (small +1, large -1)', () => {
    const small = computeSheet(makeCharacter({ size: 'small' }), opts);
    const medium = computeSheet(makeCharacter({ size: 'medium' }), opts);
    const large = computeSheet(makeCharacter({ size: 'large' }), opts);

    expect(small.acTotals.ac).toBe(medium.acTotals.ac + 1);
    expect(large.acTotals.ac).toBe(medium.acTotals.ac - 1);
    expect(small.size).toBe('small');
    expect(large.size).toBe('large');
  });
});

describe('computeSheet - cmb/cmd', () => {
  it('cmb = BAB + STR + special size mod (large gives +1 CMB)', () => {
    const large = computeSheet(makeCharacter({
      baseAbilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 4 }],
      size: 'large'
    }), opts);
    const medium = computeSheet(makeCharacter({
      baseAbilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 4 }],
      size: 'medium'
    }), opts);

    const bab = babAtLevel('full', 4);
    const strMod = abilityModifier(16);
    expect(medium.cmb).toBe(bab + strMod); // special size mod 0
    expect(large.cmb).toBe(bab + strMod + 1); // -SIZE_MODS.large = -(-1) = +1
    expect(-SIZE_MODS.large).toBe(1);
  });

  it('cmd includes dex capped by maxDex, plus deflection and dodge bonuses', () => {
    const character = makeCharacter({
      baseAbilities: { str: 10, dex: 20, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 4 }],
      defense: { armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 1, dodgeMisc: 2, miscAc: 0, maxDex: 2, acp: 0 }
    });
    const sheet = computeSheet(character, opts);
    const bab = babAtLevel('full', 4);

    // Raw dex mod would be +5, but CMD must use the capped value (2).
    expect(abilityModifier(20)).toBe(5);
    expect(sheet.cmd).toBe(10 + bab + 0 /* str mod */ + 2 /* capped dex */ + 0 /* special size */ + 1 /* deflection */ + 2 /* dodgeMisc */);
  });

  // PF1e RAW: circumstance, deflection, dodge, insight, luck, morale, profane,
  // and sacred bonuses to AC also apply to CMD; AC penalties always apply to
  // CMD too. Armor/shield/natural/enhancement/competence/size-typed positive
  // AC bonuses do not.
  it('an untyped AC penalty (e.g. the blinded condition) also lowers CMD', () => {
    const base = computeSheet(makeCharacter(), opts);
    const sheet = computeSheet(makeCharacter({ conditions: ['blinded'] }), opts);

    expect(sheet.acTotals.ac).toBe(base.acTotals.ac - 2); // sanity: same -2 hits AC
    expect(sheet.cmd).toBe(base.cmd - 2);
  });

  it('a positive insight-type AC effect also raises CMD', () => {
    const base = computeSheet(makeCharacter(), opts);
    const sheet = computeSheet(makeCharacter({
      modifiers: [
        { id: 'ins', name: 'Insight Buff', enabled: true, effects: [{ target: 'ac', type: 'insight', value: 1 }] }
      ]
    }), opts);

    expect(sheet.acTotals.ac).toBe(base.acTotals.ac + 1);
    expect(sheet.cmd).toBe(base.cmd + 1);
  });

  it('a positive armor-type AC effect raises AC but does NOT reach CMD', () => {
    const base = computeSheet(makeCharacter(), opts);
    const sheet = computeSheet(makeCharacter({
      modifiers: [
        { id: 'armor-buff', name: 'Armor Buff', enabled: true, effects: [{ target: 'ac', type: 'armor', value: 4 }] }
      ]
    }), opts);

    expect(sheet.acTotals.ac).toBe(base.acTotals.ac + 4);
    expect(sheet.cmd).toBe(base.cmd); // armor bonus does not carry over to CMD
  });

  it('the deflection defense input reaches CMD exactly once', () => {
    const base = computeSheet(makeCharacter(), opts);
    const sheet = computeSheet(makeCharacter({
      defense: { armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 3, dodgeMisc: 0, miscAc: 0, maxDex: null, acp: 0 }
    }), opts);

    expect(sheet.cmd).toBe(base.cmd + 3);
    expect(sheet.acTotals.ac).toBe(base.acTotals.ac + 3);
  });
});

describe('computeSheet - init/speed', () => {
  it('init = dex + initiativeMisc + init effects', () => {
    const character = makeCharacter({
      baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      initiativeMisc: 3,
      modifiers: [
        { id: 'alertness', name: 'Alertness', enabled: true, effects: [{ target: 'init', type: 'untyped', value: 1 }] }
      ]
    });
    const sheet = computeSheet(character, opts);
    expect(sheet.init).toBe(abilityModifier(14) + 3 + 1);
  });

  it('speed = base speed + speed effects', () => {
    const character = makeCharacter({
      speed: 20,
      modifiers: [
        { id: 'boots', name: 'Boots of Striding', enabled: true, effects: [{ target: 'speed', type: 'enhancement', value: 10 }] }
      ]
    });
    const sheet = computeSheet(character, opts);
    expect(sheet.speed).toBe(30);
  });
});

describe('computeSheet - weapons', () => {
  it('STR-based to-hit produces iteratives once BAB reaches 6', () => {
    const character = makeCharacter({
      baseAbilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 12 }], // full BAB -> 12
      weapons: [{ id: 'w1', name: 'Longsword', attackAbility: 'str', attackMisc: 1, damageDice: '1d8', damageAbility: 'str', damageMult: 1 }]
    });
    const sheet = computeSheet(character, opts);
    const bab = babAtLevel('full', 12);
    const iteratives = attacksFromBab(bab);
    const strMod = abilityModifier(16);
    const toHit = strMod + 0 /* size */ + 1 /* attackMisc */;

    expect(bab).toBe(12);
    expect(iteratives).toEqual([12, 7, 2]);
    expect(sheet.weapons[0].attacks).toEqual(iteratives.map((a) => a + toHit));
  });

  it('damage string applies floor(abilityMod x mult): 1.5 mult with STR +3 gives +4', () => {
    const character = makeCharacter({
      baseAbilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      weapons: [{ id: 'w1', name: 'Greatsword', attackAbility: 'str', damageDice: '1d8', damageAbility: 'str', damageMult: 1.5 }]
    });
    const sheet = computeSheet(character, opts);
    expect(abilityModifier(16)).toBe(3);
    expect(Math.floor(3 * 1.5)).toBe(4);
    expect(sheet.weapons[0].damage).toBe('1d8+4');
  });

  it('omits "+0" when the damage bonus is exactly zero', () => {
    const character = makeCharacter({
      weapons: [{ id: 'w1', name: 'Dagger', attackAbility: 'str', damageDice: '1d4', damageAbility: 'none', damageMult: 1 }]
    });
    const sheet = computeSheet(character, opts);
    expect(sheet.weapons[0].damage).toBe('1d4');
  });

  it('applies a 0.5 damage mult to a negative ability mod, flooring toward negative infinity', () => {
    const character = makeCharacter({
      baseAbilities: { str: 4, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, // str mod -3
      weapons: [{ id: 'w1', name: 'Sling', attackAbility: 'dex', damageDice: '1d4', damageAbility: 'str', damageMult: 0.5 }]
    });
    const sheet = computeSheet(character, opts);
    expect(abilityModifier(4)).toBe(-3);
    expect(Math.floor(-3 * 0.5)).toBe(-2);
    expect(sheet.weapons[0].damage).toBe('1d4-2');
  });
});

describe('computeSheet - skills integration', () => {
  it('a class granting "Knowledge (all)" auto-marks every knowledge subskill as a class skill', () => {
    const sheet = computeSheet(makeCharacter(), opts); // fighter grants Knowledge (all)
    const arcana = sheet.skills.find((s) => s.id === 'knowledge-arcana');
    const nature = sheet.skills.find((s) => s.id === 'knowledge-nature');
    const appraise = sheet.skills.find((s) => s.id === 'appraise'); // not granted

    expect(arcana.classSkill).toBe(true);
    expect(nature.classSkill).toBe(true);
    expect(appraise.classSkill).toBe(false);
  });

  it('classSkillOverride forces a skill to be treated as a class skill even without a match', () => {
    const character = makeCharacter({
      skills: { bluff: { ranks: 0, classSkillOverride: true } }
    });
    const sheet = computeSheet(character, opts);
    const bluff = sheet.skills.find((s) => s.id === 'bluff');
    expect(bluff.classSkill).toBe(true);
  });

  it('union of multiple classes classSkills marks a skill class-skill if any class grants it', () => {
    const character = makeCharacter({
      classLevels: [{ classId: 'fighter', level: 1 }, { classId: 'rogue', level: 1 }],
      customSkills: [{ id: 'craft-alchemy', family: 'Craft', name: 'Craft (Alchemy)' }]
    });
    const sheet = computeSheet(character, opts); // rogue grants bare "Craft"
    const craftAlchemy = sheet.skills.find((s) => s.id === 'craft-alchemy');
    expect(craftAlchemy.classSkill).toBe(true);
  });

  it('acp flows from character.defense.acp only into acp:true skills', () => {
    const character = makeCharacter({
      defense: { armorBonus: 0, shieldBonus: 0, naturalArmor: 0, deflection: 0, dodgeMisc: 0, miscAc: 0, maxDex: null, acp: 3 },
      skills: {
        acrobatics: { ranks: 2, misc: 0 }, // acp: true, dex-based, not a fighter class skill by name match... actually is (Acrobatics listed)
        bluff: { ranks: 2, misc: 0 } // acp: false
      }
    });
    const sheet = computeSheet(character, opts);
    const acrobatics = sheet.skills.find((s) => s.id === 'acrobatics');
    const bluff = sheet.skills.find((s) => s.id === 'bluff');

    expect(acrobatics.acpApplied).toBe(3);
    expect(bluff.acpApplied).toBe(0);
    // acrobatics is a fighter class skill with ranks > 0, so +3 class bonus applies.
    expect(acrobatics.total).toBe(2 /* ranks */ + 0 /* dex mod */ + 3 /* class bonus */ + 0 /* misc */ - 3 /* acp */);
  });

  it('computes skillPoints budget and spent', () => {
    const character = makeCharacter({
      classLevels: [{ classId: 'fighter', level: 3 }],
      skillPointsMisc: 2,
      skills: { acrobatics: { ranks: 2 }, bluff: { ranks: 3 } }
    });
    const sheet = computeSheet(character, opts);
    // fighter skillsPerLevel 2, int mod 0 -> max(1, 2) * 3 = 6, + misc 2 = 8
    expect(sheet.skillPoints.budget).toBe(8);
    expect(sheet.skillPoints.spent).toBe(5);
  });
});

describe('computeSheet - old-save safety', () => {
  it('a character missing all Stage 2 fields computes without throwing and returns sane defaults', () => {
    const character = {
      baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classLevels: [{ classId: 'fighter', level: 1 }]
      // no skills, customSkills, defense, weapons, size, initiativeMisc, speed,
      // skillPointsMisc, or modifiers at all.
    };

    let sheet;
    expect(() => { sheet = computeSheet(character, opts); }).not.toThrow();

    expect(sheet.acTotals.ac).toBe(10);
    expect(sheet.acTotals.touch).toBe(10);
    expect(sheet.acTotals.flatFooted).toBe(10);
    expect(sheet.init).toBe(0); // dex mod 0
    expect(sheet.speed).toBe(30); // default speed
    expect(sheet.size).toBe('medium');
    expect(sheet.acp).toBe(0);
    expect(Array.isArray(sheet.weapons)).toBe(true);
    expect(sheet.weapons.length).toBe(0);
    expect(Array.isArray(sheet.skills)).toBe(true);
    expect(sheet.skills.length).toBeGreaterThan(0); // fixed skills still populate
    expect(sheet.skillPoints.spent).toBe(0);
  });
});
