function newId() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_TRADITION = { name: '', drawbacks: [], boons: [], bonusSpellPointsMisc: 0 };

// Casting Tradition card (Stage 7, docs/engine.md). Renders general
// drawbacks/boons that computeSheet reduces into sheet.casting.tradition - no
// math here, just binds character.castingTradition.* and shows the computed
// summary. Also hosts the casting-ability select (moved here from Classes &
// Levels - it's the tradition's ability per RAW), which still writes the same
// character.castingAbility field.
export default function TraditionCard({ character, onChange, sheet }) {
  const ct = character.castingTradition ?? DEFAULT_TRADITION;
  const drawbacks = ct.drawbacks || [];
  const boons = ct.boons || [];
  const tradition = sheet.casting.tradition;
  const isStandard = sheet.castingRules === 'standard';

  function update(patch) {
    onChange({ ...character, ...patch });
  }
  function updateTradition(patch) {
    update({ castingTradition: { ...ct, ...patch } });
  }
  function addDrawback() {
    updateTradition({
      drawbacks: [...drawbacks, { id: newId(), name: '', description: '', countsAsTwo: false }]
    });
  }
  function updateDrawback(id, patch) {
    updateTradition({
      drawbacks: drawbacks.map((d) => (d.id === id ? { ...d, ...patch } : d))
    });
  }
  function removeDrawback(id) {
    updateTradition({ drawbacks: drawbacks.filter((d) => d.id !== id) });
  }
  function addBoon() {
    updateTradition({ boons: [...boons, { id: newId(), name: '', description: '' }] });
  }
  function updateBoon(id, patch) {
    updateTradition({ boons: boons.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  }
  function removeBoon(id) {
    updateTradition({ boons: boons.filter((b) => b.id !== id) });
  }

  return (
    <div className="card">
      <h2 className="card-title">Casting Tradition</h2>

      <div className="grid-row grid-2 mb-14">
        <div className="field">
          <label>Tradition Name</label>
          <input
            placeholder="e.g. Traditional Magic, Blood Magic, Bardic Song..."
            value={ct.name || ''}
            onChange={(e) => updateTradition({ name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Casting Ability</label>
          <select
            disabled={!isStandard}
            value={sheet.casting.castingAbility}
            onChange={(e) => update({ castingAbility: e.target.value })}
          >
            <option value="int">Intelligence</option>
            <option value="wis">Wisdom</option>
            <option value="cha">Charisma</option>
          </select>
        </div>
      </div>
      {!isStandard && (
        <div className="section-note mt-10">
          House rule active - pool uses INT, DCs use highest mental stat.
        </div>
      )}

      <h3 className="card-subtitle mt-14">General Drawbacks</h3>
      {drawbacks.length === 0 && (
        <p className="empty-hint">No drawbacks yet - add one below and name it whatever you like.</p>
      )}
      <div className="tradition-list">
        {drawbacks.map((d) => (
          <div className="tradition-row" key={d.id}>
            <div className="field">
              <input
                placeholder="Drawback name"
                value={d.name}
                onChange={(e) => updateDrawback(d.id, { name: e.target.value })}
              />
            </div>
            <label className="tradition-row-checkbox">
              <input
                type="checkbox"
                checked={!!d.countsAsTwo}
                onChange={(e) => updateDrawback(d.id, { countsAsTwo: e.target.checked })}
              />
              Counts as two
            </label>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => removeDrawback(d.id)}
              aria-label={`Remove ${d.name || 'drawback'}`}
            >
              ✕
            </button>
            <div className="field talent-edit-desc">
              <textarea
                rows={2}
                placeholder="Description"
                value={d.description}
                onChange={(e) => updateDrawback(d.id, { description: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={addDrawback}>+ Add drawback</button>

      <h3 className="card-subtitle mt-14">Boons</h3>
      {boons.length === 0 && (
        <p className="empty-hint">No boons yet - add one below and name it whatever you like.</p>
      )}
      <div className="tradition-list">
        {boons.map((b) => (
          <div className="talent-edit-row" key={b.id}>
            <div className="field">
              <input
                placeholder="Boon name"
                value={b.name}
                onChange={(e) => updateBoon(b.id, { name: e.target.value })}
              />
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => removeBoon(b.id)}
              aria-label={`Remove ${b.name || 'boon'}`}
            >
              ✕
            </button>
            <div className="field talent-edit-desc">
              <textarea
                rows={2}
                placeholder="Description"
                value={b.description}
                onChange={(e) => updateBoon(b.id, { description: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={addBoon}>+ Add boon</button>

      <div className="grid-row grid-5 mt-14">
        <div className="stat-box">
          <div className="stat-label">Drawback Points</div>
          <div className="stat-value">{tradition.drawbackPoints}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Boons</div>
          <div className="stat-value">{tradition.boonCount}</div>
          <div className="stat-sub">2 points each</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Unexchanged</div>
          <div className="stat-value">{tradition.unexchanged}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Bonus Spell Points</div>
          <div className="stat-value">{tradition.bonusSpellPoints}</div>
        </div>
        <div className="field">
          <label>Misc Bonus SP</label>
          <input
            type="number"
            value={ct.bonusSpellPointsMisc ?? 0}
            onChange={(e) => updateTradition({ bonusSpellPointsMisc: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </div>
      {tradition.boonDeficit && (
        <div className="section-note section-note-warning">
          More boons than drawback points afford - check with your GM.
        </div>
      )}
    </div>
  );
}
