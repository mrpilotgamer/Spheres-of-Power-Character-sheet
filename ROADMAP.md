# Roadmap

Each stage fits one ~5-hour session and ends at a stop point (lint + tests + build + browser check green, this file updated). Owner decisions, locked in: freeform authoring with autocomplete (no scraped talent DB) · house rule is a per-character toggle · localStorage + JSON export/import (no cloud yet) · automation before data QoL.

## Stage 1 — Foundation & core engine (DONE 2026-07-17)

- [x] CLAUDE.md + ROADMAP.md, delete stray `app.css.tmp.*`
- [x] Modifier engine: typed-bonus stacking (PF1e rules) + `computeSheet()` pipeline (`src/engine/modifiers.js` + `computeSheet.js`, spec in `docs/engine.md`)
- [x] House-rule toggle: `castingRules: 'house' | 'standard'` + `castingAbility`; logic moved from CharacterSheet.jsx into engine
- [x] Vitest + unit tests (54 tests: progression, abilities, stacking, both casting modes, old-save defaults)
- [x] Verification: lint/tests/build green; browser smoke passed (Incanter 3 / Armorist 2: CL 4, SP 8/DC 15 house, SP 5/DC 12 standard-WIS; hand-checked)

## Stage 2 — Skills & combat automation

- [ ] Skills tab: full PF1e skill list (skills.json), ranks/class-skill/misc, ACP, totals, skill-point budget
- [ ] Combat: AC breakdown (touch/flat-footed), initiative, CMB/CMD, weapons list with computed to-hit/damage

## Stage 3 — Play mode

- [ ] Quick-toggle buff system through the modifier engine + starter buff library
- [ ] Resource trackers: HP (damage/heal), spell points, martial focus, custom per-day
- [ ] Conditions checklist as modifier sources

## Stage 4 — Data QoL

- [ ] Name index (sphere/talent/feat names + wikidot URLs) → autocomplete + wiki links in freeform editors
- [ ] JSON export/import, character duplication; stretch: share-as-URL

## Stage 5 — Design & polish

- [ ] Design-system pass, mobile audit, print stylesheet, onboarding/empty states
- [ ] Deployment cleanup (retire GitHub Pages workflow if Vercel-only)

## Backlog

Encumbrance/wealth · level-up wizard · cloud sync/accounts · full talent database (if owner changes mind)
