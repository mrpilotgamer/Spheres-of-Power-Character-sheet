import { describe, it, expect } from 'vitest';
import { ABILITY_KEYS, abilityModifier, finalScores, formatMod } from './abilities.js';

describe('abilityModifier', () => {
  it('is 0 for scores 10 and 11', () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
  });

  it('is -2 for a score of 7', () => {
    expect(abilityModifier(7)).toBe(-2);
  });

  it('is +4 for a score of 18', () => {
    expect(abilityModifier(18)).toBe(4);
  });
});

describe('finalScores', () => {
  it('merges base scores with ability mods per key', () => {
    const baseScores = { str: 16, dex: 14, con: 12, int: 10, wis: 8, cha: 6 };
    const abilityMods = { str: 2, dex: 0 };
    expect(finalScores(baseScores, abilityMods)).toEqual({
      str: 18,
      dex: 14,
      con: 12,
      int: 10,
      wis: 8,
      cha: 6
    });
  });

  it('defaults missing base scores to 10 and missing mods to 0', () => {
    const result = finalScores({}, {});
    for (const key of ABILITY_KEYS) {
      expect(result[key]).toBe(10);
    }
  });

  it('tolerates a missing/undefined abilityMods argument', () => {
    const result = finalScores({ str: 15 }, undefined);
    expect(result.str).toBe(15);
    expect(result.dex).toBe(10);
  });
});

describe('formatMod', () => {
  it('adds a leading + for zero and positive values', () => {
    expect(formatMod(0)).toBe('+0');
    expect(formatMod(5)).toBe('+5');
  });

  it('leaves the sign as-is for negative values', () => {
    expect(formatMod(-3)).toBe('-3');
  });
});
