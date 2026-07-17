import { describe, it, expect } from 'vitest';
import skillsData from '../data/skills.json';
import {
  fixedSkills,
  placeholdersByFamily,
  customSkillEntry,
  isClassSkill,
  skillTotal,
  skillPointsBudget,
  PLACEHOLDER_FAMILIES
} from './skills.js';

describe('isClassSkill', () => {
  const knowledgeArcana = skillsData.find((s) => s.id === 'knowledge-arcana');
  const knowledgeNature = skillsData.find((s) => s.id === 'knowledge-nature');
  const acrobatics = skillsData.find((s) => s.id === 'acrobatics');
  const craftPlaceholder = skillsData.find((s) => s.id === 'craft');
  const customCraft = customSkillEntry(
    { id: 'craft-alchemy', family: 'Craft', name: 'Craft (Alchemy)' },
    placeholdersByFamily(skillsData)
  );

  it('matches on exact name', () => {
    expect(isClassSkill(acrobatics, ['Acrobatics'])).toBe(true);
  });

  it('"Knowledge (all)" matches every knowledge-* entry', () => {
    expect(isClassSkill(knowledgeArcana, ['Knowledge (all)'])).toBe(true);
    expect(isClassSkill(knowledgeNature, ['Knowledge (all)'])).toBe(true);
  });

  it('bare "Craft" family string matches a custom craft instance', () => {
    expect(isClassSkill(customCraft, ['Craft'])).toBe(true);
  });

  it('the Craft placeholder entry itself also matches the bare family string', () => {
    expect(isClassSkill(craftPlaceholder, ['Craft'])).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(isClassSkill(acrobatics, ['Bluff', 'Diplomacy'])).toBe(false);
    expect(isClassSkill(knowledgeArcana, ['Craft'])).toBe(false);
    expect(isClassSkill(customCraft, ['Knowledge (all)'])).toBe(false);
  });

  it('returns false for a missing skill entry', () => {
    expect(isClassSkill(null, ['Acrobatics'])).toBe(false);
  });

  it('supports union semantics across multiple class lists (caller concatenates arrays)', () => {
    const classAList = ['Bluff', 'Diplomacy'];
    const classBList = ['Knowledge (all)', 'Craft'];
    const union = [...classAList, ...classBList];

    // Neither list alone matches Knowledge (arcana) or the custom craft skill,
    // but the union (as computeSheet builds it across a character's classes) does.
    expect(isClassSkill(knowledgeArcana, classAList)).toBe(false);
    expect(isClassSkill(knowledgeArcana, union)).toBe(true);
    expect(isClassSkill(customCraft, classAList)).toBe(false);
    expect(isClassSkill(customCraft, union)).toBe(true);
  });
});

describe('skillTotal', () => {
  const acrobatics = skillsData.find((s) => s.id === 'acrobatics'); // acp: true
  const bluff = skillsData.find((s) => s.id === 'bluff'); // acp: false
  const disableDevice = skillsData.find((s) => s.id === 'disable-device'); // trainedOnly: true, acp: true

  it('applies the +3 class-skill bonus only when ranks > 0', () => {
    const zeroRanks = skillTotal({ entry: bluff, ranks: 0, abilityMod: 1, classSkill: true });
    const someRanks = skillTotal({ entry: bluff, ranks: 2, abilityMod: 1, classSkill: true });

    expect(zeroRanks.total).toBe(0 + 1 + 0); // no class bonus at 0 ranks
    expect(someRanks.total).toBe(2 + 1 + 3); // class bonus applies once ranks > 0
    expect(zeroRanks.classSkill).toBe(true);
    expect(someRanks.classSkill).toBe(true);
  });

  it('subtracts ACP only for acp:true entries', () => {
    const withAcp = skillTotal({ entry: acrobatics, ranks: 1, abilityMod: 2, acp: 4 });
    const withoutAcp = skillTotal({ entry: bluff, ranks: 1, abilityMod: 2, acp: 4 });

    expect(withAcp.acpApplied).toBe(4);
    expect(withAcp.total).toBe(1 + 2 - 4);
    expect(withoutAcp.acpApplied).toBe(0);
    expect(withoutAcp.total).toBe(1 + 2);
  });

  it('trainedOnly with 0 ranks flags unusable but still computes a numeric total', () => {
    const result = skillTotal({ entry: disableDevice, ranks: 0, abilityMod: 3, misc: 1 });

    expect(result.unusable).toBe(true);
    expect(result.total).toBe(0 + 3 + 0 + 1); // still a real number, just flagged
  });

  it('trainedOnly with ranks > 0 is usable', () => {
    const result = skillTotal({ entry: disableDevice, ranks: 1, abilityMod: 3 });
    expect(result.unusable).toBe(false);
  });

  it('includes misc and effect bonuses', () => {
    const result = skillTotal({
      entry: bluff,
      ranks: 2,
      abilityMod: 1,
      misc: 2,
      effectBonus: 5,
      classSkill: false
    });
    expect(result.total).toBe(2 + 1 + 2 + 5);
  });
});

