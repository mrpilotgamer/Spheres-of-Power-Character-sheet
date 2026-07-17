# Roadmap

Each stage fits one ~5-hour session and ends at a stop point (lint + tests + build + browser check green, this file updated). Owner decisions, locked in: freeform authoring with autocomplete (no scraped talent DB) · house rule is a per-character toggle · localStorage + JSON export/import (no cloud yet) · automation before data QoL.

## Stage 1 — Foundation & core engine (DONE 2026-07-17)

- [x] CLAUDE.md + ROADMAP.md, delete stray `app.css.tmp.*`
- [x] Modifier engine: typed-bonus stacking (PF1e rules) + `computeSheet()` pipeline (`src/engine/modifiers.js` + `computeSheet.js`, spec in `docs/engine.md`)
- [x] House-rule toggle: `castingRules: 'house' | 'standard'` + `castingAbility`; logic moved from CharacterSheet.jsx into engine
- [x] Vitest + unit tests (54 tests: progression, abilities, stacking, both casting modes, old-save defaults)
- [x] Verification: lint/tests/build green; browser smoke passed (Incanter 3 / Armorist 2: CL 4, SP 8/DC 15 house, SP 5/DC 12 standard-WIS; hand-checked)

## Stage 2 — Skills & combat automation (DONE 2026-07-17)

- [x] Skills tab: full PF1e skill list (skills.json, 35 entries), ranks/class-skill (auto from class data + override)/misc, ACP, totals, budget from skillsPerLevel + INT, custom Craft/Perform/Profession
- [x] Combat: Defense & Movement card (AC/touch/flat-footed w/ maxDex + size), initiative, CMB/CMD, speed, Weapons card with computed to-hit iteratives & damage strings
- [x] Verification: lint/93 tests/build green; browser hand-check passed (AC 17/11/16, CMB +5/CMD 16, Spellcraft +11, ACP −1 applied, budget 35)

## Stage 3 — Play mode (DONE 2026-07-17)

- [x] Quick-toggle buff system (Play tab, BuffsCard) + starter library (buffLibrary.json, 16 buffs) + custom buff editor
- [x] Resource trackers: HP damage/heal + nonlethal, spell points, martial focus pips, custom trackers
- [x] Conditions checklist (conditions.json, 12 conditions) as modifier sources, incl. skill.all target
- [x] Rules fix found in verification: manual defense inputs now stack as typed bonuses with `ac` effects (Mage Armor over worn armor no longer double-counts); deflection reaches CMD
- [x] Verification: lint/114 tests/build green; browser check passed (Mage Armor no-op over armor 4, Barkskin 17→19, Shaken −2 everywhere, HP/SP trackers)

## Stage 4 — Data QoL (DONE 2026-07-17)

- [x] Name index (`src/data/sphereIndex.json`: magic/combat/skill sphere names + wikidot URLs) → autocomplete (`<datalist>`) + "wiki ↗" links in `SphereBuilder`, wired for the three sphere tabs (not Equipment, which has no index)
- [x] JSON export (active character, pretty-printed Blob download) / import (file input, inline error on bad JSON, never `alert()`) / duplicate (per-row "⧉") in Sidebar + storage.js (`duplicateCharacter`, `importCharacter`)
- [ ] Stretch (not done): share-as-URL
- [x] Verification: lint/123 tests (+9 new in `storage.test.js`)/build green; browser check passed (autocomplete + wiki link on Alteration, Equipment tab confirmed to have no datalist, duplicate + export + bad/good import all verified against a throwaway character, cleaned up afterward without touching the real saved character)

## Stage 5 — Design & polish

- [ ] Design-system pass, mobile audit, print stylesheet, onboarding/empty states
- [ ] Deployment cleanup (retire GitHub Pages workflow if Vercel-only)

## Backlog

Encumbrance/wealth · level-up wizard · cloud sync/accounts · full talent database (if owner changes mind)
