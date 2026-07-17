import conditionsData from '../data/conditions.json';

const CONDITIONS = conditionsData || [];

// Conditions card: character.conditions is an array of ids; presence in the
// array IS active (conditions can't be individually disabled, only removed).
// computeSheet looks each id up in src/data/conditions.json and treats it as
// an always-on modifier source - nothing here does that math.
export default function ConditionsCard({ character, onChange }) {
  const active = new Set(character.conditions || []);

  function toggle(id, checked) {
    const next = new Set(active);
    if (checked) next.add(id);
    else next.delete(id);
    onChange({ ...character, conditions: Array.from(next) });
  }

  return (
    <div className="card">
      <h2 className="card-title">Conditions</h2>
      <div className="conditions-grid">
        {CONDITIONS.map((c) => (
          <label className="condition-item" key={c.id} title={c.description}>
            <input
              type="checkbox"
              checked={active.has(c.id)}
              onChange={(e) => toggle(c.id, e.target.checked)}
            />
            <span>
              <span className="condition-name">{c.name}</span>
              <span className="condition-desc">{c.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
