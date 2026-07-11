import casterProgression from '../data/casterProgression.json';

// Standard Pathfinder base attack bonus progressions.
export function babAtLevel(babType, level) {
  switch (babType) {
    case 'full': return level;
    case 'threeQuarter': return Math.floor((level * 3) / 4);
    case 'half': return Math.floor(level / 2);
    default: return 0;
  }
}

// Returns an array of attack bonuses for iterative attacks, e.g. [11, 6, 1].
export function attacksFromBab(bab) {
  const attacks = [bab];
  let next = bab - 5;
  while (next > 0) {
    attacks.push(next);
    next -= 5;
  }
  return attacks;
}

// Standard Pathfinder good/poor saving throw progressions.
export function saveAtLevel(isGood, level) {
  return isGood ? Math.floor(level / 2) + 2 : Math.floor(level / 3);
}

export function savesAtLevel(goodSaves, level) {
  return {
    fort: saveAtLevel(goodSaves.includes('fort'), level),
    ref: saveAtLevel(goodSaves.includes('ref'), level),
    will: saveAtLevel(goodSaves.includes('will'), level)
  };
}

// Spheres of Power: caster level by caster type, from Table: Caster Level.
export function casterLevelAtLevel(casterType, level) {
  if (!casterType || casterType === 'none' || level < 1) return 0;
  const table = casterProgression[casterType];
  if (!table) return 0;
  return table[Math.min(level, 20) - 1] || 0;
}

// A character can have levels in multiple casting classes; caster levels,
// spell points, and magic talents from all of them stack together.
export function totalCasterLevel(classLevels, classesById) {
  return classLevels.reduce((sum, cl) => {
    const cls = classesById[cl.classId];
    if (!cls || !cls.casterType || cls.casterType === 'none') return sum;
    return sum + casterLevelAtLevel(cls.casterType, cl.level);
  }, 0);
}

export function totalCasterClassLevels(classLevels, classesById) {
  return classLevels.reduce((sum, cl) => {
    const cls = classesById[cl.classId];
    if (!cls || !cls.casterType || cls.casterType === 'none') return sum;
    return sum + cl.level;
  }, 0);
}

// Spell pool = total caster-class levels + casting ability modifier (min 1).
export function spellPoints(totalCasterClassLevels, castingAbilityMod) {
  if (totalCasterClassLevels <= 0) return 0;
  return Math.max(1, totalCasterClassLevels + castingAbilityMod);
}

// DC = 10 + 1/2 caster level + casting ability modifier.
export function sphereDC(casterLevel, castingAbilityMod) {
  return 10 + Math.floor(casterLevel / 2) + castingAbilityMod;
}

// Magic Skill Bonus = total caster-class levels. MSD = 11 + MSB.
export function magicSkillBonus(totalCasterClassLevels) {
  return totalCasterClassLevels;
}
export function magicSkillDefense(msb) {
  return 11 + msb;
}

// Magic talents: baseline rule is "1 per caster class level, plus 2 bonus
// talents the first time you take a level in ANY casting class." Classes
// with a documented exception can override this via talentProgression.
export function magicTalentsGained(classLevels, classesById) {
  let total = 0;
  let grantedFirstCasterBonus = false;
  for (const cl of classLevels) {
    const cls = classesById[cl.classId];
    if (!cls || !cls.casterType || cls.casterType === 'none') continue;
    total += cl.level; // 1 per level, standard progression
    if (!grantedFirstCasterBonus) {
      total += 2;
      grantedFirstCasterBonus = true;
    }
  }
  return total;
}
