import { useState } from 'react';
import { formatMod } from '../engine/abilities.js';
import BuffsCard from './BuffsCard.jsx';
import ConditionsCard from './ConditionsCard.jsx';

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// Play-mode tab: at-the-table resources (HP, spell points, martial focus,
// custom trackers) plus buffs/conditions. Everything shown comes from
// sheet (computeSheet's output) - this component only writes character
// fields via update()/onChange and lets the next computeSheet pass do the
// math (clamping, stacking, etc).
export default function PlayTab({ character, onChange, sheet }) {
  const [hpAmount, setHpAmount] = useState(1);
  const [trackerDraft, setTrackerDraft] = useState({ name: '', max: 10 });

  const play = sheet.play;

  function update(patch) {
    onChange({ ...character, ...patch });
  }

  // ---- HP ----
  function applyDamage() {
    const amt = parseInt(hpAmount, 10) || 0;
    update({ hpCurrent: play.hp.current - amt });
  }
  function applyHeal() {
    const amt = parseInt(hpAmount, 10) || 0;
    update({ hpCurrent: Math.min(play.hp.max, play.hp.current + amt) });
  }
  function applyNlDamage() {
    const amt = parseInt(hpAmount, 10) || 0;
    update({ hpNonlethal: Math.max(0, play.hp.nonlethal + amt) });
  }
  function applyNlHeal() {
    const amt = parseInt(hpAmount, 10) || 0;
    update({ hpNonlethal: Math.max(0, play.hp.nonlethal - amt) });
  }
  function fullHeal() {
    update({ hpCurrent: play.hp.max, hpNonlethal: 0 });
  }
  const hpDanger = play.hp.current <= 0 || play.hp.nonlethal >= play.hp.current;

  // ---- Spell points ----
  function spendSpellPoint() {
    const spent = character.spellPointsSpent || 0;
    update({ spellPointsSpent: Math.min(play.spellPoints.max, spent + 1) });
  }
  function regainSpellPoint() {
    const spent = character.spellPointsSpent || 0;
    update({ spellPointsSpent: Math.max(0, spent - 1) });
  }
  function fullRestoreSpellPoints() {
    update({ spellPointsSpent: 0 });
  }

  // ---- Martial focus ----
  function setFocusPip(index) {
    const current = play.martialFocus.current;
    const next = index + 1 === current ? index : index + 1;
    update({ martialFocusCurrent: Math.max(0, Math.min(play.martialFocus.max, next)) });
  }
  function expendFocus() {
    update({ martialFocusCurrent: Math.max(0, play.martialFocus.current - 1) });
  }
  function regainFocus() {
    update({ martialFocusCurrent: Math.min(play.martialFocus.max, play.martialFocus.current + 1) });
  }
  const showMartialFocus = play.martialFocus.max > 0;

  // ---- Custom trackers ----
  function updateTrackers(next) {
    update({ trackers: next });
  }
  function adjustTracker(id, delta) {
    const trackers = character.trackers || [];
    updateTrackers(
      trackers.map((t) =>
        t.id === id ? { ...t, current: Math.max(0, Math.min(t.max || 0, (t.current || 0) + delta)) } : t
      )
    );
  }
  function resetTracker(id) {
    const trackers = character.trackers || [];
    updateTrackers(trackers.map((t) => (t.id === id ? { ...t, current: t.max || 0 } : t)));
  }
  function removeTracker(id) {
    updateTrackers((character.trackers || []).filter((t) => t.id !== id));
  }
  function addTracker() {
    const name = trackerDraft.name.trim();
    if (!name) return;
    const max = Math.max(0, parseInt(trackerDraft.max, 10) || 0);
    updateTrackers([...(character.trackers || []), { id: newId(), name, max, current: max }]);
    setTrackerDraft({ name: '', max: 10 });
  }

  return (
    <>
      {/* Stats strip - read-only, live-reflects active buffs/conditions */}
      <div className="card">
        <h2 className="card-title">Combat Stats</h2>
        <div className="grid-row grid-6">
          <div className="stat-box">
            <div className="stat-label">AC / Touch / FF</div>
            <div className="stat-value stat-value-sm">
              {sheet.acTotals.ac} / {sheet.acTotals.touch} / {sheet.acTotals.flatFooted}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Fort / Ref / Will</div>
            <div className="stat-value stat-value-sm">
              {formatMod(sheet.saves.fort)} / {formatMod(sheet.saves.ref)} / {formatMod(sheet.saves.will)}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Initiative</div>
            <div className="stat-value">{formatMod(sheet.init)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Base Attack</div>
            <div className="stat-value stat-value-sm">
              {sheet.attacks.map((a) => formatMod(a)).join(' / ')}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">CMB / CMD</div>
            <div className="stat-value stat-value-sm">
              {formatMod(sheet.cmb)} / {sheet.cmd}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Speed</div>
            <div className="stat-value">{sheet.speed} ft</div>
          </div>
        </div>
      </div>

      {/* HP tracker */}
      <div className="card">
        <h2 className="card-title">Hit Points</h2>
        <div className="hp-display">
          <span className={`hp-current${hpDanger ? ' hp-danger' : ''}`}>{play.hp.current}</span>
          <span className="hp-sep">/</span>
          <span className="hp-max">{play.hp.max}</span>
        </div>
        {play.hp.nonlethal > 0 && (
          <div className="hp-nonlethal">{play.hp.nonlethal} nonlethal</div>
        )}
        <div className="tracker-controls">
          <input
            type="number"
            className="tracker-amount"
            value={hpAmount}
            onChange={(e) => setHpAmount(e.target.value)}
          />
          <button className="btn btn-danger btn-sm" onClick={applyDamage}>Damage</button>
          <button className="btn btn-primary btn-sm" onClick={applyHeal}>Heal</button>
          <button className="btn btn-ghost btn-sm" onClick={applyNlDamage}>NL dmg</button>
          <button className="btn btn-ghost btn-sm" onClick={applyNlHeal}>NL heal</button>
          <button className="btn btn-primary btn-sm" onClick={fullHeal}>Full heal</button>
        </div>
      </div>

      {/* Spell points */}
      {play.spellPoints.max > 0 && (
        <div className="card">
          <h2 className="card-title">Spell Points</h2>
          <div className="resource-display">
            <span className="resource-current">{play.spellPoints.remaining}</span>
            <span className="hp-sep">/</span>
            <span className="hp-max">{play.spellPoints.max}</span>
          </div>
          <div className="tracker-controls">
            <button className="btn btn-ghost btn-sm" onClick={spendSpellPoint} aria-label="Spend spell point">−</button>
            <button className="btn btn-ghost btn-sm" onClick={regainSpellPoint} aria-label="Regain spell point">+</button>
            <button className="btn btn-primary btn-sm" onClick={fullRestoreSpellPoints}>Full restore</button>
          </div>
        </div>
      )}

      {/* Martial focus */}
      {showMartialFocus && (
        <div className="card">
          <h2 className="card-title">Martial Focus</h2>
          <div className="focus-pips">
            {Array.from({ length: play.martialFocus.max }).map((_, i) => (
              <button
                key={i}
                className={`focus-pip${i < play.martialFocus.current ? ' filled' : ''}`}
                onClick={() => setFocusPip(i)}
                title={`Set focus to ${i + 1}`}
                aria-label={`Set martial focus to ${i + 1}`}
              />
            ))}
          </div>
          <div className="tracker-controls">
            <button className="btn btn-danger btn-sm" onClick={expendFocus}>Expend</button>
            <button className="btn btn-primary btn-sm" onClick={regainFocus}>Regain</button>
          </div>
        </div>
      )}

      {/* Custom trackers */}
      <div className="card">
        <h2 className="card-title">Custom Trackers</h2>
        {(play.trackers || []).length === 0 && (
          <p className="empty-hint">
            No trackers yet - add one below (ki pool, bombs per day, rounds of rage, anything you count down).
          </p>
        )}
        <div className="tracker-list">
          {(play.trackers || []).map((t) => (
            <div className="tracker-row" key={t.id}>
              <span className="tracker-name">{t.name}</span>
              <span className="tracker-count">{t.current} / {t.max}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => adjustTracker(t.id, -1)} aria-label={`Decrease ${t.name}`}>−</button>
              <button className="btn btn-ghost btn-sm" onClick={() => adjustTracker(t.id, 1)} aria-label={`Increase ${t.name}`}>+</button>
              <button className="btn btn-ghost btn-sm" onClick={() => resetTracker(t.id)}>Reset</button>
              <button className="btn btn-danger btn-sm" onClick={() => removeTracker(t.id)} aria-label={`Remove ${t.name} tracker`}>✕</button>
            </div>
          ))}
        </div>
        <div className="tracker-add-row">
          <input
            className="tracker-add-name"
            placeholder="Tracker name"
            value={trackerDraft.name}
            onChange={(e) => setTrackerDraft({ ...trackerDraft, name: e.target.value })}
          />
          <input
            type="number"
            className="tracker-add-max"
            placeholder="Max"
            value={trackerDraft.max}
            onChange={(e) => setTrackerDraft({ ...trackerDraft, max: e.target.value })}
          />
          <button className="btn btn-ghost btn-sm" onClick={addTracker}>+ Add tracker</button>
        </div>
      </div>

      <BuffsCard character={character} onChange={onChange} sheet={sheet} />
      <ConditionsCard character={character} onChange={onChange} />
    </>
  );
}
