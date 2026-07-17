import { formatMod } from '../engine/abilities.js';
import { SIZE_MODS } from '../engine/computeSheet.js';

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Renders src/engine/computeSheet.js's acTotals/init/cmb/cmd/speed. No rules
// math here - just binds character.defense.*/size/speed/initiativeMisc inputs
// and displays the computed totals.
export default function DefenseCard({ character, onChange, sheet }) {
  const defense = character.defense || {};

  function update(patch) {
    onChange({ ...character, ...patch });
  }
  function updateDefense(patch) {
    update({ defense: { ...defense, ...patch } });
  }
  function updateDefenseNum(key, value) {
    const n = parseInt(value, 10);
    updateDefense({ [key]: Number.isNaN(n) ? 0 : n });
  }
  function updateMaxDex(value) {
    if (value === '') {
      updateDefense({ maxDex: null });
      return;
    }
    const n = parseInt(value, 10);
    updateDefense({ maxDex: Number.isNaN(n) ? null : n });
  }

  return (
    <div className="card">
      <h2 className="card-title">Defense &amp; Movement</h2>

      <div className="grid-row grid-5" style={{ marginBottom: 14 }}>
        <div className="stat-box">
          <div className="stat-label">AC / Touch / Flat-footed</div>
          <div className="stat-value" style={{ fontSize: '1.05rem' }}>
            {sheet.acTotals.ac} / {sheet.acTotals.touch} / {sheet.acTotals.flatFooted}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Initiative</div>
          <div className="stat-value">{formatMod(sheet.init)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">CMB</div>
          <div className="stat-value">{formatMod(sheet.cmb)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">CMD</div>
          <div className="stat-value">{sheet.cmd}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Speed</div>
          <div className="stat-value">{sheet.speed} ft</div>
        </div>
      </div>

      <div className="grid-row grid-4" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Armor bonus</label>
          <input type="number" value={defense.armorBonus ?? 0} onChange={(e) => updateDefenseNum('armorBonus', e.target.value)} />
        </div>
        <div className="field">
          <label>Shield bonus</label>
          <input type="number" value={defense.shieldBonus ?? 0} onChange={(e) => updateDefenseNum('shieldBonus', e.target.value)} />
        </div>
        <div className="field">
          <label>Natural armor</label>
          <input type="number" value={defense.naturalArmor ?? 0} onChange={(e) => updateDefenseNum('naturalArmor', e.target.value)} />
        </div>
        <div className="field">
          <label>Deflection</label>
          <input type="number" value={defense.deflection ?? 0} onChange={(e) => updateDefenseNum('deflection', e.target.value)} />
        </div>
        <div className="field">
          <label>Dodge (misc)</label>
          <input type="number" value={defense.dodgeMisc ?? 0} onChange={(e) => updateDefenseNum('dodgeMisc', e.target.value)} />
        </div>
        <div className="field">
          <label>Misc AC</label>
          <input type="number" value={defense.miscAc ?? 0} onChange={(e) => updateDefenseNum('miscAc', e.target.value)} />
        </div>
        <div className="field">
          <label>Max Dex</label>
          <input
            type="number"
            placeholder="unlimited"
            value={defense.maxDex == null ? '' : defense.maxDex}
            onChange={(e) => updateMaxDex(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Armor check penalty</label>
          <input
            type="number"
            min={0}
            value={defense.acp ?? 0}
            onChange={(e) => updateDefenseNum('acp', Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
        </div>
      </div>

      <div className="grid-row grid-3">
        <div className="field">
          <label>Size</label>
          <select value={sheet.size} onChange={(e) => update({ size: e.target.value })}>
            {Object.keys(SIZE_MODS).map((s) => (
              <option key={s} value={s}>{cap(s)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Speed (ft)</label>
          <input
            type="number"
            value={character.speed ?? 30}
            onChange={(e) => update({ speed: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
        <div className="field">
          <label>Initiative misc</label>
          <input
            type="number"
            value={character.initiativeMisc ?? 0}
            onChange={(e) => update({ initiativeMisc: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </div>
    </div>
  );
}
