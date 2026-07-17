import { classesById as defaultClassesById } from './classLoader.js';
import { ABILITY_KEYS, abilityModifier, finalScores } from './abilities.js';
import {
  babAtLevel,
  attacksFromBab,
  savesAtLevel,
  totalCasterLevel,
  totalCasterClassLevels,
  spellPoints,
  sphereDC,
  magicSkillBonus,
  magicSkillDefense
} from './progression.js';
import { collectBonuses, collectMany } from './modifiers.js';

const MENTAL = ['int', 'wis', 'cha'];

// Pure derived-stats pipeline. Takes a character (schema in newCharacter.js)
// and returns every stat CharacterSheet.jsx used to compute inline. UI
// components call this once and render the result; they do no math themselves.
//
// opts.classesById overrides the class table (defaults to the merged loader).
export function computeSheet(character, opts = {}) {
  const classesById = opts.classesById || defaultClassesById;

  // Only enabled sources contribute; old saves have no `modifiers` field.
  const sources = (character.modifiers || []).filter((s) => s && s.enabled === true);

  // Final ability scores: base + flat abilityMods + `ability.*` modifier effects.
  const abilityMods = character.abilityMods || {};
  const withMods = finalScores(character.baseAbilities, abilityMods);
  const abilityBonus = collectMany(sources, ABILITY_KEYS.map((k) => `ability.${k}`));
  const scores = {};
  for (const k of ABILITY_KEYS) scores[k] = withMods[k] + abilityBonus[`ability.${k}`];
  const mods = Object.fromEntries(ABILITY_KEYS.map((k) => [k, abilityModifier(scores[k])]));

  const classLevels = (character.classLevels || []).filter((cl) => cl.classId);
  const totalLevel = classLevels.reduce((s, cl) => s + (cl.level || 0), 0);

  // Total levels grouped by system (used for the might/guile/caster UI blocks).
  const levelsBySystem = { power: 0, might: 0, guile: 0, champion: 0 };
  for (const cl of classLevels) {
    const system = classesById[cl.classId]?.system;
    if (system && levelsBySystem[system] != null) levelsBySystem[system] += cl.level || 0;
  }
  const mightLevels = classLevels.filter((cl) => classesById[cl.classId]?.system === 'might');
  const guileLevels = classLevels.filter((cl) => classesById[cl.classId]?.system === 'guile');

  // BAB stacks across all classes (PF multiclassing). Iteratives come from BAB.
  const bab = classLevels.reduce(
    (s, cl) => s + babAtLevel(classesById[cl.classId]?.babType || 'half', cl.level),
    0
  );
  const attacks = attacksFromBab(bab);

  // Saves: sum each class's progression (best-progression stacking), then add
  // the governing ability mod and any `save.*` modifier effects.
  const baseSaves = { fort: 0, ref: 0, will: 0 };
  for (const cl of classLevels) {
    const cls = classesById[cl.classId];
    if (!cls) continue;
    const s = savesAtLevel(cls.goodSaves, cl.level);
    baseSaves.fort += s.fort;
    baseSaves.ref += s.ref;
    baseSaves.will += s.will;
  }
  const saveBonus = collectMany(sources, ['save.fort', 'save.ref', 'save.will']);
  const saves = {
    fort: baseSaves.fort + mods.con + saveBonus['save.fort'],
    ref: baseSaves.ref + mods.dex + saveBonus['save.ref'],
    will: baseSaves.will + mods.wis + saveBonus['save.will']
  };

  const casterClassLevels = totalCasterClassLevels(classLevels, classesById);
  const casterLevel = totalCasterLevel(classLevels, classesById) + collectBonuses(sources, 'casterLevel');
  const primaryCasterClass = classLevels
    .map((cl) => classesById[cl.classId])
    .find((c) => c && c.casterType && c.casterType !== 'none') || null;

  // Casting mode. 'standard' (official SoP): one casting ability drives both the
  // spell pool and sphere DC. 'house' (this table's default): INT drives the
  // pool, the highest mental mod drives the DC, WIS/CHA are surfaced as notes.
  const castingRules = character.castingRules === 'standard' ? 'standard' : 'house';
  let castingAbility, poolAbilityMod, dcAbilityMod;
  if (castingRules === 'standard') {
    castingAbility = MENTAL.includes(character.castingAbility) ? character.castingAbility : 'int';
    poolAbilityMod = mods[castingAbility];
    dcAbilityMod = mods[castingAbility];
  } else {
    castingAbility = 'int';
    poolAbilityMod = mods.int;
    dcAbilityMod = Math.max(mods.int, mods.wis, mods.cha);
  }
  const pool = spellPoints(casterClassLevels, poolAbilityMod);
  const dc = sphereDC(casterLevel, dcAbilityMod);
  const msb = magicSkillBonus(casterClassLevels);
  const msd = magicSkillDefense(msb);

  // Combat sphere DC = 10 + 1/2 BAB + practitioner mod. Multiclassing into more
  // than one practitioner class uses the higher modifier.
  const practitionerAbility = character.practitionerAbilityOverride || 'wis';
  const practitionerModFor = (cls) =>
    cls?.practitionerAbility === 'higher_cha_int'
      ? Math.max(mods.cha, mods.int)
      : cls?.practitionerAbility === 'choice'
        ? (mods[practitionerAbility] ?? 0)
        : (mods[cls?.practitionerAbility] ?? 0);
  const mightClassList = mightLevels.map((cl) => classesById[cl.classId]).filter(Boolean);
  const practitionerMod = mightClassList.length
    ? Math.max(...mightClassList.map(practitionerModFor))
    : 0;
  const primaryMightClass = mightClassList[0] || null;
  const combatSphereDC = 10 + Math.floor(bab / 2) + practitionerMod;

  // Skill (Guile) sphere: operative modifier from the chosen ability.
  const operativeAbility = character.operativeAbilityOverride || 'wis';
  const operativeMod = mods[operativeAbility] ?? 0;
  const primaryGuileClass = guileLevels.map((cl) => classesById[cl.classId]).find(Boolean) || null;

  // Modifier totals for stats this stage does not yet fully assemble (init,
  // CMB/CMD, speed, and to-hit/damage adjustments). Stage 2 combines these with
  // BAB/ability mods; exposed here so components never re-collect them.
  const bonuses = collectMany(sources, ['init', 'cmb', 'cmd', 'speed', 'attack', 'damage']);

  return {
    castingRules,
    abilities: { scores, mods },
    totalLevel,
    classLevels,
    levelsBySystem,
    bab,
    attacks,
    attackBonus: bonuses.attack,
    damageBonus: bonuses.damage,
    saves,
    baseSaves,
    casting: {
      casterClassLevels,
      casterLevel,
      spellPoints: pool,
      sphereDC: dc,
      msb,
      msd,
      castingAbility,   // ability driving the spell pool (and DC in 'standard')
      poolAbilityMod,
      dcAbilityMod,
      wisMod: mods.wis, // house-rule: duration/target note
      chaMod: mods.cha, // house-rule: damage/healing note
      primaryCasterClass
    },
    combat: {
      practitionerMod,
      combatSphereDC,
      practitionerAbility,
      mightClassCount: mightClassList.length,
      primaryMightClass
    },
    operative: {
      operativeMod,
      operativeAbility,
      primaryGuileClass
    },
    bonuses: {
      init: bonuses.init,
      cmb: bonuses.cmb,
      cmd: bonuses.cmd,
      speed: bonuses.speed
    }
  };
}
