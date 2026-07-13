function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function SphereBuilder({ title, character, onChange, spheresKey }) {
  const spheres = character[spheresKey] || [];

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
          ? { ...s, talents: [...s.talents, { id: newId(), name: '', description: '' }] }
          : s
      )
    );
  }
  function updateTalent(sphereId, talentId, patch) {
    update(
      spheres.map((s) =>
        s.id === sphereId
          ? { ...s, talents: s.talents.map((t) => (t.id === talentId ? { ...t, ...patch } : t)) }
          : s
      )
    );
  }
  function removeTalent(sphereId, talentId) {
    update(
      spheres.map((s) =>
        s.id === sphereId ? { ...s, talents: s.talents.filter((t) => t.id !== talentId) } : s
      )
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>

      {spheres.length === 0 && (
        <p className="section-note" style={{ marginTop: -4, marginBottom: 12 }}>
          No spheres yet - add one below and name it whatever you like.
        </p>
      )}

      <div className="sphere-list">
        {spheres.map((sphere) => (
          <div className="sphere-row" key={sphere.id}>
            <div className="sphere-edit-head">
              <div className="field" style={{ flex: 2 }}>
                <input
                  placeholder="Sphere name"
                  value={sphere.name}
                  onChange={(e) => updateSphere(sphere.id, { name: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: 3 }}>
                <input
                  placeholder="Theme / tagline (optional)"
                  value={sphere.tagline}
                  onChange={(e) => updateSphere(sphere.id, { tagline: e.target.value })}
                />
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => removeSphere(sphere.id)}>✕</button>
            </div>

            <div className="sphere-row-body">
              {sphere.talents.map((t) => (
                <div className="talent-edit-row" key={t.id}>
                  <div className="field">
                    <input
                      placeholder="Talent name"
                      value={t.name}
                      onChange={(e) => updateTalent(sphere.id, t.id, { name: e.target.value })}
                    />
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeTalent(sphere.id, t.id)}>✕</button>
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
              <button className="btn btn-ghost btn-sm" onClick={() => addTalent(sphere.id)}>+ Add talent</button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addSphere}>+ Add sphere</button>
    </div>
  );
}
