import races from '../data/races.json';
import classes from '../data/classes.json';
import {
  ABILITY_KEYS,
  abilityModifier,
  finalScores,
  formatMod
} from '../engine/abilities.js';
import {
  babAtLevel,
  attacksFromBab,
  savesAtLevel,
  totalCasterLevel,
  totalCasterClassLevels,
  spellPoints,
  sphereDC,
  magicSkillBonus,
  magicSkillDefense,
  magicTalentsGained
} from '../engine/progression.js';
import SpherePicker from './SpherePicker.jsx';

const classesById = Object.fromEntries(classes.map((c) => [c.id, c]));
const racesById = Object.fromEntries(races.map((r) => [r.id, r]));

export default function CharacterSheet({ character, onChange }) {
  const race = racesById[character.raceId] || null;
  const scores = finalScores(character.baseAbilities, race, character.chosenBonusAbility);
  const mods = Object.fromEntries(ABILITY_KEYS.map((k) => [k, abilityModifier(scores[k])]));

  const classLevels = character.classLevels.filter((cl) => cl.classId);
  const totalLevel = classLevels.reduce((s, cl) => s + (cl.level || 0), 0);

  // BAB stacks across all classes (Pathfinder multiclassing rule).
  const totalBab = classLevels.reduce(
    (s, cl) => s + babAtLevel(classesById[cl.classId]?.babType || 'half', cl.level),
    0
  );
  const attacks = attacksFromBab(totalBab);

  // Saves: take the best progression across all classes for each save (standard PF multiclass rule).
  const saveTotals = { fort: 0, ref: 0, will: 0 };
  for (const cl of classLevels) {
    const cls = classesById[cl.classId];
    if (!cls) continue;
    const s = savesAtLevel(cls.goodSaves, cl.level);
    saveTotals.fort += s.fort;
    saveTotals.ref += s.ref;
    saveTotals.will += s.will;
  }

  const casterLevel = totalCasterLevel(classLevels, classesById);
  const casterClassLevels = totalCasterClassLevels(classLevels, classesById);

  const primaryCasterClass = classLevels
    .map((cl) => classesById[cl.classId])
    .find((c) => c && c.casterType && c.casterType !== 'none');

  const castingAbilityKey =
    character.castingAbilityOverride ||
    (primaryCasterClass?.casterAbility !== 'choice' ? primaryCasterClass?.casterAbility : null) ||
    'int';
  const castingMod = mods[castingAbilityKey] ?? 0;

  const pool = spellPoints(casterClassLevels, castingMod);
  const dc = sphereDC(casterLevel, castingMod);
  const msb = magicSkillBonus(casterClassLevels);
  const msd = magicSkillDefense(msb);
  const talentsAvailable = magicTalentsGained(classLevels, classesById);

  function update(patch) {
    onChange({ ...character, ...patch });
  }
  function updateAbility(key, value) {
    const n = Math.max(1, Math.min(40, parseInt(value, 10) || 0));
    update({ baseAbilities: { ...character.baseAbilities, [key]: n } });
  }
  function updateClassLevel(idx, patch) {
    const next = [...character.classLevels];
    next[idx] = { ...next[idx], ...patch };
    update({ classLevels: next });
  }
  function addClassLevel() {
    update({ classLevels: [...character.classLevels, { classId: '', level: 1 }] });
  }
  function removeClassLevel(idx) {
    const next = character.classLevels.filter((_, i) => i !== idx);
    update({ classLevels: next.length ? next : [{ classId: '', level: 1 }] });
  }

  return (
    <>
      <div className="sheet-header">
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            className="name-input"
            placeholder="Unnamed Character"
            value={character.name}
            onChange={(e) => update({ name: e.target.value })}
          />
          <div className="tagline">
            {race?.name || 'No race'} · Level {totalLevel || 0}
            {classLevels.length > 0 && ` · ${classLevels.map((c) => `${classesById[c.classId]?.name || '?'} ${c.level}`).join(' / ')}`}
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="card">
        <h2 className="card-title">Identity</h2>
        <div className="grid-row grid-4">
          <div className="field">
            <label>Player</label>
            <input value={character.playerName} onChange={(e) => update({ playerName: e.target.value })} />
          </div>
          <div className="field">
            <label>Race</label>
            <select value={character.raceId} onChange={(e) => update({ raceId: e.target.value })}>
              {races.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          {race?.abilityNote && (
            <div className="field">
              <label>+2 Bonus To</label>
              <select value={character.chosenBonusAbility} onChange={(e) => update({ chosenBonusAbility: e.target.value })}>
                {ABILITY_KEYS.map((k) => (
                  <option key={k} value={k}>{k.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Alignment</label>
            <input value={character.alignment} onChange={(e) => update({ alignment: e.target.value })} />
          </div>
          <div className="field">
            <label>Deity</label>
            <input value={character.deity} onChange={(e) => update({ deity: e.target.value })} />
          </div>
        </div>
        {race && (
          <div className="section-note">
            {race.name} traits: {race.traits.join(', ')}
          </div>
        )}
      </div>

      {/* Ability scores */}
      <div className="card">
        <h2 className="card-title">Ability Scores</h2>
        <div className="grid-row grid-6">
          {ABILITY_KEYS.map((key) => (
            <div className="ability-box" key={key}>
              <div className="ab-label">{key}</div>
              <input
                type="number"
                value={character.baseAbilities[key]}
                onChange={(e) => updateAbility(key, e.target.value)}
              />
              <div className="ab-mod">{formatMod(mods[key])} ({scores[key]})</div>
            </div>
          ))}
        </div>
        <div className="section-note">Base score entered; race modifiers are applied automatically to the total shown in parentheses.</div>
      </div>

      {/* Classes & levels */}
      <div className="card">
        <h2 className="card-title">Classes &amp; Levels</h2>
        {character.classLevels.map((cl, idx) => (
          <div className="class-row" key={idx}>
            <div className="field">
              <label>Class</label>
              <select value={cl.classId} onChange={(e) => updateClassLevel(idx, { classId: e.target.value })}>
                <option value="">— choose —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{!c.verified ? ' (unverified)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Level</label>
              <input
                type="number"
                min={1}
                max={20}
                value={cl.level}
                onChange={(e) => updateClassLevel(idx, { level: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)) })}
              />
            </div>
            <button className="btn btn-danger btn-sm" style={{ height: 34 }} onClick={() => removeClassLevel(idx)}>✕</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addClassLevel}>+ Add class (multiclass)</button>

        {primaryCasterClass?.casterAbility === 'choice' && (
          <div className="field" style={{ marginTop: 14, maxWidth: 220 }}>
            <label>Casting Ability</label>
            <select
              value={castingAbilityKey}
              onChange={(e) => update({ castingAbilityOverride: e.target.value })}
            >
              <option value="int">Intelligence</option>
              <option value="wis">Wisdom</option>
              <option value="cha">Charisma</option>
            </select>
          </div>
        )}
      </div>

      {/* Combat & caster stats */}
      <div className="card">
        <h2 className="card-title">Combat &amp; Caster Stats</h2>
        <div className="grid-row grid-4" style={{ marginBottom: 12 }}>
          <div className="stat-box">
            <div className="stat-label">Base Attack</div>
            <div className="stat-value">{attacks.map((a) => formatMod(a)).join(' / ')}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Fort / Ref / Will</div>
            <div className="stat-value" style={{ fontSize: '1.05rem' }}>
              {formatMod(saveTotals.fort + mods.con)} / {formatMod(saveTotals.ref + mods.dex)} / {formatMod(saveTotals.will + mods.wis)}
            </div>
            <div className="stat-sub">base {saveTotals.fort}/{saveTotals.ref}/{saveTotals.will} + ability mod</div>
          </div>
          <div className="field">
            <label>HP Max</label>
            <input type="number" value={character.hpMax} onChange={(e) => update({ hpMax: parseInt(e.target.value, 10) || 0 })} />
          </div>
          <div className="field">
            <label>Armor Class</label>
            <input type="number" value={character.armorClass} onChange={(e) => update({ armorClass: parseInt(e.target.value, 10) || 0 })} />
          </div>
        </div>

        <div className="grid-row grid-4">
          <div className="stat-box">
            <div className="stat-label">Caster Level</div>
            <div className="stat-value">{casterLevel}</div>
            <div className="stat-sub">{primaryCasterClass ? primaryCasterClass.casterType + '-caster' : 'no caster class'}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Spell Points</div>
            <div className="stat-value">{pool}</div>
            <div className="stat-sub">class levels + {formatMod(castingMod)} {castingAbilityKey.toUpperCase()}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Sphere DC</div>
            <div className="stat-value">{dc}</div>
            <div className="stat-sub">10 + ½CL + mod</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">MSB / MSD</div>
            <div className="stat-value">{msb} / {msd}</div>
            <div className="stat-sub">caster-class levels</div>
          </div>
        </div>
      </div>

      <SpherePicker character={character} onChange={onChange} talentsAvailable={talentsAvailable} />

      <div className="card">
        <h2 className="card-title">Notes &amp; Equipment</h2>
        <div className="field">
          <textarea
            rows={6}
            placeholder="Feats, skills, gear, backstory, anything else you're tracking..."
            value={character.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
