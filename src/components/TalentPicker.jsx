import { useState, useMemo } from 'react';

const TYPE_LABELS = {
  basic: 'Basic Talents',
  blastShape: 'Blast Shapes',
  blastType: 'Blast Types',
  cure: 'Cure Talents',
  vitality: 'Vitality Talents',
  transformation: 'Transformation Talents',
  body: 'Body Talents'
};

export default function TalentPicker({
  title,
  spheres,
  character,
  onChange,
  talentsAvailable,
  knownKey,
  talentKey,
  budgetNote,
  emptyNote
}) {
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState('');

  const known = character[knownKey] || [];
  const talents = character[talentKey] || [];
  const talentsSpent = known.length + talents.length;
  const remaining = talentsAvailable - talentsSpent;

  const filteredSpheres = useMemo(() => {
    if (!query.trim()) return spheres;
    const q = query.toLowerCase();
    return spheres.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.tagline || '').toLowerCase().includes(q)
    );
  }, [query, spheres]);

  function knowsSphere(sphereId) {
    return known.includes(sphereId);
  }
  function knowsTalent(sphereId, talentId) {
    return talents.some((t) => t.sphereId === sphereId && t.talentId === talentId);
  }
  function toggleSphere(sphereId) {
    const isKnown = knowsSphere(sphereId);
    let nextKnown, nextTalents;
    if (isKnown) {
      nextKnown = known.filter((id) => id !== sphereId);
      nextTalents = talents.filter((t) => t.sphereId !== sphereId);
    } else {
      nextKnown = [...known, sphereId];
      nextTalents = talents;
    }
    onChange({ ...character, [knownKey]: nextKnown, [talentKey]: nextTalents });
  }
  function toggleTalent(sphereId, talentId) {
    const isKnown = knowsTalent(sphereId, talentId);
    const nextTalents = isKnown
      ? talents.filter((t) => !(t.sphereId === sphereId && t.talentId === talentId))
      : [...talents, { sphereId, talentId }];
    onChange({ ...character, [talentKey]: nextTalents });
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
        <span className="sphere-orb" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
        {title}
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
      {budgetNote && (
        <p className="section-note" style={{ marginTop: -4, marginBottom: 14 }}>
          {budgetNote}
        </p>
      )}

      {talentsAvailable === 0 && emptyNote && (
        <p className="stub-note" style={{ marginBottom: 12 }}>{emptyNote}</p>
      )}

      <input
        className="search-input"
        placeholder="Search spheres..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="sphere-list">
        {filteredSpheres.map((sphere) => {
          const isKnown = knowsSphere(sphere.id);
          const isOpen = expanded === sphere.id;
          const total = talentCount(sphere);
          const ownedCount = talents.filter((t) => t.sphereId === sphere.id).length;
          return (
            <div className="sphere-row" key={sphere.id}>
              <div className="sphere-row-head" onClick={() => setExpanded(isOpen ? null : sphere.id)}>
                <span className={`sphere-orb${isKnown ? '' : ' unknown'}${sphere.populated === false ? ' stub' : ''}`} />
                <span className="sphere-row-name">{sphere.name}</span>
                <span className="sphere-row-tagline">{sphere.tagline}</span>
                {sphere.populated === false && <span className="badge-stub">stub</span>}
                {total > 0 && <span className="sphere-row-count">{ownedCount}/{total}</span>}
              </div>
              {isOpen && (
                <div className="sphere-row-body">
                  <label className="talent-item" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={isKnown} onChange={() => toggleSphere(sphere.id)} />
                    <div>
                      <span className="talent-item-name">{sphere.baseAbility?.name || 'Base ability'}</span>
                      <span className="talent-item-cost">1 talent</span>
                      <div className="talent-item-desc">{sphere.baseAbility?.description}</div>
                    </div>
                  </label>

                  {sphere.populated === false && (
                    <p className="stub-note">
                      Full talent list not entered yet for this sphere.
                    </p>
                  )}

                  {talentGroups(sphere).map(([type, list]) => (
                    <div key={type}>
                      <div className="talent-group-label">{TYPE_LABELS[type]}</div>
                      {list.map((t) => (
                        <label className="talent-item" key={t.id} style={{ cursor: isKnown ? 'pointer' : 'not-allowed', opacity: isKnown ? 1 : 0.5 }}>
                          <input
                            type="checkbox"
                            disabled={!isKnown}
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
