# Roadmap

## Shipped (v1, merged to main 2026-07-17, PR #11)

Stages 1–5 of the original build plan: modifier/stacking engine + `computeSheet()` pipeline · per-character house/standard casting rules · full skills & combat automation (AC/touch/FF, init, CMB/CMD, weapons) · Play mode (quick-toggle buffs, conditions, HP/spell-point/focus/custom trackers) · sphere autocomplete + wiki links · JSON export/import/duplicate · design polish, print stylesheet, a11y sweep. 123+ unit tests. Full audit: `docs/audit-2026-07.md` (criticals fixed same day; open items feed the tiers below).

Working agreements: 5-hour staged sessions with stop points · Fable leads/verifies, Opus designs core logic, Sonnet/Haiku implement · rules math only in `src/engine/` (pure, tested) · never break old localStorage saves.

## Needed (correctness / data safety — audit follow-ups)

- [ ] Storage-full handling: surface `writeAll` failures as a visible banner; don't optimistically update React state on failed persist (audit #7)
- [ ] `loseDexToAc` effect capability so blinded/stunned/grappled compute real AC (audit #8)
- [ ] Input hardening sweep: NaN-safe level/BAB path, clamp negative acp/maxDex/HP-max/speed, martial focus max, rank cap at character level, clear-and-retype friendly number inputs (audit #10–12, #17, #18, #22)
- [ ] Verify casterProgression mid/low tables vs the published Table: Caster Level, levels 2–4 (audit #13)
- [ ] Owner decision then cleanup: GitHub Pages vs Vercel-only (then fix SETUP.md — audit #23)

## Should have (core play value)

- [ ] Casting traditions & drawbacks/boons (the biggest unmodeled SoP subsystem: tradition picks casting ability in standard mode, drawbacks grant extra spell points)
- [ ] Talent-count budget: talents-known tracker vs talents-spent across spheres (mirrors the Google Sheet's tracking)
- [ ] Favored-class-bonus tracking (+1 HP or +1 skill point per level, per class)
- [ ] Encumbrance & carry weight from Strength + equipment weights
- [ ] Level-up helper: guided "add a level" flow (HP roll, skill points, new talents note)
- [ ] Share-as-URL (compressed character in the hash) — deferred Stage 4 stretch
- [ ] Import robustness: deep-merge nested schema objects, file-size guard, SphereBuilder field guards (audit #15, #19, #20)

## Nice to have

- [ ] Full talent database + pickers (revisits the owner's earlier freeform-only decision; scraper → JSON per sphere)
- [ ] Cloud sync / accounts (characters across devices; Supabase-class free tier)
- [ ] Party/GM view (multiple characters side by side, initiative order)
- [ ] Light theme + theme toggle
- [ ] Dice roller wired to computed modifiers (click a save/skill/attack to roll)

## Quality of life

- [ ] Undo/redo (character-state history)
- [ ] Autosave indicator ("saved" tick, storage-usage meter)
- [ ] Collapsible cards + remembered per-tab scroll positions
- [ ] Skill search/filter and hide-untrained toggle
- [ ] Print-all-tabs mode (single print document instead of active tab only)
- [ ] Drag-reorder for freeform lists (traits, feats, spheres, weapons)
- [ ] Keyboard navigation polish; unique SVG gradient ids; stable effect-row keys (audit #16, #21)
