export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function abilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function finalScores(baseScores = {}, abilityMods) {
  const result = {};
  for (const key of ABILITY_KEYS) {
    result[key] = (baseScores?.[key] ?? 10) + (abilityMods?.[key] ?? 0);
  }
  return result;
}

export function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
