// Pathfinder 1e skill rules. Pure JS, no React.
//
// Skill entries come from src/data/skills.json with the shape:
//   { id, name, ability, acp, trainedOnly, family }
// `family` is one of "Craft" | "Knowledge" | "Perform" | "Profession" or null.
// Knowledge ships all 10 fixed subskills as concrete entries; Craft/Perform/
// Profession ship a single placeholder entry each that the user instantiates
// with custom names (customSkills). See docs/engine.md (Stage 2).

// Families whose single skills.json entry is a placeholder to be instantiated,
// not a skill in its own right. Knowledge is NOT here: its entries are concrete.
// Artistry and Lore (Pathfinder Unchained, Int-based) follow the same
// Craft-style instantiation pattern.
export const PLACEHOLDER_FAMILIES = new Set(['Craft', 'Perform', 'Profession', 'Lore', 'Artistry']);

// Concrete fixed skills to display: everything in skills.json except the
// Craft/Perform/Profession placeholders.
export function fixedSkills(skillsData) {
  return (skillsData || []).filter((s) => s && !PLACEHOLDER_FAMILIES.has(s.family));
}

// Map family name -> placeholder entry, used to resolve a custom Craft/Perform/
// Profession instance's ability/acp/trainedOnly.
export function placeholdersByFamily(skillsData) {
  const map = {};
  for (const s of skillsData || []) {
    if (s && PLACEHOLDER_FAMILIES.has(s.family)) map[s.family] = s;
  }
  return map;
}

// Build a synthetic skill entry for a user-instantiated custom skill
// ({ id, family, name }), inheriting ability/acp/trainedOnly from its family
// placeholder. Falls back to sane defaults if the placeholder is missing.
export function customSkillEntry(custom, placeholders) {
  const base = placeholders[custom.family] || {};
  return {
    id: custom.id,
    name: custom.name || base.name || custom.family || custom.id,
    ability: base.ability || 'int',
    acp: base.acp === true,
    trainedOnly: base.trainedOnly === true,
    family: custom.family || base.family || null
  };
}

// Does a skill count as a class skill given a class's classSkills display
// strings? Matches on exact name, bare family name (e.g. "Craft" matches every
// Craft instance), or "<Family> (all)" (e.g. "Knowledge (all)" matches every
// Knowledge subskill). `classSkillStrings` should already be the union across
// all of a character's classes (PF1e multiclass class-skill rule).
export function isClassSkill(skillEntry, classSkillStrings) {
  if (!skillEntry) return false;
  const family = skillEntry.family;
  for (const raw of classSkillStrings || []) {
    if (typeof raw !== 'string') continue;
    const str = raw.trim();
    if (str === skillEntry.name) return true;
    if (family) {
      if (str === family) return true;
      if (str === `${family} (all)`) return true;
    }
  }
  return false;
}

// Compute a single skill's total and status flags.
//   total = ranks + abilityMod + (3 if class skill AND ranks > 0)
//           + misc + effectBonus (stacked `skill.<id>` effects)
//           - acp (only when the skill has acp:true; `acp` is a positive number)
// Trained-only skills with 0 ranks still return a number but flag unusable.
export function skillTotal({
  entry,
  ranks = 0,
  misc = 0,
  abilityMod = 0,
  classSkill = false,
  effectBonus = 0,
  acp = 0
}) {
  const r = ranks || 0;
  const classBonus = classSkill && r > 0 ? 3 : 0;
  const acpApplied = entry && entry.acp ? (acp || 0) : 0;
  const total = r + abilityMod + classBonus + (misc || 0) + (effectBonus || 0) - acpApplied;
  const unusable = !!(entry && entry.trainedOnly) && r <= 0;
  return { total, classSkill: !!classSkill, acpApplied, unusable };
}

// Skill-point budget: per class, max(1, skillsPerLevel + intMod) x level, summed
// across all classes, plus a flat miscBonus (human FCB, favored-class points,
// etc.). classLevels is [{ classId, level }]; classesById provides skillsPerLevel.
export function skillPointsBudget(classLevels, classesById, intMod = 0, miscBonus = 0) {
  let total = 0;
  for (const cl of classLevels || []) {
    if (!cl || !cl.classId) continue;
    const spl = classesById?.[cl.classId]?.skillsPerLevel || 0;
    const perLevel = Math.max(1, spl + (intMod || 0));
    total += perLevel * (cl.level || 0);
  }
  return total + (miscBonus || 0);
}
