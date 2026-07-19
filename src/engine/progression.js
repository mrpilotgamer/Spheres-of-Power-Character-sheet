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
  let hasCastingClass = false;
  const total = classLevels.reduce((sum, cl) => {
    const cls = classesById[cl.classId];
    if (!cls || !cls.casterType || cls.casterType === 'none') return sum;
    hasCastingClass = true;
    return sum + casterLevelAtLevel(cls.casterType, cl.level);
  }, 0);
  // A caster level of 0 is treated as 1 for a character that has casting-class levels.
  if (hasCastingClass && total === 0) return 1;
  return total;
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

// Spheres of Power casting traditions: general drawbacks not exchanged for boons
// grant bonus spell points, scaling with levels in casting classes. Closed forms
// derived from the RAW table (spheresofpower.wikidot.com/casting-traditions):
//   drawbacks | RAW description              | closed form at caster-class level L
//     0       | —                            | 0
//     1       | +1, +1 per 6 levels          | 1 + floor(L / 6)
//     2       | +1, +1 per 3 levels          | 1 + floor(L / 3)
//     3       | +1 per odd level (1,3,5,…)   | ceil(L / 2)
//     4       | +1, +1 per 1.5 levels        | 1 + floor(2L / 3)
//     5       | +1 per level                 | L
// Row 4's "+1 per 1.5 levels" increments (on top of the base +1 at L1) land at
// levels 2,3,5,6,8,9,… which 1 + floor(2L/3) reproduces exactly. More than 5
// unexchanged drawbacks is undefined by the table; clamp to the 5-drawback rate
// (L). No casting-class levels ⇒ 0.
export function traditionSpellPoints(unexchangedDrawbacks, casterClassLevels) {
  const L = casterClassLevels || 0;
  const d = unexchangedDrawbacks || 0;
  if (L <= 0 || d <= 0) return 0;
  switch (d) {
    case 1: return 1 + Math.floor(L / 6);
    case 2: return 1 + Math.floor(L / 3);
    case 3: return Math.ceil(L / 2);
    case 4: return 1 + Math.floor((2 * L) / 3);
    default: return L; // 5 or more, clamped
  }
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

