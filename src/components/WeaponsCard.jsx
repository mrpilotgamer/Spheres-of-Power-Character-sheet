import { formatMod } from '../engine/abilities.js';

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

const ATTACK_ABILITIES = ['str', 'dex'];
const DAMAGE_ABILITIES = ['str', 'dex', 'none'];
const DAMAGE_MULTS = [
  { value: 1, label: '×1' },
  { value: 1.5, label: '×1.5 (two-handed)' },
  { value: 0.5, label: '×0.5 (offhand)' }
];

// Renders src/engine/computeSheet.js's `weapons` (to-hit iteratives + damage
// string). No rules math here - just binds character.weapons rows and shows
// the matching computed row by id.
export default function WeaponsCard({ character, onChange, sheet }) {
  const weapons = character.weapons || [];
  const computedById = new Map(sheet.weapons.map((w) => [w.id, w]));

  function update(nextWeapons) {
    onChange({ ...character, weapons: nextWeapons });
  }
  function addWeapon() {
    update([
      ...weapons,
      {
        id: newId(),
        name: '',
        attackAbility: 'str',
        attackMisc: 0,
        damageDice: '',
        damageAbility: 'str',
        damageMult: 1,
        damageMisc: 0,
        notes: ''
      }
    ]);
  }
  function updateWeapon(id, patch) {
    update(weapons.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }
  function removeWeapon(id) {
    update(weapons.filter((w) => w.id !== id));
  }

  return (
    <div className="card">
      <h2 className="card-title">Weapons</h2>

      {weapons.length === 0 && (
        <p className="section-note" style={{ marginTop: -4, marginBottom: 12 }}>
          No weapons yet - add one below.
        </p>
      )}

      <div className="sphere-list">
        {weapons.map((w) => {
          const c = computedById.get(w.id) || {};
          return (
            <div className="sphere-row" key={w.id}>
              <div className="sphere-edit-head">
                <div className="field" style={{ flex: 2 }}>
                  <input
                    placeholder="Weapon name"
                    value={w.name}
                    onChange={(e) => updateWeapon(w.id, { name: e.target.value })}
                  />
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeWeapon(w.id)}>✕</button>
              </div>

              <div className="sphere-row-body">
                <div className="grid-row grid-4">
                  <div className="field">
                    <label>Attack ability</label>
                    <select
                      value={w.attackAbility || 'str'}
                      onChange={(e) => updateWeapon(w.id, { attackAbility: e.target.value })}
                    >
                      {ATTACK_ABILITIES.map((a) => (
                        <option key={a} value={a}>{a.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Attack misc</label>
                    <input
                      type="number"
                      value={w.attackMisc ?? 0}
                      onChange={(e) => updateWeapon(w.id, { attackMisc: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="field">
                    <label>Damage dice</label>
                    <input
                      placeholder="1d8"
                      value={w.damageDice || ''}
                      onChange={(e) => updateWeapon(w.id, { damageDice: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Damage ability</label>
                    <select
                      value={w.damageAbility || 'str'}
                      onChange={(e) => updateWeapon(w.id, { damageAbility: e.target.value })}
                    >
                      {DAMAGE_ABILITIES.map((a) => (
                        <option key={a} value={a}>{a === 'none' ? 'None' : a.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-row grid-3" style={{ marginTop: 10 }}>
                  <div className="field">
                    <label>Damage multiplier</label>
                    <select
                      value={w.damageMult ?? 1}
                      onChange={(e) => updateWeapon(w.id, { damageMult: parseFloat(e.target.value) })}
                    >
                      {DAMAGE_MULTS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Damage misc</label>
                    <input
                      type="number"
                      value={w.damageMisc ?? 0}
                      onChange={(e) => updateWeapon(w.id, { damageMisc: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="field">
                    <label>Notes</label>
                    <input
                      value={w.notes || ''}
                      onChange={(e) => updateWeapon(w.id, { notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-row grid-2" style={{ marginTop: 10 }}>
                  <div className="stat-box">
                    <div className="stat-label">To-hit</div>
                    <div className="stat-value" style={{ fontSize: '1.05rem' }}>
                      {(c.attacks || []).map((a) => formatMod(a)).join(' / ')}
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Damage</div>
                    <div className="stat-value" style={{ fontSize: '1.05rem' }}>{c.damage || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addWeapon}>+ Add weapon</button>
    </div>
  );
}
