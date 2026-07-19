import { useId, useMemo } from 'react';
import sphereIndex from '../data/sphereIndex.json';

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function SphereBuilder({
  title,
  character,
  onChange,
  spheresKey,
  groupNoun = 'Sphere',
  groupNounPlural = `${groupNoun}s`,
  itemNoun = 'Talent',
  nameIndex
}) {
  const spheres = character[spheresKey] || [];
  const groupNounLower = groupNoun.toLowerCase();
  const groupNounPluralLower = groupNounPlural.toLowerCase();
  const itemNounLower = itemNoun.toLowerCase();
  const datalistId = useId();

  // Map lower-cased name -> index entry, so the wiki link lookup is case-insensitive
  // without re-scanning the array on every keystroke.
  const byLowerName = useMemo(() => {
    if (!nameIndex) return null;
    const map = new Map();
    for (const entry of nameIndex) map.set(entry.name.toLowerCase(), entry);
    return map;
  }, [nameIndex]);

  function update(nextSpheres) {
    onChange({ ...character, [spheresKey]: nextSpheres });
  }
  function addSphere() {
    update([...spheres, { id: newId(), name: '', tagline: '', talents: [] }]);
  }
  function updateSphere(sphereId, patch) {
    update(spheres.map((s) => (s.id === sphereId ? { ...s, ...patch } : s)));
  }
  function removeSphere(sphereId) {
    update(spheres.filter((s) => s.id !== sphereId));
  }
  function addTalent(sphereId) {
    update(
      spheres.map((s) =>
        s.id === sphereId
          ? { ...s, talents: [...(s.talents || []), { id: newId(), name: '', description: '' }] }
          : s
      )
    );
  }
  function updateTalent(sphereId, talentId, patch) {
    update(
      spheres.map((s) =>
        s.id === sphereId
          ? { ...s, talents: (s.talents || []).map((t) => (t.id === talentId ? { ...t, ...patch } : t)) }
          : s
      )
    );
  }
  function removeTalent(sphereId, talentId) {
    update(
      spheres.map((s) =>
        s.id === sphereId ? { ...s, talents: (s.talents || []).filter((t) => t.id !== talentId) } : s
      )
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>

      {spheres.length === 0 && (
        <p className="empty-hint">
          No {groupNounPluralLower} yet - add one below and name it whatever you like.
        </p>
      )}

      {nameIndex && (
        <datalist id={datalistId}>
          {nameIndex.map((entry) => (
            <option key={entry.slug} value={entry.name} />
          ))}
        </datalist>
      )}

      <div className="sphere-list">
        {spheres.map((sphere) => {
          const wikiEntry = byLowerName?.get((sphere.name || '').trim().toLowerCase());
          return (
          <div className="sphere-row" key={sphere.id}>
            <div className="sphere-edit-head">
              <div className="field">
                <input
                  placeholder={`${groupNoun} name`}
                  value={sphere.name || ''}
                  onChange={(e) => updateSphere(sphere.id, { name: e.target.value })}
                  list={nameIndex ? datalistId : undefined}
                />
              </div>
              {wikiEntry && (
                <a
                  className="sphere-wiki-link"
                  href={sphereIndex._urlBase + wikiEntry.slug}
                  target="_blank"
                  rel="noopener"
                  title={`Look up "${wikiEntry.name}" on the Spheres wiki`}
                >
                  wiki ↗
                </a>
              )}
              <div className="field" style={{ flex: 3 }}>
                <input
                  placeholder="Theme / tagline (optional)"
                  value={sphere.tagline}
                  onChange={(e) => updateSphere(sphere.id, { tagline: e.target.value })}
                />
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeSphere(sphere.id)}
                aria-label={`Remove ${sphere.name || groupNounLower}`}
              >
                ✕
              </button>
            </div>

            <div className="sphere-row-body">
              {(sphere.talents || []).map((t) => (
                <div className="talent-edit-row" key={t.id}>
                  <div className="field">
                    <input
                      placeholder={`${itemNoun} name`}
                      value={t.name}
                      onChange={(e) => updateTalent(sphere.id, t.id, { name: e.target.value })}
                    />
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeTalent(sphere.id, t.id)}
                    aria-label={`Remove ${t.name || itemNounLower}`}
                  >
                    ✕
                  </button>
                  <div className="field talent-edit-desc">
                    <textarea
                      rows={2}
                      placeholder="Description"
                      value={t.description}
                      onChange={(e) => updateTalent(sphere.id, t.id, { description: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => addTalent(sphere.id)}>+ Add {itemNounLower}</button>
            </div>
          </div>
          );
        })}
      </div>

      <button className="btn btn-ghost btn-sm mt-10" onClick={addSphere}>+ Add {groupNounLower}</button>
    </div>
  );
}
