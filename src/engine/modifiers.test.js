import { describe, it, expect } from 'vitest';
import { BONUS_TYPES, STACKING_TYPES, stackEffects, collectBonuses, collectMany } from './modifiers.js';

describe('BONUS_TYPES / STACKING_TYPES', () => {
  it('exports the stacking types as a subset of the known bonus types', () => {
    for (const type of STACKING_TYPES) {
      expect(BONUS_TYPES).toContain(type);
    }
  });
});

describe('stackEffects', () => {
  it('non-stacking types (e.g. enhancement) contribute only their highest bonus', () => {
    expect(stackEffects([
      { type: 'enhancement', value: 2 },
      { type: 'enhancement', value: 3 }
    ])).toBe(3);
  });

  it('dodge bonuses stack with themselves', () => {
    expect(stackEffects([
      { type: 'dodge', value: 1 },
      { type: 'dodge', value: 1 }
    ])).toBe(2);
  });

  it('untyped bonuses stack with themselves', () => {
    expect(stackEffects([
      { type: 'untyped', value: 1 },
      { type: 'untyped', value: 2 }
    ])).toBe(3);
  });

  it('circumstance bonuses stack with themselves', () => {
    expect(stackEffects([
      { type: 'circumstance', value: 1 },
      { type: 'circumstance', value: 2 }
    ])).toBe(3);
  });

  it('penalties of the same type always stack (never take-the-best)', () => {
    expect(stackEffects([
      { type: 'enhancement', value: -2 },
      { type: 'enhancement', value: -1 }
    ])).toBe(-3);
  });

  it('penalties stack alongside positive bonuses of the same type', () => {
    // Best +3 enhancement bonus, plus both penalties always apply: 3 - 2 - 1 = 0.
    expect(stackEffects([
      { type: 'enhancement', value: 2 },
      { type: 'enhancement', value: 3 },
      { type: 'enhancement', value: -2 },
      { type: 'enhancement', value: -1 }
    ])).toBe(0);
  });

  it('defaults a missing type to untyped (stacking)', () => {
    expect(stackEffects([{ value: 1 }, { value: 1 }])).toBe(2);
  });

  it('different non-stacking types each contribute their own best bonus', () => {
    expect(stackEffects([
      { type: 'enhancement', value: 2 },
      { type: 'insight', value: 1 }
    ])).toBe(3);
  });

  it('returns 0 for an empty or missing effects list', () => {
    expect(stackEffects([])).toBe(0);
    expect(stackEffects(undefined)).toBe(0);
  });
});

describe('collectBonuses', () => {
  const sources = [
    {
      id: 'ring', name: 'Ring of Protection', enabled: true,
      effects: [{ target: 'ac', type: 'deflection', value: 1 }]
    },
    {
      id: 'shield-spell', name: 'Shield', enabled: true,
      effects: [{ target: 'ac', type: 'deflection', value: 4 }]
    },
    {
      id: 'unused', name: 'Unused item', enabled: false,
      effects: [{ target: 'ac', type: 'deflection', value: 10 }]
    }
  ];

  it('sums only enabled sources aimed at the requested target', () => {
    // Deflection doesn't stack with itself: best of +1/+4 = +4. The disabled
    // +10 source must not be counted.
    expect(collectBonuses(sources, 'ac')).toBe(4);
  });

  it('a source is excluded by disabling it (enabled === false), not by any other flag', () => {
    const withoutDisabled = sources.filter((s) => s.id !== 'unused');
    expect(collectBonuses(withoutDisabled, 'ac')).toBe(collectBonuses(sources, 'ac'));
  });

  it('a source with enabled left undefined still contributes', () => {
    const noFlag = [{ id: 'x', name: 'X', effects: [{ target: 'ac', type: 'insight', value: 2 }] }];
    expect(collectBonuses(noFlag, 'ac')).toBe(2);
  });

  it('ignores effects aimed at other targets', () => {
    expect(collectBonuses(sources, 'save.will')).toBe(0);
  });
});

describe('collectMany', () => {
  it('collects several targets in one pass, each stacking independently', () => {
    const sources = [
      {
        id: 'a', enabled: true,
        effects: [
          { target: 'init', type: 'dodge', value: 1 },
          { target: 'cmb', type: 'enhancement', value: 2 }
        ]
      },
      {
        id: 'b', enabled: true,
        effects: [
          { target: 'init', type: 'dodge', value: 1 },
          { target: 'cmb', type: 'enhancement', value: 3 },
          { target: 'cmd', type: 'untyped', value: -1 }
        ]
      },
      {
        id: 'c', enabled: false,
        effects: [{ target: 'init', type: 'dodge', value: 5 }]
      }
    ];

    expect(collectMany(sources, ['init', 'cmb', 'cmd', 'speed'])).toEqual({
      init: 2,   // two stacking dodge bonuses, disabled source excluded
      cmb: 3,    // best of the two enhancement bonuses
      cmd: -1,   // penalty always applies
      speed: 0   // no effects target this key
    });
  });
});
