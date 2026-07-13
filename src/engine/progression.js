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

// Talent progression works the same way as caster level and BAB: High
// progression gains 1 talent/level, Mid gains 3/4ths of a talent/level,
// Low gains 1/2 a talent/level - confirmed against multiple classes'
// published tables (e.g. Hedgewitch's Magic Talents column exactly matches
// the Mid/3-4ths formula). For magic talents this defaults to matching the
// class's caster type, since that's true for most classes - set
// `talentProgression: "high"/"mid"/"low"` explicitly only for documented
// exceptions (e.g. Thaumaturge is a High-Caster but has Low progression).
function progressionRate(tier) {
  if (tier === 'high') return 'full';
  if (tier === 'mid') return 'threeQuarter';
  if (tier === 'low') return 'half';
  return 'full';
}

function defaultTalentProgression(casterType) {
  if (casterType === 'high') return 'high';
  if (casterType === 'mid') return 'mid';
  if (casterType === 'low') return 'low';
  return null;
}

export function magicTalentsGained(classLevels, classesById) {
  let total = 0;
  let grantedFirstCasterBonus = false;
  for (const cl of classLevels) {
    const cls = classesById[cl.classId];
    if (!cls || !cls.casterType || cls.casterType === 'none') continue;
    if (cls.system === 'champion') continue;
    const tier = cls.talentProgression || defaultTalentProgression(cls.casterType);
    total += babAtLevel(progressionRate(tier), cl.level);
    // Some classes stack an extra bonus talent every N levels on top of
    // their normal progression (confirmed: Incanter gains +1 bonus talent
    // every odd level, i.e. bonusTalentEvery: 2, in addition to its
    // standard 1/level High progression).
    if (cls.bonusTalentEvery) {
      total += Math.ceil(cl.level / cls.bonusTalentEvery);
    }
    if (!grantedFirstCasterBonus) {
      total += 2;
      grantedFirstCasterBonus = true;
    }
  }
  return total;
}

// Combat talents (Spheres of Might): defaults to High progression since
// most per-class tables are still unverified. Set `talentProgression`
// explicitly for confirmed exceptions (e.g. Troubadour is documented Low
// progression for combat talents).
export function combatTalentsGained(classLevels, classesById) {
  let total = 0;
  let grantedFirstBonus = false;
  for (const cl of classLevels) {
    const cls = classesById[cl.classId];
    if (!cls || cls.system !== 'might') continue;
    total += babAtLevel(progressionRate(cls.talentProgression || 'high'), cl.level);
    if (!grantedFirstBonus) {
      total += 2;
      grantedFirstBonus = true;
    }
  }
  return total;
}

// Universal talents (Champions of the Spheres): a shared pool that can be
// spent on EITHER a magic talent or a combat talent, from classes like
// Sage and Prodigy. Sage is confirmed Low progression (1st level and every
// 2 levels thereafter) and does NOT get the usual +2 bonus for a first
// casting class level - both flagged per-class since they're documented
// exceptions, not guesses.
export function universalTalentsGained(classLevels, classesById) {
  let total = 0;
  let grantedFirstBonus = false;
  for (const cl of classLevels) {
    const cls = classesById[cl.classId];
    if (!cls || cls.system !== 'champion') continue;
    const tier = cls.talentProgression || 'high';
    if (tier === 'virtuoso') {
      total += cl.level + Math.floor(cl.level / 4);
    } else {
      total += babAtLevel(progressionRate(tier), cl.level);
    }
    if (cls.bonusTalentEvery) {
      total += Math.ceil(cl.level / cls.bonusTalentEvery);
    }
    if (!grantedFirstBonus && cls.grantsFirstCasterBonus !== false) {
      total += 2;
      grantedFirstBonus = true;
    }
  }
  return total;
}

// Skill talents (Spheres of Guile): talent gain is actually split into
// "Any" and "Utility" sub-tracks, but the net effect per Operative Type is
// well-defined: Journeyman totals exactly 1/level (same as the standard
// "high" tier), while Virtuoso is stronger - its Any column alone reaches
// 15 by level 20 (vs Journeyman's ~10), with Utility matching Journeyman's
// rate. Approximated here as level + floor(level/4) for Virtuoso, which
// lands on the confirmed 20th-level figure; this is a simplification of
// the real two-track table, not an exact per-level match.
export function skillTalentsGained(classLevels, classesById) {
  let total = 0;
  let grantedFirstBonus = false;
  for (const cl of classLevels) {
    const cls = classesById[cl.classId];
    if (!cls || cls.system !== 'guile') continue;
    const tier = cls.talentProgression || 'high';
    if (tier === 'virtuoso') {
      total += cl.level + Math.floor(cl.level / 4);
    } else {
      total += babAtLevel(progressionRate(tier), cl.level);
    }
    if (!grantedFirstBonus) {
      total += 2;
      grantedFirstBonus = true;
    }
  }
  return total;
}
