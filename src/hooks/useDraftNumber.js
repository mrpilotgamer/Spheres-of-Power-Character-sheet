import { useEffect, useState } from 'react';

// A number input that's pleasant to clear-and-retype: while focused it holds
// a free-typed string (no min/max clamp fighting every keystroke), and only
// parses + clamps back into a number on blur or Enter.
//
// `id` identifies *which* stat this draft tracks (e.g. an ability key or a
// class-row index) - the draft resyncs from `value` whenever `id` or `value`
// changes (switching rows, an external update, or the caller's own commit
// flowing back through props). It does NOT resync on every render, so typing
// isn't clobbered mid-edit.
export function useDraftNumber(id, value) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, value]);

  return [draft, setDraft];
}

// Parses a draft string into an integer clamped to [min, max]. Empty/garbage
// input falls back to `min` (matching the old inline clamp behavior, where a
// cleared field snapped back to the floor of the allowed range).
export function commitDraftNumber(draft, { min = -Infinity, max = Infinity } = {}) {
  const parsed = parseInt(draft, 10);
  const base = Number.isNaN(parsed) ? min : parsed;
  return Math.max(min, Math.min(max, base));
}
