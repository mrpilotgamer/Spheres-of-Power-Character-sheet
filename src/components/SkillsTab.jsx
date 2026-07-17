import { useState } from 'react';
import { formatMod } from '../engine/abilities.js';
import { PLACEHOLDER_FAMILIES } from '../engine/skills.js';

const FAMILIES = [...PLACEHOLDER_FAMILIES];

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Renders src/engine/computeSheet.js's `skills` rows + `skillPoints` budget.
// No rules math here: class-skill lock state is derived only from the
// computed `classSkill` flag plus the character's own override field, never
// by re-deriving isClassSkill().
export default function SkillsTab({ character, onChange, sheet }) {
  const [newFamily, setNewFamily] = useState(FAMILIES[0] || 'Craft');
  const [newName, setNewName] = useState('');

  const charSkills = character.skills || {};
  const customIds = new Set((character.customSkills || []).map((c) => c.id));

  function update(patch) {
    onChange({ ...character, ...patch });
  }
  function updateSkillState(id, patch) {
    update({ skills: { ...charSkills, [id]: { ...(charSkills[id] || {}), ...patch } } });
  }
  function toggleClassSkill(row) {
    const state = charSkills[row.id] || {};
    const isOverride = state.classSkillOverride === true;
    if (row.classSkill && !isOverride) return; // locked: auto class skill from a class
    updateSkillState(row.id, { classSkillOverride: !isOverride });
  }
  function updateRanks(id, value) {
    const n = Math.max(0, parseInt(value, 10) || 0);
    updateSkillState(id, { ranks: n });
  }
  function updateMisc(id, value) {
    const n = parseInt(value, 10);
    updateSkillState(id, { misc: Number.isNaN(n) ? 0 : n });
  }

  function addCustomSkill() {
    const name = newName.trim();
    if (!name) return;
    const base = `${newFamily.toLowerCase()}-${slugify(name)}`;
    const existing = new Set((character.customSkills || []).map((c) => c.id));
    let id = base;
    let n = 2;
    while (existing.has(id)) {
      id = `${base}-${n++}`;
    }
    update({
      customSkills: [...(character.customSkills || []), { id, family: newFamily, name: `${newFamily} (${name})` }]
    });
    setNewName('');
  }
  function removeCustomSkill(id) {
    const nextCustom = (character.customSkills || []).filter((c) => c.id !== id);
    const nextSkills = { ...charSkills };
    delete nextSkills[id];
    onChange({ ...character, customSkills: nextCustom, skills: nextSkills });
  }

  return (
    <div className="card">
      <h2 className="card-title">Skills</h2>

      <div className="grid-row grid-2" style={{ marginBottom: 6 }}>
        <div className="stat-box">
          <div className="stat-label">Skill Points</div>
          <div className="stat-value">{sheet.skillPoints.spent} / {sheet.skillPoints.budget}</div>
        </div>
        <div className="field">
          <label>Misc points</label>
          <input
            type="number"
            value={character.skillPointsMisc ?? 0}
            onChange={(e) => update({ skillPointsMisc: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </div>
      <div className="section-note" style={{ marginBottom: 14 }}>
        Add extra skill points here for favored class bonuses, the human bonus feat, traits, etc. -
        not tracked automatically.
      </div>

      <div className="skills-table-wrap">
        <table className="skills-table">
          <thead>
            <tr>
              <th></th>
              <th>Skill</th>
              <th>Ranks</th>
              <th>Misc</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sheet.skills.map((row) => {
              const state = charSkills[row.id] || {};
              const isOverride = state.classSkillOverride === true;
              const locked = row.classSkill && !isOverride;
              const isCustom = customIds.has(row.id);
              return (
                <tr key={row.id} className={row.unusable ? 'skill-row-unusable' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.classSkill}
                      disabled={locked}
                      title={locked ? 'class skill from your classes' : 'mark as a class skill'}
                      onChange={() => toggleClassSkill(row)}
                    />
                  </td>
                  <td className="skill-name-cell">
                    <div className="skill-name-wrap">
                      <span>{row.name} <span className="skill-ability">({row.ability.toUpperCase()})</span></span>
                      {isCustom && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeCustomSkill(row.id)}
                          aria-label={`Remove ${row.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {row.unusable && <div className="skill-hint">trained only</div>}
                    {row.acpApplied > 0 && <div className="skill-hint">−{row.acpApplied} armor</div>}
                  </td>
                  <td>
                    <input type="number" value={row.ranks} onChange={(e) => updateRanks(row.id, e.target.value)} />
                  </td>
                  <td>
                    <input type="number" value={row.misc} onChange={(e) => updateMisc(row.id, e.target.value)} />
                  </td>
                  <td className="skill-total">{formatMod(row.total)}</td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid-row grid-3" style={{ marginTop: 16, alignItems: 'end' }}>
        <div className="field">
          <label>Family</label>
          <select value={newFamily} onChange={(e) => setNewFamily(e.target.value)}>
            {FAMILIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Name</label>
          <input
            placeholder="e.g. Alchemy"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={addCustomSkill}>+ Add Craft/Perform/Profession</button>
      </div>
    </div>
  );
}
