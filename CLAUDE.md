# SoP Builder — Agent Guide

Online Pathfinder 1e + Spheres of Power/Might/Guile character sheet. React 19 + Vite, no backend — characters live in localStorage. Deployed on Vercel from `main`; development happens on `Test-branch`, merged via PR.

Read `ROADMAP.md` for the staged plan and current stage before doing anything. Specs for core modules live in `docs/`.

## Commands

- `npm run dev` — Vite dev server
- `npm run lint` — oxlint
- `npx vitest run` — unit tests
- `npm run build` — production build (must pass before any stop point)

## Architecture

- `src/engine/` — pure rules logic, **no React imports**. All game math lives here, unit-tested.
  - `abilities.js` — ability scores/modifiers
  - `progression.js` — BAB, saves, caster level, spell points, DCs, MSB/MSD (multiclass-aware)
  - `modifiers.js` — typed-bonus stacking engine + `computeSheet()` derived-stats pipeline (see `docs/engine.md`)
  - `storage.js` — localStorage CRUD; `newCharacter.js` — character schema + defaults
  - `classLoader.js` — merges `src/data/*.json` class files
- `src/data/` — static JSON (classes per system, caster progression tables)
- `src/components/` — React UI. `CharacterSheet.jsx` renders pill tabs; `TraitList`/`SphereBuilder` are generic freeform group/item editors reused across tabs.
- `src/styles/` — `tokens.css` (design tokens) + `app.css`. No CSS framework.

## Conventions

- Plain JS + JSX, no TypeScript. 2-space indent, single quotes, semicolons.
- Rules math goes in `src/engine/` as pure functions; components only render and dispatch `onChange` with a full updated character object.
- Character schema changes: add defaults in `newCharacter.js` **and** handle old saved characters (missing fields) gracefully — never break existing localStorage saves.
- Rules accuracy matters: cite the rule (d20pfsrd / spheresofpower.wikidot.com) in a comment only when the math is non-obvious. The "three mental stats" house rule is per-character (`castingRules: 'house' | 'standard'`), not global.

## Team workflow

Fable (team lead): plans, writes specs, verifies stage acceptance, reports to owner. Opus agents: design + implement core engine modules. Sonnet/Haiku agents: UI wiring, data files, tests from specs. Each stage ends at a stop point: lint + tests + build + browser smoke test all green, `ROADMAP.md` updated.
