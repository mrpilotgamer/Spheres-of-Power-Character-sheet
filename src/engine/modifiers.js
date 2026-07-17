// Pathfinder 1e typed-bonus stacking engine. Pure JS, no React.
//
// A modifier source is: { id, name, enabled, effects: [{ target, type, value }] }.
// `target` is a stat key (see docs/engine.md for the full list), `type` is one
// of BONUS_TYPES, `value` is a signed integer.

// All PF1e bonus types.
export const BONUS_TYPES = [
  'alchemical', 'armor', 'circumstance', 'competence', 'deflection', 'dodge',
  'enhancement', 'inherent', 'insight', 'luck', 'morale', 'natural_armor',
  'profane', 'racial', 'resistance', 'sacred', 'shield', 'size', 'trait',
  'untyped'
];

// Bonuses of these types stack with themselves; every other type contributes
// only its single highest bonus. Penalties (negative values) always stack,
// regardless of type. (PF1e Core: Combining Magical Effects / bonus types.)
export const STACKING_TYPES = new Set(['dodge', 'circumstance', 'untyped']);

// A source is inactive only when explicitly disabled; a missing `enabled` is
// treated as on so hand-built sources without the flag still apply.
function activeSources(sources) {
  return (sources || []).filter((s) => s && s.enabled !== false);
}

// Stack a flat list of { type, value } effects into a single signed total,
// applying the typed-bonus rules above.
export function stackEffects(effects) {
  let total = 0;
  const bestByType = {}; // highest positive bonus seen per non-stacking type
  for (const eff of effects || []) {
    const value = eff.value || 0;
    if (value < 0) {
      total += value; // penalties always stack
      continue;
    }
    const type = eff.type || 'untyped';
    if (STACKING_TYPES.has(type)) {
      total += value;
    } else {
      bestByType[type] = Math.max(bestByType[type] ?? 0, value);
    }
  }
  for (const type in bestByType) total += bestByType[type];
  return total;
}

// Stacked signed total of every enabled effect aimed at a single target.
export function collectBonuses(sources, target) {
  const effects = [];
  for (const source of activeSources(sources)) {
    for (const eff of source.effects || []) {
      if (eff.target === target) effects.push(eff);
    }
  }
  return stackEffects(effects);
}

// Stacked signed total of every enabled effect whose target is any of
// `targets`, pooled into ONE stack (unlike collectMany, which stacks each
// target independently). Use when several target keys should combine under a
// single set of typed-stacking rules — e.g. `skill.all` + `skill.<id>` for one
// skill row, where a competence bonus to all skills and a competence bonus to
// that specific skill must not both count.
export function collectCombined(sources, targets) {
  const wanted = targets instanceof Set ? targets : new Set(targets);
  const effects = [];
  for (const source of activeSources(sources)) {
    for (const eff of source.effects || []) {
      if (wanted.has(eff.target)) effects.push(eff);
    }
  }
  return stackEffects(effects);
}

// Stack several targets in one pass over the sources. Returns a map keyed by
// target; each target stacks independently of the others.
export function collectMany(sources, targets) {
  const buckets = {};
  for (const t of targets) buckets[t] = [];
  for (const source of activeSources(sources)) {
    for (const eff of source.effects || []) {
      if (buckets[eff.target]) buckets[eff.target].push(eff);
    }
  }
  const result = {};
  for (const t of targets) result[t] = stackEffects(buckets[t]);
  return result;
}
