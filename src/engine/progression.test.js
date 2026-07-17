import { describe, it, expect } from 'vitest';
import {
  babAtLevel,
  attacksFromBab,
  saveAtLevel,
  savesAtLevel,
  casterLevelAtLevel,
  totalCasterLevel,
  totalCasterClassLevels,
  spellPoints,
  sphereDC,
  magicSkillBonus,
  magicSkillDefense
} from './progression.js';
import casterProgression from '../data/casterProgression.json';

describe('babAtLevel', () => {
  it('full BAB equals level', () => {
    expect(babAtLevel('full', 1)).toBe(1);
    expect(babAtLevel('full', 5)).toBe(5);
    expect(babAtLevel('full', 10)).toBe(10);
    expect(babAtLevel('full', 20)).toBe(20);
  });

  it('three-quarter BAB is floor(level * 3 / 4)', () => {
    expect(babAtLevel('threeQuarter', 1)).toBe(0);
    expect(babAtLevel('threeQuarter', 5)).toBe(3);
    expect(babAtLevel('threeQuarter', 10)).toBe(7);
    expect(babAtLevel('threeQuarter', 20)).toBe(15);
  });

  it('half BAB is floor(level / 2)', () => {
    expect(babAtLevel('half', 1)).toBe(0);
    expect(babAtLevel('half', 5)).toBe(2);
    expect(babAtLevel('half', 10)).toBe(5);
    expect(babAtLevel('half', 20)).toBe(10);
  });
});

describe('attacksFromBab', () => {
  it('bab 11 yields [11, 6, 1]', () => {
    expect(attacksFromBab(11)).toEqual([11, 6, 1]);
  });

  it('bab 5 yields [5]', () => {
    expect(attacksFromBab(5)).toEqual([5]);
  });

  it('bab 0 yields [0]', () => {
    expect(attacksFromBab(0)).toEqual([0]);
  });
});

describe('saveAtLevel', () => {
  it('good save is floor(level / 2) + 2', () => {
    expect(saveAtLevel(true, 1)).toBe(2);
    expect(saveAtLevel(true, 3)).toBe(3);
    expect(saveAtLevel(true, 12)).toBe(8);
    expect(saveAtLevel(true, 20)).toBe(12);
  });

  it('poor save is floor(level / 3)', () => {
    expect(saveAtLevel(false, 1)).toBe(0);
    expect(saveAtLevel(false, 3)).toBe(1);
    expect(saveAtLevel(false, 12)).toBe(4);
    expect(saveAtLevel(false, 20)).toBe(6);
  });
});

describe('savesAtLevel', () => {
  it('applies good/poor per save based on goodSaves list', () => {
    expect(savesAtLevel(['fort', 'will'], 12)).toEqual({
      fort: saveAtLevel(true, 12),
      ref: saveAtLevel(false, 12),
      will: saveAtLevel(true, 12)
    });
  });
});

describe('casterLevelAtLevel', () => {
  it('none caster type always returns 0', () => {
    expect(casterLevelAtLevel('none', 1)).toBe(0);
    expect(casterLevelAtLevel('none', 20)).toBe(0);
    expect(casterLevelAtLevel(null, 5)).toBe(0);
  });

  it('high caster matches casterProgression.json at various levels', () => {
    expect(casterLevelAtLevel('high', 1)).toBe(casterProgression.high[0]);
    expect(casterLevelAtLevel('high', 5)).toBe(casterProgression.high[4]);
    expect(casterLevelAtLevel('high', 10)).toBe(casterProgression.high[9]);
    expect(casterLevelAtLevel('high', 20)).toBe(casterProgression.high[19]);
  });

  it('mid caster matches casterProgression.json at various levels', () => {
    expect(casterLevelAtLevel('mid', 1)).toBe(casterProgression.mid[0]);
    expect(casterLevelAtLevel('mid', 5)).toBe(casterProgression.mid[4]);
    expect(casterLevelAtLevel('mid', 10)).toBe(casterProgression.mid[9]);
    expect(casterLevelAtLevel('mid', 20)).toBe(casterProgression.mid[19]);
  });

  it('low caster matches casterProgression.json at various levels', () => {
    expect(casterLevelAtLevel('low', 1)).toBe(casterProgression.low[0]);
    expect(casterLevelAtLevel('low', 5)).toBe(casterProgression.low[4]);
    expect(casterLevelAtLevel('low', 10)).toBe(casterProgression.low[9]);
    expect(casterLevelAtLevel('low', 20)).toBe(casterProgression.low[19]);
  });

  it('clamps levels above 20 to the level-20 table value', () => {
    expect(casterLevelAtLevel('high', 25)).toBe(casterProgression.high[19]);
    expect(casterLevelAtLevel('mid', 30)).toBe(casterProgression.mid[19]);
    expect(casterLevelAtLevel('low', 100)).toBe(casterProgression.low[19]);
  });
});

// Minimal fake class table for exercising the multiclass-aware helpers below,
// independent of the real src/data/*.json class files.
const fakeClassesById = {
  highCaster: { id: 'highCaster', casterType: 'high' },
  midCaster: { id: 'midCaster', casterType: 'mid' },
  martial: { id: 'martial', casterType: 'none' }
};

describe('totalCasterLevel', () => {
  it('sums caster levels across multiple casting classes', () => {
    const classLevels = [
      { classId: 'highCaster', level: 5 },
      { classId: 'midCaster', level: 5 }
    ];
    // high@5 = 5, mid@5 = 3 -> 8
    expect(totalCasterLevel(classLevels, fakeClassesById)).toBe(
      casterLevelAtLevel('high', 5) + casterLevelAtLevel('mid', 5)
    );
  });

  it('returns minimum 1 when a casting class table gives 0 at low level', () => {
    const classLevels = [{ classId: 'midCaster', level: 1 }];
    // mid@1 = 0, but the character has a casting class, so it floors at 1.
    expect(casterLevelAtLevel('mid', 1)).toBe(0);
    expect(totalCasterLevel(classLevels, fakeClassesById)).toBe(1);
  });

  it('non-casting classes contribute 0 and do not trigger the minimum-1 floor', () => {
    const classLevels = [{ classId: 'martial', level: 5 }];
    expect(totalCasterLevel(classLevels, fakeClassesById)).toBe(0);
  });
});

describe('totalCasterClassLevels', () => {
  it('sums levels only from casting classes', () => {
    const classLevels = [
      { classId: 'highCaster', level: 5 },
      { classId: 'martial', level: 3 }
    ];
    expect(totalCasterClassLevels(classLevels, fakeClassesById)).toBe(5);
  });
});

describe('spellPoints', () => {
  it('returns 0 when there are no caster levels', () => {
    expect(spellPoints(0, 5)).toBe(0);
  });

  it('floors at 1 when ability mod would push the pool negative', () => {
    expect(spellPoints(1, -5)).toBe(1);
  });

  it('sums caster class levels and casting ability mod otherwise', () => {
    expect(spellPoints(10, 3)).toBe(13);
  });
});

describe('sphereDC', () => {
  it('is 10 + floor(casterLevel / 2) + castingAbilityMod', () => {
    expect(sphereDC(10, 3)).toBe(18);
    expect(sphereDC(5, 2)).toBe(14);
  });
});

describe('magicSkillBonus / magicSkillDefense', () => {
  it('MSB equals total caster-class levels', () => {
    expect(magicSkillBonus(7)).toBe(7);
  });

  it('MSD is 11 + MSB', () => {
    expect(magicSkillDefense(7)).toBe(18);
  });
});
