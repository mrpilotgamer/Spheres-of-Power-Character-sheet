import { useState, useMemo } from 'react';
import { spheres } from '../engine/sphereLoader.js';

const TYPE_LABELS = {
  basic: 'Basic Talents',
  blastShape: 'Blast Shapes',
  blastType: 'Blast Types',
  cure: 'Cure Talents',
  vitality: 'Vitality Talents',
  transformation: 'Transformation Talents',
  body: 'Body Talents'
};

export default function SpherePicker({ character, onChange, talentsAvailable }) {
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState('');

  const talentsSpent = character.spheresKnown.length + character.talentsKnown.length;
  const remaining = talentsAvailable - talentsSpent;

  const filteredSpheres = useMemo(() => {
    if (!query.trim()) return spheres;
    const q = query.toLowerCase();
    return spheres.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.tagline || '').toLowerCase().includes(q)
    );
  }, [query]);

  function knowsSphere(sphereId) {
    return character.spheresKnown.includes(sphereId);
  }
  function knowsTalent(sphereId, talentId) {
    return character.talentsKnown.some((t) => t.sphereId === sphereId && t.talentId === talentId);
  }
  function toggleSphere(sphereId) {
    const known = knowsSphere(sphereId);
    let spheresKnown, talentsKnown;
    if (known) {
      // dropping a sphere also drops any talents bought within it
      spheresKnown = character.spheresKnown.filter((id) => id !== sphereId);
      talentsKnown = character.talentsKnown.filter((t) => t.sphereId !== sphereId);
    } else {
      spheresKnown = [...character.spheresKnown, sphereId];
      talentsKnown = character.talentsKnown;
    }
    onChange({ ...character, spheresKnown, talentsKnown });
  }
  function toggleTalent(sphereId, talentId) {
    const known = knowsTalent(sphereId, talentId);
    const talentsKnown = known
      ? character.talentsKnown.filter((t) => !(t.sphereId === sphereId && t.talentId === talentId))
      : [...character.talentsKnown, { sphereId, talentId }];
    onChange({ ...character, talentsKnown });
  }

  function talentGroups(sphere) {
    const groups = [];
    if (sphere.talents?.length) groups.push(['basic', sphere.talents]);
    if (sphere.blastShapes?.length) groups.push(['blastShape', sphere.blastShapes]);
    if (sphere.blastTypes?.length) groups.push(['blastType', sphere.blastTypes]);
    if (sphere.cureTalents?.length) groups.push(['cure', sphere.cureTalents]);
    if (sphere.vitalityTalents?.length) groups.push(['vitality', sphere.vitalityTalents]);
    if (sphere.transformationTalents?.length) groups.push(['transformation', sphere.transformationTalents]);
    if (sphere.bodyTalents?.length) groups.push(['body', sphere.bodyTalents]);
    return groups;
  }
  function talentCount(sphere) {
    return talentGroups(sphere).reduce((n, [, list]) => n + list.length, 0);
  }

  return (
    <div className="card">
      <h2 className="card-title">
        <SphereDot known /> Spheres &amp; Magic Talents
      </h2>

      <div className="talent-budget">
        <span className="big">{Math.max(remaining, 0)}</span>
        <span className={remaining < 0 ? 'over' : 'ok'}>
          {remaining < 0 ? `${-remaining} over budget` : 'talents remaining'}
        </span>
        <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>
          ({talentsSpent} spent of {talentsAvailable} gained)
        </span>
      </div>
      <p className="section-note" style={{ marginTop: -4, marginBottom: 14 }}>
        Gaining a sphere for the first time costs 1 magic talent (its base ability), then each
        talent inside that sphere costs 1 more. Budget = 1 per caster-class level, plus 2 bonus
        talents the first time you take a level in any casting class.
      </p>

      <input
        className="search-input"
        placeholder="Search spheres..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="sphere-list">
        {filteredSpheres.map((sphere) => {
          const known = knowsSphere(sphere.id);
          const isOpen = expanded === sphere.id;
          const total = talentCount(sphere);
          const ownedCount = character.talentsKnown.filter((t) => t.sphereId === sphere.id).length;
          return (
            <div className="sphere-row" key={sphere.id}>
              <div className="sphere-row-head" onClick={() => setExpanded(isOpen ? null : sphere.id)}>
                <span className={`sphere-orb${known ? '' : ' unknown'}${sphere.populated === false ? ' stub' : ''}`} />
                <span className="sphere-row-name">{sphere.name}</span>
                <span className="sphere-row-tagline">{sphere.tagline}</span>
                {sphere.populated === false && <span className="badge-stub">stub</span>}
                {total > 0 && <span className="sphere-row-count">{ownedCount}/{total}</span>}
              </div>
              {isOpen && (
                <div className="sphere-row-body">
                  <label className="talent-item" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={known} onChange={() => toggleSphere(sphere.id)} />
                    <div>
                      <span className="talent-item-name">{sphere.baseAbility?.name || 'Base ability'}</span>
                      <span className="talent-item-cost">1 talent</span>
                      <div className="talent-item-desc">{sphere.baseAbility?.description}</div>
                    </div>
                  </label>

                  {sphere.populated === false && (
                    <p className="stub-note">
                      Full talent list not entered yet for this sphere — add it to
                      src/data/spheres/{sphere.id}.json to flesh it out.
                    </p>
                  )}

                  {talentGroups(sphere).map(([type, list]) => (
                    <div key={type}>
                      <div className="talent-group-label">{TYPE_LABELS[type]}</div>
                      {list.map((t) => (
                        <label className="talent-item" key={t.id} style={{ cursor: known ? 'pointer' : 'not-allowed', opacity: known ? 1 : 0.5 }}>
                          <input
                            type="checkbox"
                            disabled={!known}
                            checked={knowsTalent(sphere.id, t.id)}
                            onChange={() => toggleTalent(sphere.id, t.id)}
                          />
                          <div>
                            <span className="talent-item-name">{t.name}</span>
                            <span className="talent-item-cost">
                              1 talent{typeof t.spCost !== 'undefined' ? ` · ${t.spCost} sp to use` : ''}
                            </span>
                            <div className="talent-item-desc">{t.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SphereDot() {
  return <span className="sphere-orb" style={{ display: 'inline-block', verticalAlign: 'middle' }} />;
}
