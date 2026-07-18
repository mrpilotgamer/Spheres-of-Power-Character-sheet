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
import { collectBonuses, collectCombined, collectMany, stackEffects } from './modifiers.js';
import skillsData from '../data/skills.json';
import conditionsData from '../data/conditions.json';
import {
  fixedSkills,
  placeholdersByFamily,
  customSkillEntry,
  isClassSkill,
  skillTotal,
  skillPointsBudget
} from './skills.js';

const MENTAL = ['int', 'wis', 'cha'];

// Static condition library (src/data/conditions.json). Guarded so the module
// still loads if the data file is momentarily absent or empty. Each entry is
// { id, name, description, effects: [{ target, type, value }] } — the effects
// use the same shape as a modifier source, so an active condition is treated as
// an always-on modifier source in computeSheet.
const CONDITIONS = conditionsData || [];

// PF1e size modifier to AC and attack rolls (Table: Size Modifiers). CMB/CMD
// use the "special size modifier", which is the inverse of this value.
export const SIZE_MODS = {
  fine: 8,
  diminutive: 4,
  tiny: 2,
  small: 1,
  medium: 0,
  large: -1,
  huge: -2,
  gargantuan: -4,
  colossal: -8
};

// Pure derived-stats pipeline. Takes a character (schema in newCharacter.js)
// and returns every stat CharacterSheet.jsx used to compute inline. UI
// components call this once and render the result; they do no math themselves.
//
// opts.classesById overrides the class table (defaults to the merged loader).
export function computeSheet(character, opts = {}) {
  const classesById = opts.classesById || defaultClassesById;

  // Active conditions (character.conditions: array of ids) resolve to modifier
  // sources appended to the enabled `modifiers`. Conditions can't be toggled
  // individually — presence in the array means active. Unknown ids are skipped.
  const conditionSources = (character.conditions || [])
    .map((cid) => CONDITIONS.find((c) => c && c.id === cid))
    .filter(Boolean)
    .map((c) => ({
      id: `condition:${c.id}`,
      name: c.name,
      enabled: true,
      effects: c.effects || []
    }));

  // Sources contribute unless explicitly disabled (missing `enabled` counts as
  // on), matching modifiers.js's activeSources() semantics. Old saves have no
  // `modifiers` field. Active conditions are always-on sources appended here.
  const sources = [
    ...(character.modifiers || []).filter((s) => s && s.enabled !== false),
    ...conditionSources
  ];

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

  // ---- Stage 2: skills, AC, CMB/CMD, init, speed, weapons ----

  // Size modifiers. AC/attack use SIZE_MODS; CMB/CMD use its inverse.
  const size = SIZE_MODS[character.size] != null ? character.size : 'medium';
  const sizeMod = SIZE_MODS[size];
  const specialSizeMod = -sizeMod;

  // Defense inputs with graceful defaults for old saves.
  const def = character.defense || {};
  const armorBonus = def.armorBonus || 0;
  const shieldBonus = def.shieldBonus || 0;
  const naturalArmor = def.naturalArmor || 0;
  const deflection = def.deflection || 0;
  const dodgeMisc = def.dodgeMisc || 0;
  const miscAc = def.miscAc || 0;
  const maxDex = def.maxDex == null ? null : def.maxDex;
  const acp = def.acp || 0; // stored positive; a penalty
  const dexToAc = maxDex == null ? mods.dex : Math.min(mods.dex, maxDex);

  // Raw `ac`-target effects, so we can split by type for touch/flat-footed.
  const acEffects = [];
  for (const src of sources) {
    for (const eff of src.effects || []) {
      if (eff.target === 'ac') acEffects.push(eff);
    }
  }
  const NON_TOUCH_TYPES = new Set(['armor', 'shield', 'natural_armor']);
  // The manual defense inputs are typed bonuses: seed them into the same
  // stack as `ac` effects so e.g. worn armor and Mage Armor (both armor
  // bonuses) take the higher value instead of summing (PF1e stacking).
  const acSeeds = [
    { type: 'armor', value: armorBonus },
    { type: 'shield', value: shieldBonus },
    { type: 'natural_armor', value: naturalArmor },
    { type: 'deflection', value: deflection }
  ].filter((e) => e.value !== 0);
  const acEffTotal = stackEffects([...acSeeds, ...acEffects]);
  const acEffTouch = stackEffects(
    [...acSeeds, ...acEffects].filter((e) => !NON_TOUCH_TYPES.has(e.type || 'untyped'))
  );
  const acEffNoDodge = stackEffects(
    [...acSeeds, ...acEffects].filter((e) => (e.type || 'untyped') !== 'dodge')
  );
  // PF1e RAW: circumstance, deflection, dodge, insight, luck, morale, profane,
  // and sacred bonuses to AC also apply to CMD; penalties to AC always apply to
  // CMD regardless of type. Armor/shield/natural/enhancement/competence/size
  // (etc.) positive AC bonuses do NOT reach CMD.
  const CMD_AC_TYPES = new Set([
    'circumstance', 'deflection', 'dodge', 'insight', 'luck', 'morale', 'profane', 'sacred'
  ]);
  const acEffCmd = stackEffects(
    [...acSeeds, ...acEffects].filter((e) => {
      const value = e.value || 0;
      if (value < 0) return true; // AC penalties always apply to CMD
      return CMD_AC_TYPES.has(e.type || 'untyped');
    })
  );
  const acTouchExtra = collectBonuses(sources, 'ac.touch');
  const acFlatExtra = collectBonuses(sources, 'ac.flatFooted');

  const acTotals = {
    // Full AC: everything applies.
    ac: 10 + dodgeMisc + miscAc + dexToAc + sizeMod + acEffTotal,
    // Touch: drop armor/shield/natural; keep dex, dodge, deflection, size, misc.
    touch: 10 + dodgeMisc + miscAc + dexToAc + sizeMod + acEffTouch + acTouchExtra,
    // Flat-footed: drop dex and all dodge bonuses.
    flatFooted: 10 + miscAc + sizeMod + acEffNoDodge + acFlatExtra
  };

  const init = mods.dex + (character.initiativeMisc || 0) + bonuses.init;

  const cmb = bab + mods.str + specialSizeMod + bonuses.cmb;
  const cmd = 10 + bab + mods.str + dexToAc + specialSizeMod + bonuses.cmd +
              acEffCmd + dodgeMisc;

  const speed = (character.speed || 30) + bonuses.speed;

  // Skills. Fixed skills (minus family placeholders) + custom instances.
  const classSkillStrings = [];
  for (const cl of classLevels) {
    const cls = classesById[cl.classId];
    for (const s of (cls && cls.classSkills) || []) classSkillStrings.push(s);
  }
  const placeholders = placeholdersByFamily(skillsData);
  const skillEntries = [
    ...fixedSkills(skillsData),
    ...(character.customSkills || []).map((c) => customSkillEntry(c, placeholders))
  ];
  const charSkills = character.skills || {};
  const skills = skillEntries.map((entry) => {
    const state = charSkills[entry.id] || {};
    const classSkill = state.classSkillOverride === true || isClassSkill(entry, classSkillStrings);
    const { total, acpApplied, unusable } = skillTotal({
      entry,
      ranks: state.ranks || 0,
      misc: state.misc || 0,
      abilityMod: mods[entry.ability] ?? 0,
      classSkill,
      // `skill.all` effects apply to every skill row; pool them with this
      // skill's own `skill.<id>` effects into one stack (normal typed rules).
      effectBonus: collectCombined(sources, ['skill.all', `skill.${entry.id}`]),
      acp
    });
    return {
      id: entry.id,
      name: entry.name,
      ability: entry.ability,
      total,
      ranks: state.ranks || 0,
      misc: state.misc || 0,
      classSkill,
      acpApplied,
      unusable,
      trainedOnly: !!entry.trainedOnly
    };
  });
  const skillPoints = {
    budget: skillPointsBudget(classLevels, classesById, mods.int, character.skillPointsMisc || 0),
    spent: skills.reduce((sum, s) => sum + (s.ranks || 0), 0)
  };

  // Weapons. To-hit = each iterative + ability mod + size + attackMisc + effects.
  // Damage bonus = floor(abilityMod x damageMult) + damageMisc + effects.
  const weapons = (character.weapons || []).map((w) => {
    const atkAbility = w.attackAbility === 'dex' ? 'dex' : 'str';
    const atkMod = mods[atkAbility] ?? 0;
    const toHit = atkMod + sizeMod + (w.attackMisc || 0) + bonuses.attack;
    const dmgAbilityMod = w.damageAbility === 'none' ? 0 : (mods[w.damageAbility] ?? mods.str ?? 0);
    const mult = w.damageMult || 1;
    const dmgBonus = Math.floor(dmgAbilityMod * mult) + (w.damageMisc || 0) + bonuses.damage;
    const dice = w.damageDice || '';
    const damage = dmgBonus === 0
      ? dice
      : `${dice}${dmgBonus > 0 ? '+' : ''}${dmgBonus}`;
    return {
      id: w.id,
      name: w.name,
      attacks: attacks.map((a) => a + toHit),
      damage,
      attackAbility: atkAbility,
      attackMisc: w.attackMisc || 0,
      damageDice: dice,
      damageAbility: w.damageAbility || 'str',
      damageMult: mult,
      damageMisc: w.damageMisc || 0,
      notes: w.notes || ''
    };
  });

  // ---- Stage 3: play state (mutable at-the-table resources) ----
  // hpCurrent missing (undefined/null) means an untouched save that starts at
  // full HP; an explicit 0 is a downed character and stays 0.
  const hpMax = character.hpMax || 0;
  const hpCurrent = character.hpCurrent == null ? hpMax : character.hpCurrent;
  const hpNonlethal = character.hpNonlethal || 0;

  // Spell points: max is the computed pool; `spellPointsSpent` is drawn down.
  const spMax = pool;
  const spSpent = character.spellPointsSpent || 0;

  // Martial focus: missing current means an untouched save that starts focused
  // (full); otherwise clamp the stored value into [0, max].
  const mfMax = character.martialFocusMax || 0;
  const mfRaw = character.martialFocusCurrent == null ? mfMax : character.martialFocusCurrent;

  // Generic resource trackers, passed through with `current` clamped to [0, max].
  const trackers = (character.trackers || []).map((t) => {
    const max = t.max || 0;
    return { id: t.id, name: t.name, max, current: Math.max(0, Math.min(max, t.current || 0)) };
  });

  const play = {
    hp: { max: hpMax, current: hpCurrent, nonlethal: hpNonlethal },
    spellPoints: { max: spMax, spent: spSpent, remaining: Math.max(0, spMax - spSpent) },
    martialFocus: { max: mfMax, current: Math.max(0, Math.min(mfMax, mfRaw)) },
    trackers
  };

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
    },
    // Stage 2 assembled stats.
    size,
    acp,
    acTotals,
    init,
    cmb,
    cmd,
    speed,
    skills,
    skillPoints,
    weapons,
    // Stage 3 play state.
    play
  };
}
