import { useState } from 'react';
import { BONUS_TYPES } from '../engine/modifiers.js';
import buffLibrary from '../data/buffLibrary.json';

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// Fixed (non-skill) target keys and their display labels. Skill targets are
// appended at render time from sheet.skills so custom skills show up too.
const FIXED_TARGET_GROUPS = [
  {
    label: 'Ability',
    targets: [
      ['ability.str', 'Strength'],
      ['ability.dex', 'Dexterity'],
      ['ability.con', 'Constitution'],
      ['ability.int', 'Intelligence'],
      ['ability.wis', 'Wisdom'],
      ['ability.cha', 'Charisma']
    ]
  },
  {
    label: 'Defense',
    targets: [
      ['ac', 'AC'],
      ['ac.touch', 'Touch AC'],
      ['ac.flatFooted', 'Flat-footed AC']
    ]
  },
  {
    label: 'Saves',
    targets: [
      ['save.fort', 'Fortitude'],
      ['save.ref', 'Reflex'],
      ['save.will', 'Will']
    ]
  },
  {
    label: 'Combat',
    targets: [
      ['attack', 'Attack'],
      ['damage', 'Damage'],
      ['init', 'Initiative'],
      ['cmb', 'CMB'],
      ['cmd', 'CMD'],
      ['speed', 'Speed']
    ]
  },
  {
    label: 'Casting',
    targets: [['casterLevel', 'Caster Level']]
  }
];

// Human-readable label for a target key, used in the compact effect summary.
function targetLabel(target, skillLabels) {
  if (target === 'skill.all') return 'All Skills';
  if (target.startsWith('skill.')) return skillLabels[target] || target;
  for (const group of FIXED_TARGET_GROUPS) {
    const match = group.targets.find(([key]) => key === target);
    if (match) return match[1];
  }
  return target || '(none)';
}

function formatEffect(effect, skillLabels) {
  const value = effect.value || 0;
  const sign = value >= 0 ? '+' : '';
  const type = effect.type && effect.type !== 'untyped' ? ` ${effect.type}` : '';
  return `${sign}${value}${type} ${targetLabel(effect.target, skillLabels)}`;
}

function emptyEffect() {
  return { target: '', type: 'untyped', value: 0 };
}

// Buffs & effects card: toggleable modifier sources (character.modifiers).
// Renders/edits the raw source objects; computeSheet does all the stacking
// math from src/engine/modifiers.js - nothing here recomputes bonuses.
export default function BuffsCard({ character, onChange, sheet }) {
  const modifiers = character.modifiers || [];
  const [expanded, setExpanded] = useState({});
  const [libraryPick, setLibraryPick] = useState('');

  const skillLabels = Object.fromEntries(
    (sheet.skills || []).map((s) => [`skill.${s.id}`, s.name])
  );
  const skillTargets = [
    ['skill.all', 'All Skills'],
    ...(sheet.skills || []).map((s) => [`skill.${s.id}`, s.name])
  ];

  function update(next) {
    onChange({ ...character, modifiers: next });
  }
  function updateModifier(id, patch) {
    update(modifiers.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeModifier(id) {
    update(modifiers.filter((m) => m.id !== id));
  }
  function toggleExpanded(id) {
    setExpanded({ ...expanded, [id]: !expanded[id] });
  }

  function addFromLibrary() {
    if (!libraryPick) return;
    const entry = buffLibrary.find((b) => b.id === libraryPick);
    if (!entry) return;
    update([
      ...modifiers,
      {
        id: newId(),
        name: entry.name,
        enabled: true,
        effects: (entry.effects || []).map((e) => ({ ...e }))
      }
    ]);
    setLibraryPick('');
  }
  function addCustom() {
    update([...modifiers, { id: newId(), name: 'New buff', enabled: true, effects: [emptyEffect()] }]);
  }

  function updateEffect(modId, idx, patch) {
    const mod = modifiers.find((m) => m.id === modId);
    if (!mod) return;
    const effects = mod.effects.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    updateModifier(modId, { effects });
  }
  function addEffect(modId) {
    const mod = modifiers.find((m) => m.id === modId);
    if (!mod) return;
    updateModifier(modId, { effects: [...(mod.effects || []), emptyEffect()] });
  }
  function removeEffect(modId, idx) {
    const mod = modifiers.find((m) => m.id === modId);
    if (!mod) return;
    updateModifier(modId, { effects: mod.effects.filter((_, i) => i !== idx) });
  }

  return (
    <div className="card">
      <h2 className="card-title">Buffs &amp; Effects</h2>

      {modifiers.length === 0 && (
        <p className="section-note" style={{ marginTop: -4, marginBottom: 12 }}>
          No buffs yet - add one from the library or build a custom one below.
        </p>
      )}

      <div className="buff-list">
        {modifiers.map((mod) => {
          const isOpen = !!expanded[mod.id];
          return (
            <div className="buff-row" key={mod.id}>
              <div className="buff-row-head">
                <input
                  type="checkbox"
                  checked={mod.enabled !== false}
                  onChange={(e) => updateModifier(mod.id, { enabled: e.target.checked })}
                  title="Enabled"
                />
                <span className="buff-name">{mod.name || 'Unnamed buff'}</span>
                <span className="buff-summary">
                  {(mod.effects || []).map((e) => formatEffect(e, skillLabels)).join(' · ') || 'No effects'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleExpanded(mod.id)}>
                  {isOpen ? 'Done' : 'Edit'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => removeModifier(mod.id)}>✕</button>
              </div>

              {isOpen && (
                <div className="buff-row-body">
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>Name</label>
                    <input
                      value={mod.name || ''}
                      onChange={(e) => updateModifier(mod.id, { name: e.target.value })}
                    />
                  </div>

                  {(mod.effects || []).map((effect, idx) => (
                    <div className="effect-edit-row" key={idx}>
                      <div className="field">
                        <label>Target</label>
                        <select
                          value={effect.target || ''}
                          onChange={(e) => updateEffect(mod.id, idx, { target: e.target.value })}
                        >
                          <option value="">— choose —</option>
                          {FIXED_TARGET_GROUPS.map((group) => (
                            <optgroup label={group.label} key={group.label}>
                              {group.targets.map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </optgroup>
                          ))}
                          <optgroup label="Skills">
                            {skillTargets.map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div className="field">
                        <label>Type</label>
                        <select
                          value={effect.type || 'untyped'}
                          onChange={(e) => updateEffect(mod.id, idx, { type: e.target.value })}
                        >
                          {BONUS_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Value</label>
                        <input
                          type="number"
                          value={effect.value ?? 0}
                          onChange={(e) => updateEffect(mod.id, idx, { value: parseInt(e.target.value, 10) || 0 })}
                        />
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => removeEffect(mod.id, idx)}>✕</button>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => addEffect(mod.id)}>+ Add effect</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="buff-add-row">
        <select value={libraryPick} onChange={(e) => setLibraryPick(e.target.value)}>
          <option value="">— pick a buff —</option>
          {buffLibrary.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={addFromLibrary}>+ From library</button>
        <button className="btn btn-ghost btn-sm" onClick={addCustom}>+ Custom</button>
      </div>
    </div>
  );
}
