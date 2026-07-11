export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function abilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function finalScore(baseScore, raceMod = 0, chosenBonus = 0) {
  return baseScore + raceMod + chosenBonus;
}

export function finalScores(baseScores, race, chosenBonusAbility) {
  const result = {};
  for (const key of ABILITY_KEYS) {
    const raceMod = race?.abilityMods?.[key] || 0;
    const chosen = race?.abilityNote && chosenBonusAbility === key ? 2 : 0;
    result[key] = finalScore(baseScores[key] ?? 10, raceMod, chosen);
  }
  return result;
}

export function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
