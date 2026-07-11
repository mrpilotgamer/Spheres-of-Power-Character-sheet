import { newCharacterId } from './storage.js';

export function blankCharacter() {
  return {
    id: newCharacterId(),
    name: '',
    playerName: '',
    raceId: 'human',
    chosenBonusAbility: 'str',
    alignment: '',
    deity: '',
    baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    classLevels: [{ classId: '', level: 1 }],
    castingAbilityOverride: null,
    hpMax: 0,
    hpCurrent: 0,
    armorClass: 10,
    spheresKnown: [],
    talentsKnown: [], // { sphereId, talentId }
    notes: ''
  };
}
