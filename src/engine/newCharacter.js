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
    hpCurrent: 0,
    armorClass: 10,
    customSpheres: [], // { id, name, tagline, talents: [{ id, name, description }] }
    customCombatSpheres: [],
    customSkillSpheres: [],
    martialFocusMax: 1,
    operativeAbilityOverride: null,
    practitionerAbilityOverride: null,
    notes: ''
  };
}
