import { useState } from 'react';
import { classesById, classesByCategory } from '../engine/classLoader.js';
import { ABILITY_KEYS, formatMod } from '../engine/abilities.js';
import { computeSheet } from '../engine/computeSheet.js';
import SphereBuilder from './SphereBuilder.jsx';
import DraftNumberInput from './DraftNumberInput.jsx';
import TraitList from './TraitList.jsx';
import sphereIndex from '../data/sphereIndex.json';
import SkillsTab from './SkillsTab.jsx';
import DefenseCard from './DefenseCard.jsx';
import WeaponsCard from './WeaponsCard.jsx';
import PlayTab from './PlayTab.jsx';

export default function CharacterSheet({ character, onChange }) {
  const [activeTab, setActiveTab] = useState('main');

  const sheet = computeSheet(character);
  const abilityMods = character.abilityMods || {};
  const { scores, mods } = sheet.abilities;
  const classLevels = sheet.classLevels;
  const totalLevel = sheet.totalLevel;

  function update(patch) {
    onChange({ ...character, ...patch });
  }
  function updateAbility(key, n) {
    update({ baseAbilities: { ...character.baseAbilities, [key]: n } });
  }
  function updateAbilityMod(key, value) {
    const n = parseInt(value, 10);
    update({ abilityMods: { ...abilityMods, [key]: Number.isNaN(n) ? 0 : n } });
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
            {character.race || 'No race'} · Level {totalLevel || 0}
            {classLevels.length > 0 && ` · ${classLevels.map((c) => `${classesById[c.classId]?.name || '?'} ${c.level}`).join(' / ')}`}
          </div>
        </div>
      </div>

      <div className="pill-tabs">
        <button
          className={`pill-tab${activeTab === 'main' ? ' active' : ''}`}
          onClick={() => setActiveTab('main')}
        >
          Character
        </button>
        <button
          className={`pill-tab${activeTab === 'play' ? ' active' : ''}`}
          onClick={() => setActiveTab('play')}
        >
          Play
        </button>
        <button
          className={`pill-tab${activeTab === 'skills' ? ' active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Skills
        </button>
        <button
          className={`pill-tab${activeTab === 'spheres' ? ' active' : ''}`}
          onClick={() => setActiveTab('spheres')}
        >
          Spheres
        </button>
        <button
          className={`pill-tab${activeTab === 'feats' ? ' active' : ''}`}
          onClick={() => setActiveTab('feats')}
        >
          Feats
        </button>
        <button
          className={`pill-tab${activeTab === 'equipment' ? ' active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment
        </button>
        <button
          className={`pill-tab${activeTab === 'notes' ? ' active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes &amp; Backstory
        </button>
      </div>

      {activeTab === 'main' && (
      <>
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
            <input value={character.race || ''} onChange={(e) => update({ race: e.target.value })} />
          </div>
          <div className="field">
            <label>Alignment</label>
            <input value={character.alignment} onChange={(e) => update({ alignment: e.target.value })} />
          </div>
          <div className="field">
            <label>Deity</label>
            <input value={character.deity} onChange={(e) => update({ deity: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Ability scores */}
      <div className="card">
        <h2 className="card-title">Ability Scores</h2>
        <div className="grid-row grid-6">
          {ABILITY_KEYS.map((key) => (
            <div className="ability-box" key={key}>
              <div className="ab-label">{key}</div>
              <DraftNumberInput
                id={`ability-${key}`}
                value={character.baseAbilities[key]}
                min={1}
                max={40}
                onCommit={(n) => updateAbility(key, n)}
              />
              <input
                type="number"
                className="ab-adjust"
                placeholder="+0"
                title="Modifier (racial or otherwise)"
                value={abilityMods[key] ?? 0}
                onChange={(e) => updateAbilityMod(key, e.target.value)}
              />
              <div className="ab-mod">{formatMod(mods[key])} ({scores[key]})</div>
            </div>
          ))}
        </div>
        <div className="section-note">Base score entered; add any racial or other flat modifier in the small box below it - the total shown in parentheses includes both.</div>
      </div>

      <TraitList
        title="Racial Traits"
        character={character}
        onChange={onChange}
        traitsKey="racialTraits"
        itemNoun="trait"
      />

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
              <DraftNumberInput
                id={`class-level-${idx}`}
                value={cl.level}
                min={1}
                max={20}
                onCommit={(n) => updateClassLevel(idx, { level: n })}
              />
            </div>
            <button
              className="btn btn-danger btn-sm"
              style={{ height: 34 }}
              onClick={() => removeClassLevel(idx)}
              aria-label="Remove class level"
            >
              ✕
            </button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addClassLevel}>+ Add class (multiclass)</button>

        <div className="field field-narrow">
          <label>Casting Rules</label>
          <select
            value={sheet.castingRules}
            onChange={(e) => update({ castingRules: e.target.value })}
          >
            <option value="house">House rule (three mental stats)</option>
            <option value="standard">Standard Spheres</option>
          </select>
        </div>

        {sheet.castingRules === 'standard' && (
          <div className="field field-narrow">
            <label>Casting Ability</label>
            <select
              value={sheet.casting.castingAbility}
              onChange={(e) => update({ castingAbility: e.target.value })}
            >
              <option value="int">Intelligence</option>
              <option value="wis">Wisdom</option>
              <option value="cha">Charisma</option>
            </select>
          </div>
        )}

        {sheet.combat.primaryMightClass?.practitionerAbility === 'choice' && (
          <div className="field field-narrow">
            <label>Practitioner Ability</label>
            <select
              value={sheet.combat.practitionerAbility}
              onChange={(e) => update({ practitionerAbilityOverride: e.target.value })}
            >
              <option value="int">Intelligence</option>
              <option value="wis">Wisdom</option>
              <option value="cha">Charisma</option>
            </select>
            <div className="section-note">Chosen once, at 1st level in this class. Used for combat sphere DCs.</div>
          </div>
        )}

        {sheet.operative.primaryGuileClass && (
          <div className="field field-narrow">
            <label>Operative Ability</label>
            <select
              value={sheet.operative.operativeAbility}
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

      <DefenseCard character={character} onChange={onChange} sheet={sheet} />

      {/* Combat & caster stats */}
      <div className="card">
        <h2 className="card-title">Combat &amp; Caster Stats</h2>
        <div className="grid-row grid-3" style={{ marginBottom: 12 }}>
          <div className="stat-box">
            <div className="stat-label">Base Attack</div>
            <div className="stat-value">{sheet.attacks.map((a) => formatMod(a)).join(' / ')}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Fort / Ref / Will</div>
            <div className="stat-value stat-value-md">
              {formatMod(sheet.saves.fort)} / {formatMod(sheet.saves.ref)} / {formatMod(sheet.saves.will)}
            </div>
            <div className="stat-sub">base {sheet.baseSaves.fort}/{sheet.baseSaves.ref}/{sheet.baseSaves.will} + ability mod</div>
          </div>
          <div className="field">
            <label>HP Max</label>
            <input
              type="number"
              min={0}
              value={character.hpMax}
              onChange={(e) => update({ hpMax: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
          </div>
        </div>

        {sheet.casting.casterClassLevels > 0 && (
          <div className="grid-row grid-4">
            <div className="stat-box">
              <div className="stat-label">Caster Level</div>
              <div className="stat-value">{sheet.casting.casterLevel}</div>
              <div className="stat-sub">{sheet.casting.primaryCasterClass ? sheet.casting.primaryCasterClass.casterType + '-caster' : 'no caster class'}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Spell Points</div>
              <div className="stat-value">{sheet.casting.spellPoints}</div>
              <div className="stat-sub">
                {sheet.castingRules === 'standard'
                  ? `class levels + ${sheet.casting.castingAbility.toUpperCase()}`
                  : `class levels + ${formatMod(mods.int)} INT`}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Sphere DC</div>
              <div className="stat-value">{sheet.casting.sphereDC}</div>
              <div className="stat-sub">
                {sheet.castingRules === 'standard'
                  ? `10 + ½CL + ${sheet.casting.castingAbility.toUpperCase()}`
                  : '10 + ½CL + highest mental mod'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">MSB / MSD</div>
              <div className="stat-value">{sheet.casting.msb} / {sheet.casting.msd}</div>
              <div className="stat-sub">caster-class levels</div>
            </div>
          </div>
        )}

        {sheet.casting.casterClassLevels > 0 && sheet.castingRules !== 'standard' && (
          <div className="grid-row grid-2 mt-14">
            <div className="stat-box">
              <div className="stat-label">Wisdom Bonus</div>
              <div className="stat-value">{formatMod(sheet.casting.wisMod)}</div>
              <div className="stat-sub text-left">
                Add to duration whenever a talent says "per caster level" (rounds/minutes/hours). Add as extra targets for [mass]-tagged or multi-target abilities. Add half to Alteration trait count.
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Charisma Bonus</div>
              <div className="stat-value">{formatMod(sheet.casting.chaMod)}</div>
              <div className="stat-sub text-left">
                Use for any effect that adds your casting ability modifier to damage dealt/healed, or to targets affected (e.g. Healing Aegis, Selective Blast).
              </div>
            </div>
          </div>
        )}

        {sheet.combat.mightClassCount > 0 && (
          <div className={`grid-row grid-4${sheet.casting.casterClassLevels > 0 ? ' mt-14' : ''}`}>
            <div className="stat-box">
              <div className="stat-label">Combat Sphere DC</div>
              <div className="stat-value">{sheet.combat.combatSphereDC}</div>
              <div className="stat-sub">
                {sheet.combat.mightClassCount > 1
                  ? '10 + ½BAB + best practitioner mod'
                  : `10 + ½BAB + ${sheet.combat.primaryMightClass?.practitionerAbility === 'higher_cha_int' ? 'higher of CHA/INT' : (sheet.combat.primaryMightClass?.practitionerAbility === 'choice' ? sheet.combat.practitionerAbility.toUpperCase() : (sheet.combat.primaryMightClass?.practitionerAbility || 'wis').toUpperCase())}`}
              </div>
            </div>
            <div className="field">
              <label>Martial Focus (max)</label>
              <input
                type="number"
                min={0}
                max={3}
                value={character.martialFocusMax}
                onChange={(e) => update({ martialFocusMax: Math.max(0, Math.min(3, parseInt(e.target.value, 10) || 0)) })}
              />
            </div>
            <div className="stat-box" style={{ gridColumn: 'span 2' }}>
              <div className="stat-label">About Martial Focus</div>
              <div className="stat-sub text-left">
                A single resource spent to trigger powerful combat talents or to treat a Fort/Ref save as a rolled 13. Regained after a minute of rest or by taking the total defense action (max once per round).
              </div>
            </div>
          </div>
        )}

        {sheet.operative.primaryGuileClass && (
          <div className={`grid-row grid-4${(sheet.casting.casterClassLevels > 0 || sheet.combat.mightClassCount > 0) ? ' mt-14' : ''}`}>
            <div className="stat-box">
              <div className="stat-label">Operative Mod</div>
              <div className="stat-value">{formatMod(sheet.operative.operativeMod)}</div>
              <div className="stat-sub">{sheet.operative.operativeAbility.toUpperCase()}, chosen above</div>
            </div>
            <div className="stat-box" style={{ gridColumn: 'span 3' }}>
              <div className="stat-label">Skill Sphere DC</div>
              <div className="stat-value stat-value-sm">10 + ½ ranks in the sphere's skill + operative mod</div>
              <div className="stat-sub">Varies per sphere/skill - calculate per use, ranks aren't tracked separately here yet.</div>
            </div>
          </div>
        )}
      </div>

      <WeaponsCard character={character} onChange={onChange} sheet={sheet} />

      <TraitList
        title="Class Features"
        character={character}
        onChange={onChange}
        traitsKey="classFeatures"
        itemNoun="feature"
      />
      </>
      )}

      {activeTab === 'play' && (
        <PlayTab character={character} onChange={onChange} sheet={sheet} />
      )}

      {activeTab === 'skills' && (
        <SkillsTab character={character} onChange={onChange} sheet={sheet} />
      )}

      {activeTab === 'spheres' && (
      <>
      <SphereBuilder
        title="Magic Spheres (Power)"
        character={character}
        onChange={onChange}
        spheresKey="customSpheres"
        nameIndex={sphereIndex.magic}
      />

      <SphereBuilder
        title="Combat Spheres (Might)"
        character={character}
        onChange={onChange}
        spheresKey="customCombatSpheres"
        nameIndex={sphereIndex.combat}
      />

      <SphereBuilder
        title="Skill Spheres (Guile)"
        character={character}
        onChange={onChange}
        spheresKey="customSkillSpheres"
        nameIndex={sphereIndex.skill}
      />
      </>
      )}

      {activeTab === 'feats' && (
        <TraitList
          title="Feats"
          character={character}
          onChange={onChange}
          traitsKey="feats"
          itemNoun="feat"
        />
      )}

      {activeTab === 'equipment' && (
        <SphereBuilder
          title="Equipment"
          character={character}
          onChange={onChange}
          spheresKey="customEquipment"
          groupNoun="Category"
          groupNounPlural="Categories"
          itemNoun="Item"
        />
      )}

      {activeTab === 'notes' && (
        <div className="card">
          <h2 className="card-title">Notes &amp; Backstory</h2>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Notes</label>
            <textarea
              rows={6}
              placeholder="Feats, skills, gear, anything else you're tracking..."
              value={character.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Backstory</label>
            <textarea
              rows={10}
              placeholder="Your character's history..."
              value={character.backstory || ''}
              onChange={(e) => update({ backstory: e.target.value })}
            />
          </div>
        </div>
      )}
    </>
  );
}
