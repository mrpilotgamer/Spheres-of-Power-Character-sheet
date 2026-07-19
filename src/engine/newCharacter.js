import { newCharacterId } from './storage.js';

export function blankCharacter() {
  return {
    id: newCharacterId(),
    name: '',
    playerName: '',
    race: '',
    alignment: '',
    deity: '',
    baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    racialTraits: [], // { id, name, description }
    classLevels: [{ classId: '', level: 1 }],
    hpMax: 0,
    hpCurrent: null, // null = untouched save; computeSheet treats missing as "start at max"
    hpNonlethal: 0,
    armorClass: 10,
    customSpheres: [], // { id, name, tagline, talents: [{ id, name, description }] }
    customCombatSpheres: [],
    customSkillSpheres: [],
    customEquipment: [],
    martialFocusMax: 1,
    operativeAbilityOverride: null,
    // Stage 3 play state. computeSheet supplies defaults, so old saves are fine.
    spellPointsSpent: 0,
    martialFocusCurrent: 1,
    trackers: [], // generic at-the-table counters: { id, name, max, current }
    conditions: [], // active condition ids; looked up in src/data/conditions.json
    practitionerAbilityOverride: null,
    castingRules: 'house', // 'house' (three mental stats) | 'standard' (one casting ability)
    castingAbility: 'int', // int | wis | cha — used only when castingRules === 'standard'
    // Stage 7: casting tradition. The tradition's casting ability reuses the
    // castingAbility field above; this object holds only drawbacks/boons/misc.
    // Missing on old saves — computeSheet treats absence as all-zeros (no change).
    castingTradition: {
      name: '',
      drawbacks: [], // { id, name, description, countsAsTwo: false }
      boons: [], // { id, name, description }
      bonusSpellPointsMisc: 0
    },
    modifiers: [], // typed-bonus modifier sources; see src/engine/modifiers.js
    classFeatures: [], // { id, name, description }
    feats: [],
    // Stage 2: skills & combat. See docs/engine.md. computeSheet supplies
    // graceful defaults for every field below, so old saves never need migration.
    skills: {}, // skill id -> { ranks, misc, classSkillOverride }
    customSkills: [], // user-instantiated Craft/Perform/Profession: { id, family, name }
    skillPointsMisc: 0, // extra skill points (human, FCB, etc.)
    size: 'medium',
    defense: {
      armorBonus: 0,
      shieldBonus: 0,
      naturalArmor: 0,
      deflection: 0,
      dodgeMisc: 0,
      miscAc: 0,
      maxDex: null, // armor's max Dex bonus; null = uncapped
      acp: 0 // armor check penalty, stored positive; applied as a penalty
    },
    initiativeMisc: 0,
    speed: 30,
    weapons: [], // { id, name, attackAbility, attackMisc, damageDice, damageAbility, damageMult, damageMisc, notes }
    notes: '',
    backstory: ''
  };
}