describe('skillPointsBudget', () => {
  it('floors at max(1, skillsPerLevel + intMod) per level', () => {
    const classesById = { rogue: { skillsPerLevel: 2 } };
    const classLevels = [{ classId: 'rogue', level: 5 }];

    // skillsPerLevel 2, INT -3 => max(1, -1) = 1 per level => 1 * 5 = 5
    expect(skillPointsBudget(classLevels, classesById, -3)).toBe(5);
  });

  it('sums across multiclass levels', () => {
    const classesById = {
      rogue: { skillsPerLevel: 8 },
      fighter: { skillsPerLevel: 2 }
    };
    const classLevels = [
      { classId: 'rogue', level: 3 },
      { classId: 'fighter', level: 2 }
    ];
    const intMod = 1;
    const expected = (8 + intMod) * 3 + (2 + intMod) * 2;
    expect(skillPointsBudget(classLevels, classesById, intMod)).toBe(expected);
  });

  it('adds a flat miscBonus on top', () => {
    const classesById = { rogue: { skillsPerLevel: 8 } };
    const classLevels = [{ classId: 'rogue', level: 1 }];
    const withoutMisc = skillPointsBudget(classLevels, classesById, 0, 0);
    const withMisc = skillPointsBudget(classLevels, classesById, 0, 4);
    expect(withMisc).toBe(withoutMisc + 4);
  });

  it('ignores class levels with no classId and defaults gracefully', () => {
    expect(skillPointsBudget([], {}, 0, 0)).toBe(0);
    expect(skillPointsBudget([{ classId: '', level: 3 }], {}, 0, 0)).toBe(0);
    expect(skillPointsBudget(undefined, undefined, undefined, undefined)).toBe(0);
  });
});

describe('customSkillEntry / placeholdersByFamily / fixedSkills', () => {
  it('fixedSkills excludes the Craft/Perform/Profession placeholders', () => {
    const fixed = fixedSkills(skillsData);
    for (const entry of fixed) {
      expect(PLACEHOLDER_FAMILIES.has(entry.family)).toBe(false);
    }
    // Knowledge is concrete, not a placeholder family, so all 10 remain.
    const knowledgeCount = fixed.filter((s) => s.family === 'Knowledge').length;
    expect(knowledgeCount).toBe(10);
    // Total fixed = all entries minus the 3 placeholders (craft/perform/profession).
    expect(fixed.length).toBe(skillsData.length - 3);
  });

  it('placeholdersByFamily maps each placeholder family to its entry', () => {
    const placeholders = placeholdersByFamily(skillsData);
    expect(placeholders.Craft.id).toBe('craft');
    expect(placeholders.Perform.id).toBe('perform');
    expect(placeholders.Profession.id).toBe('profession');
  });

  it('customSkillEntry inherits ability/acp/trainedOnly from the family placeholder', () => {
    const placeholders = placeholdersByFamily(skillsData);
    const entry = customSkillEntry({ id: 'craft-alchemy', family: 'Craft', name: 'Craft (Alchemy)' }, placeholders);

    expect(entry.id).toBe('craft-alchemy');
    expect(entry.name).toBe('Craft (Alchemy)');
    expect(entry.ability).toBe('int'); // inherited from Craft placeholder
    expect(entry.acp).toBe(false);
    expect(entry.trainedOnly).toBe(false);
    expect(entry.family).toBe('Craft');
  });

  it('customSkillEntry falls back sanely when the family placeholder is missing', () => {
    const entry = customSkillEntry({ id: 'mystery-1', family: 'Mystery', name: '' }, {});
    expect(entry.ability).toBe('int');
    expect(entry.acp).toBe(false);
    expect(entry.trainedOnly).toBe(false);
    expect(entry.name).toBe('Mystery'); // falls back to family when no name given
  });
});
