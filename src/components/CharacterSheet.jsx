import races from '../data/races.json';
import { classesById, classesByCategory } from '../engine/classLoader.js';
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
  magicTalentsGained,
  combatTalentsGained,
  skillTalentsGained,
  universalTalentsGained
} from '../engine/progression.js';
import { spheres, combatSpheres, skillSpheres } from '../engine/sphereLoader.js';
import TalentPicker from './TalentPicker.jsx';

const racesById = Object.fromEntries(races.map((r) => [r.id, r]));

export default function CharacterSheet({ character, onChange }) {
  const race = racesById[character.raceId] || null;
  const scores = finalScores(character.baseAbilities, race, character.chosenBonusAbility);
  const mods = Object.fromEntries(ABILITY_KEYS.map((k) => [k, abilityModifier(scores[k])]));

  const classLevels = character.classLevels.filter((cl) => cl.classId);
  const totalLevel = classLevels.reduce((s, cl) => s + (cl.level || 0), 0);

  const mightLevels = classLevels.filter((cl) => classesById[cl.classId]?.system === 'might');
  const guileLevels = classLevels.filter((cl) => classesById[cl.classId]?.system === 'guile');
  const championLevels = classLevels.filter((cl) => classesById[cl.classId]?.system === 'champion');

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

  // House rule (always on for this table): casters use all three mental
  // stats instead of one fixed casting ability. Intelligence powers the
  // spell pool, the highest mental mod sets DCs, Wisdom governs duration/
  // targets, and Charisma governs damage/healing bonuses. The per-class
  // "casterAbility" field is kept in the data for reference but no longer
  // drives any of these calculations.
  const highestMentalMod = Math.max(mods.int, mods.wis, mods.cha);

  const pool = spellPoints(casterClassLevels, mods.int);
  const dc = sphereDC(casterLevel, highestMentalMod);
  const msb = magicSkillBonus(casterClassLevels);
  const msd = magicSkillDefense(msb);
  const magicTalentsAvailable = magicTalentsGained(classLevels, classesById);
  const combatTalentsAvailable = combatTalentsGained(classLevels, classesById);
  const skillTalentsAvailable = skillTalentsGained(classLevels, classesById);
  const universalTalentsAvailable = universalTalentsGained(classLevels, classesById);
  const universalSpent = character.championTalentsSpent || 0;
  const universalRemaining = universalTalentsAvailable - universalSpent;

  const primaryGuileClass = guileLevels.map((cl) => classesById[cl.classId]).find(Boolean);
  const operativeAbilityKey = character.operativeAbilityOverride || 'wis';

  const primaryMightClass = mightLevels.map((cl) => classesById[cl.classId]).find(Boolean);
  const practitionerAbilityKey = character.practitionerAbilityOverride || 'wis';
  const practitionerMod =
    primaryMightClass?.practitionerAbility === 'higher_cha_int'
      ? Math.max(mods.cha, mods.int)
      : primaryMightClass?.practitionerAbility === 'choice'
        ? mods[practitionerAbilityKey] ?? 0
        : mods[primaryMightClass?.practitionerAbility] ?? 0;

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
                {Object.entries(classesByCategory).map(([category, list]) => (
                  <optgroup label={category} key={category}>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{!c.verified ? ' (unverified)' : ''}
                      </option>
                    ))}
                  </optgroup>
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

        {primaryMightClass?.practitionerAbility === 'choice' && (
          <div className="field" style={{ marginTop: 14, maxWidth: 220 }}>
            <label>Practitioner Ability</label>
            <select
              value={practitionerAbilityKey}
              onChange={(e) => update({ practitionerAbilityOverride: e.target.value })}
            >
              <option value="int">Intelligence</option>
              <option value="wis">Wisdom</option>
              <option value="cha">Charisma</option>
            </select>
            <div className="section-note">Chosen once, at 1st level in this class. Used for combat sphere DCs.</div>
          </div>
        )}

        {primaryGuileClass && (
          <div className="field" style={{ marginTop: 14, maxWidth: 220 }}>
            <label>Operative Ability</label>
            <select
              value={operativeAbilityKey}
              onChange={(e) => update({ operativeAbilityOverride: e.target.value })}
            >
              <option value="int">Intelligence</option>
              <option value="wis">Wisdom</option>
              <option value="cha">Charisma</option>
            </select>
            <div className="section-note">Chosen once, the first time you gain a skill talent. Used for skill sphere DCs.</div>
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

        {casterClassLevels > 0 && (
          <div className="grid-row grid-4">
            <div className="stat-box">
              <div className="stat-label">Caster Level</div>
              <div className="stat-value">{casterLevel}</div>
              <div className="stat-sub">{primaryCasterClass ? primaryCasterClass.casterType + '-caster' : 'no caster class'}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Spell Points</div>
              <div className="stat-value">{pool}</div>
              <div className="stat-sub">class levels + {formatMod(mods.int)} INT</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Sphere DC</div>
              <div className="stat-value">{dc}</div>
              <div className="stat-sub">10 + ½CL + highest mental mod</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">MSB / MSD</div>
              <div className="stat-value">{msb} / {msd}</div>
              <div className="stat-sub">caster-class levels</div>
            </div>
          </div>
        )}

        {casterClassLevels > 0 && (
          <div className="grid-row grid-2" style={{ marginTop: 14 }}>
            <div className="stat-box">
              <div className="stat-label">Wisdom Bonus</div>
              <div className="stat-value">{formatMod(mods.wis)}</div>
              <div className="stat-sub" style={{ textAlign: 'left' }}>
                Add to duration whenever a talent says "per caster level" (rounds/minutes/hours). Add as extra targets for [mass]-tagged or multi-target abilities. Add half to Alteration trait count.
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Charisma Bonus</div>
              <div className="stat-value">{formatMod(mods.cha)}</div>
              <div className="stat-sub" style={{ textAlign: 'left' }}>
                Use for any effect that adds your casting ability modifier to damage dealt/healed, or to targets affected (e.g. Healing Aegis, Selective Blast).
              </div>
            </div>
          </div>
        )}

        {mightLevels.length > 0 && (
          <div className="grid-row grid-4" style={{ marginTop: casterClassLevels > 0 ? 14 : 0 }}>
            <div className="stat-box">
              <div className="stat-label">Combat Sphere DC</div>
              <div className="stat-value">{10 + Math.floor(totalBab / 2) + practitionerMod}</div>
              <div className="stat-sub">
                10 + ½BAB + {primaryMightClass?.practitionerAbility === 'higher_cha_int' ? 'higher of CHA/INT' : (primaryMightClass?.practitionerAbility === 'choice' ? practitionerAbilityKey.toUpperCase() : (primaryMightClass?.practitionerAbility || 'wis').toUpperCase())}
              </div>
            </div>
            <div className="field">
              <label>Martial Focus (max)</label>
              <input
                type="number"
                min={0}
                max={3}
                value={character.martialFocusMax}
                onChange={(e) => update({ martialFocusMax: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              />
            </div>
            <div className="stat-box" style={{ gridColumn: 'span 2' }}>
              <div className="stat-label">About Martial Focus</div>
              <div className="stat-sub" style={{ textAlign: 'left' }}>
                A single resource (2 with a feat like Greater Focus) spent to trigger powerful combat talents, regained via specific talents/abilities rather than refilling automatically.
              </div>
            </div>
          </div>
        )}

        {guileLevels.length > 0 && (
          <div className="grid-row grid-4" style={{ marginTop: (casterClassLevels > 0 || mightLevels.length > 0) ? 14 : 0 }}>
            <div className="stat-box">
              <div className="stat-label">Operative Mod</div>
              <div className="stat-value">{formatMod(mods[operativeAbilityKey] ?? 0)}</div>
              <div className="stat-sub">{operativeAbilityKey.toUpperCase()}, chosen above</div>
            </div>
            <div className="stat-box" style={{ gridColumn: 'span 3' }}>
              <div className="stat-label">Skill Sphere DC</div>
              <div className="stat-value" style={{ fontSize: '1rem' }}>10 + ½ ranks in the sphere's skill + operative mod</div>
              <div className="stat-sub">Varies per sphere/skill - calculate per use, ranks aren't tracked separately here yet.</div>
            </div>
          </div>
        )}
      </div>

      {championLevels.length > 0 && (
        <div className="card">
          <h2 className="card-title">Champion Talent Pool</h2>
          <div className="talent-budget">
            <span className="big">{Math.max(universalRemaining, 0)}</span>
            <span className={universalRemaining < 0 ? 'over' : 'ok'}>
              {universalRemaining < 0 ? `${-universalRemaining} over budget` : 'universal talents remaining'}
            </span>
            <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>
              ({universalSpent} logged of {universalTalentsAvailable} gained)
            </span>
          </div>
          <p className="section-note" style={{ marginTop: -4, marginBottom: 14 }}>
            Champion classes grant talents that can be spent across more than one picker below
            (which ones depends on the class - check its description: some blend magic + combat,
            some blend combat + skill, a couple allow all three). It's one shared pool, not a
            separate budget per picker. Check the box for whichever talent you picked below, then
            log your running total spent from this pool here so the count above stays accurate.
          </p>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Total Spent From This Pool</label>
            <input
              type="number"
              min={0}
              value={character.championTalentsSpent}
              onChange={(e) => update({ championTalentsSpent: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
          </div>
        </div>
      )}

      <TalentPicker
        title="Magic Spheres (Power)"
        spheres={spheres}
        character={character}
        onChange={onChange}
        talentsAvailable={magicTalentsAvailable}
        knownKey="spheresKnown"
        talentKey="talentsKnown"
        budgetNote="Gaining a sphere for the first time costs 1 magic talent; each talent inside it costs 1 more. Budget = 1 per caster-class level, plus 2 bonus talents the first time you take a level in any casting class."
        emptyNote="No Spherecaster class levels yet - add one above to gain magic talents."
      />

      <TalentPicker
        title="Combat Spheres (Might)"
        spheres={combatSpheres}
        character={character}
        onChange={onChange}
        talentsAvailable={combatTalentsAvailable}
        knownKey="combatSpheresKnown"
        talentKey="combatTalentsKnown"
        budgetNote="Same spend pattern as magic talents, but fueled by combat talents instead. Budget shown is an approximation (1 per class level + 2 bonus at first) - real per-class tables vary and haven't all been verified yet."
        emptyNote="No Practitioner class levels yet - add one above to gain combat talents."
      />

      <TalentPicker
        title="Skill Spheres (Guile)"
        spheres={skillSpheres}
        character={character}
        onChange={onChange}
        talentsAvailable={skillTalentsAvailable}
        knownKey="skillSpheresKnown"
        talentKey="skillTalentsKnown"
        budgetNote="Real Guile rules tie talent gain to your Expertise Tier (skill ranks in the sphere's skill), not class level directly. Budget shown here is an approximation until that's modeled precisely."
        emptyNote="No Operative class levels yet - add one above to gain skill talents."
      />

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
