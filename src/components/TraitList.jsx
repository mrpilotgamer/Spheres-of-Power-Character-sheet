function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function TraitList({ title, character, onChange, traitsKey, itemNoun }) {
  const items = character[traitsKey] || [];
  const itemNounCap = itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1);

  function update(nextItems) {
    onChange({ ...character, [traitsKey]: nextItems });
  }
  function addItem() {
    update([...items, { id: newId(), name: '', description: '' }]);
  }
  function updateItem(id, patch) {
    update(items.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function removeItem(id) {
    update(items.filter((t) => t.id !== id));
  }

  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>

      {items.length === 0 && (
        <p className="empty-hint">
          No {itemNoun}s yet - add one below and name it whatever you like.
        </p>
      )}

      <div className="trait-grid">
        {items.map((t) => (
          <div className="talent-edit-row" key={t.id}>
            <div className="field">
              <input
                placeholder={`${itemNounCap} name`}
                value={t.name}
                onChange={(e) => updateItem(t.id, { name: e.target.value })}
              />
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => removeItem(t.id)}
              aria-label={`Remove ${t.name || itemNoun}`}
            >
              ✕
            </button>
            <div className="field talent-edit-desc">
              <textarea
                rows={2}
                placeholder="Description"
                value={t.description}
                onChange={(e) => updateItem(t.id, { description: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Add {itemNoun}</button>
    </div>
  );
}
