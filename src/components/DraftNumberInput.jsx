import { useDraftNumber, commitDraftNumber } from '../hooks/useDraftNumber.js';

// Thin wrapper around a number <input> using useDraftNumber - see that file
// for why. Only used where clear-and-retype friendliness matters (ability
// scores, class levels); other number inputs keep their existing inline
// clamp-on-every-keystroke behavior.
export default function DraftNumberInput({ id, value, min, max, onCommit, ...rest }) {
  const [draft, setDraft] = useDraftNumber(id, value);

  function commit() {
    const n = commitDraftNumber(draft, { min, max });
    setDraft(String(n));
    if (n !== value) onCommit(n);
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur(); // triggers the onBlur commit above
      }}
      {...rest}
    />
  );
}
