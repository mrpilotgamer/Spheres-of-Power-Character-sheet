# Engine spec: modifiers + computeSheet

Two pure modules under `src/engine/` (no React). UI components call
`computeSheet(character)` once and render the result — they never do rules math.

## Modifier engine (`modifiers.js`)

### Data model

A **modifier source** is a toggleable bundle of effects:

```js
{ id, name, enabled, effects: [{ target, type, value }] }
```

- `enabled` — source contributes unless explicitly `false`.
- `target` — the stat key an effect points at (see list below).
- `type` — one of `BONUS_TYPES` (below); defaults to `untyped` if omitted.
- `value` — signed integer (positive bonus / negative penalty).

`character.modifiers` is an array of these (may be `undefined` on old saves —
treat as `[]`). `computeSheet` applies every source except those with
`enabled === false` (missing `enabled` counts as on), matching modifiers.js's
`activeSources()` semantics.

### Target keys

Current and forward-looking keys (the set grows in later stages):

`ability.str` `ability.dex` `ability.con` `ability.int` `ability.wis`
`ability.cha` · `ac` `ac.touch` `ac.flatFooted` · `attack` `damage` ·
`save.fort` `save.ref` `save.will` · `init` `cmb` `cmd` · `skill.<id>` ·
`speed` · `casterLevel`

### Bonus types & stacking

Types: `alchemical, armor, circumstance, competence, deflection, dodge,
enhancement, inherent, insight, luck, morale, natural_armor, profane, racial,
resistance, sacred, shield, size, trait, untyped`.

- `dodge`, `circumstance`, `untyped` bonuses **stack with themselves**.
- Every other type contributes **only its single highest** bonus.
- **Penalties (negative values) always stack**, regardless of type.
- Each target stacks independently. (Cross-target rules like one deflection
  bonus feeding both `ac` and `ac.touch` are a later-stage concern.)

### Exports

- `BONUS_TYPES: string[]`, `STACKING_TYPES: Set<string>`
- `stackEffects(effects) => number` — stack a flat `[{type, value}]` list.
- `collectBonuses(sources, target) => number` — stacked total for one target.
- `collectMany(sources, targets) => { [target]: number }` — several targets in
  one pass; prefer this when computing many stats at once.

## Derived stats (`computeSheet.js`)

`computeSheet(character, opts?) => result`. `opts.classesById` overrides the
class table (defaults to the merged `classLoader.js` map). Reuses
`abilities.js` / `progression.js` for all base math — no duplication.

### Casting modes

`character.castingRules` is `'house'` (default; missing on old saves ⇒ `'house'`)
or `'standard'`.

- **house** — INT drives the spell pool; the **highest** of INT/WIS/CHA drives
  the sphere DC; WIS (duration/targets) and CHA (damage/healing) are surfaced as
  notes.
- **standard** — one `character.castingAbility` ∈ `int|wis|cha` (default `int`)
  drives **both** pool and DC.

### Result shape

```
{
  castingRules,
  abilities: { scores: {str..cha}, mods: {str..cha} },   // incl. ability.* effects
  totalLevel,
  classLevels,                        // filtered [{classId, level}]
  levelsBySystem: { power, might, guile, champion },
  bab, attacks,                       // attacks = iteratives from BAB, e.g. [11,6,1]
  attackBonus, damageBonus,           // modifier totals (for later weapon rows)
  saves: { fort, ref, will },         // base + ability mod + save.* effects
  baseSaves: { fort, ref, will },
  casting: {
    casterClassLevels, casterLevel,   // casterLevel includes casterLevel effects
    spellPoints, sphereDC, msb, msd,
    castingAbility, poolAbilityMod, dcAbilityMod,
    wisMod, chaMod,                   // house-rule notes
    primaryCasterClass
  },
  combat: { practitionerMod, combatSphereDC, practitionerAbility,
            mightClassCount, primaryMightClass },
  operative: { operativeMod, operativeAbility, primaryGuileClass },
  bonuses: { init, cmb, cmd, speed }  // collected modifier totals, not yet
                                      // assembled into full stats (Stage 2)
}
```

Fields resolve to safe zeros/nulls when a character has no matching classes, so
callers can render unconditionally.

## Stage 2: skills & combat (`skills.js` + `computeSheet.js`)

`skills.js` is pure and data-driven off `src/data/skills.json`
(`{ id, name, ability, acp, trainedOnly, family }`). Knowledge ships all 10
subskills as concrete entries; Craft/Perform/Profession ship one **placeholder**
each (`family` ∈ `PLACEHOLDER_FAMILIES`) that users instantiate as custom skills.

### Schema additions (`newCharacter.js`)

All optional — `computeSheet` supplies defaults, so old saves never migrate.

- `skills: {}` — id → `{ ranks, misc, classSkillOverride }` (`classSkillOverride:
  true` forces a class skill on, for traits).
- `customSkills: []` — `{ id, family, name }` (id like `craft-alchemy`); ability/
  acp/trainedOnly are inherited from the family placeholder.
- `skillPointsMisc: 0` · `size: 'medium'` · `initiativeMisc: 0` · `speed: 30`
- `defense: { armorBonus, shieldBonus, naturalArmor, deflection, dodgeMisc,
  miscAc, maxDex (null = uncapped), acp (stored positive) }`
- `weapons: []` — `{ id, name, attackAbility 'str'|'dex', attackMisc, damageDice,
  damageAbility 'str'|'dex'|'none', damageMult 1|1.5|0.5, damageMisc, notes }`

### Skills

- `isClassSkill(entry, classSkillStrings)` — matches a class's display strings by
  exact name, bare family (`Craft`), or `<Family> (all)` (`Knowledge (all)`).
  `computeSheet` passes the **union** of every class's `classSkills` (multiclass).
- `skillTotal(...)` — ranks + abilityMod + (3 if class skill **and** ranks > 0) +
  misc + stacked `skill.<id>` effects − ACP (only on `acp:true` skills).
  Trained-only with 0 ranks still returns a number but flags `unusable: true`.
- `skillPointsBudget(classLevels, classesById, intMod, miscBonus)` — Σ
  `max(1, skillsPerLevel + intMod) × level` + miscBonus.

### AC / CMB / CMD / init / speed / weapons

- `SIZE_MODS` (exported): fine +8 … colossal −8, applied to AC and attack. CMB/CMD
  use the **special size modifier** = `−SIZE_MODS[size]`.
- `acTotals`: `ac` = 10 + armor + shield + natural + deflection + dodgeMisc +
  miscAc + dex (capped by `maxDex`) + size + `ac` effects. `touch` drops
  armor/shield/natural (and their effect types) but keeps dex/dodge/deflection/
  size/misc, plus `ac.touch` effects. `flatFooted` drops dex and all dodge
  bonuses, plus `ac.flatFooted` effects.
- `init` = dex + `initiativeMisc` + `init` effects. `speed` = base + `speed`.
- `cmb` = BAB + str + special size + `cmb` effects. `cmd` = 10 + BAB + str +
  dex(capped) + special size + `cmd` effects + dodgeMisc + a stacked total of
  the manual defense inputs and `ac` effects, filtered per PF1e RAW ("circumstance,
  deflection, dodge, insight, luck, morale, profane, and sacred bonuses to AC
  also apply to CMD; penalties to AC also apply"): all negative-value effects
  regardless of type, plus positive effects whose type is one of circumstance/
  deflection/dodge/insight/luck/morale/profane/sacred. Armor/shield/natural/
  enhancement/competence/size-typed positive AC bonuses do not reach CMD.
- `weapons[]`: `attacks` = each BAB iterative + ability mod + size + attackMisc +
  `attack` effects; `damage` = `damageDice` + (floor(abilityMod × damageMult) +
  damageMisc + `damage` effects), rendered as a dice string.
- `skills[]` rows: `{ id, name, ability, total, ranks, misc, classSkill,
  acpApplied, unusable, trainedOnly }`, plus `skillPoints: { budget, spent }`.
  `acp` and `size` are also exposed at the top level.

UI may render these result rows/totals; it must not recompute any of the math
(no ability mods, size tables, class-skill matching, or dice assembly in JSX).

## Stage 3: play-mode engine (`modifiers.js` + `computeSheet.js`)

At-the-table state: buffs/conditions that flip on and off, and resources
(HP, spell points, martial focus, custom trackers) that count down. Still pure —
UI mutates the character and re-runs `computeSheet`; it never does the math.

### New target: `skill.all`

`skill.all` effects apply to **every** computed skill row. Per skill, its
`skill.all` effects and that skill's own `skill.<id>` effects are pooled into a
**single** stack, so normal typed-stacking applies across both (e.g. a
competence bonus to all skills and a competence bonus to one skill do not both
count — only the higher wins). `collectCombined(sources, targets)` is the
primitive: it pools several target keys into one `stackEffects` call, unlike
`collectMany`, which stacks each target independently.

### Conditions flow

- `character.conditions: []` — an array of condition **ids**.
- `src/data/conditions.json`: `[{ id, name, description, effects:[{target,type,value}] }]`.
  The `effects` shape is identical to a modifier source's, so an active
  condition is treated as an always-on modifier source.
- In `computeSheet`, each id is looked up in the library (unknown ids are
  **skipped**), turned into a source `{ id:'condition:<id>', name, enabled:true,
  effects }`, and appended to the character's **enabled** `modifiers`. Every
  downstream collect (AC, saves, skills, CMB/CMD, attack/damage, …) sees them.
- Conditions cannot be disabled individually — presence in the array **is**
  active. To clear one, remove its id from `character.conditions`.
- Buffs live in `src/data/buffLibrary.json` (same effect shape); adding a buff
  copies its entry into `character.modifiers` as a toggleable source. Nothing in
  the engine special-cases buffs — they are ordinary modifier sources.

### Play state (`result.play`)

```
play: {
  hp:          { max, current, nonlethal },
  spellPoints: { max, spent, remaining },   // remaining clamped >= 0
  martialFocus:{ max, current },            // current clamped [0, max]
  trackers:    [{ id, name, max, current }] // current clamped [0, max]
}
```

- `hp.max` = `hpMax`; `hp.current` = `hpCurrent`, but **missing** (undefined/null)
  → `max` so old saves start unhurt — an explicit `0` stays `0` (downed).
  `hp.nonlethal` = `hpNonlethal` (default 0).
- `spellPoints.max` = the computed `casting.spellPoints` pool; `spent` =
  `spellPointsSpent` (default 0); `remaining` = `max − spent`, floored at 0.
- `martialFocus.max` = `martialFocusMax`; `current` = `martialFocusCurrent`, but
  **missing** → `max` (starts focused), then clamped to `[0, max]`.
- `trackers` pass through `character.trackers` with each `current` clamped to
  `[0, max]` in the computed copy.

### Schema additions (`newCharacter.js`)

All optional — `computeSheet` supplies defaults, so old saves never migrate:
`hpNonlethal: 0`, `spellPointsSpent: 0`, `martialFocusCurrent: 1`,
`trackers: []`, `conditions: []` (`hpCurrent` already existed).

### The recompute rule (UI contract)

The UI never edits computed play numbers directly. To change table state it
mutates the **character** and re-runs `computeSheet`:

- Toggle a buff → set `character.modifiers[i].enabled = true|false`.
- Toggle a condition → add/remove its id in `character.conditions`.
- Spend/regain a resource → write `spellPointsSpent` / `martialFocusCurrent` /
  `hpCurrent` / `hpNonlethal` / a tracker's `current`.

Recompute does the rest (stacking, clamping, downstream stats).

### Source flags: `loseDexToAc`

A modifier source (or condition source) may carry a `flags: string[]` array of
capability flags alongside its `effects`. The engine currently understands one:

- **`loseDexToAc`** — the source denies the creature its Dexterity bonus to AC
  (PF1e RAW). `computeSheet` sets `denyDex = true` when *any* active source has
  this flag, so a custom buff can deny Dex just as a condition does. `blinded`
  and `stunned` in `src/data/conditions.json` carry it (their −2 AC penalties are
  separate `effects`, applied on top).

When `denyDex`:

- `acTotals.ac` and `acTotals.touch` use `Math.min(dexMod, 0)` for the Dex term
  (a **negative** Dex still applies; a positive one is lost) and drop **all**
  dodge contributions — `dodgeMisc` and every dodge-typed `ac` effect.
  Deflection / armor / natural / etc. are unaffected.
- `acTotals.flatFooted` already models denied-Dex (no Dex, no dodge), so it is
  unchanged.
- `cmd` gets the same treatment: `Math.min(dexMod, 0)` for the Dex term, minus
  `dodgeMisc` and positive dodge-typed AC effects. Per RAW a flat-footed CMD
  keeps its other bonuses and all penalties (AC penalties always reach CMD).

`denyDex` (boolean) is exposed at the top level of the result (next to `acp`) so
the UI can badge the state.

### AC stacking with manual defense inputs

The manual `defense` inputs are typed: armor / shield / natural_armor /
deflection seed the same stack as `ac`-targeted effects, so a worn-armor
input and an armor-typed buff (Mage Armor) take the higher value rather than
summing. `dodgeMisc` and `miscAc` are flat adds (dodge/untyped stack anyway).
Deflection (input or effect), and any other CMD-eligible-typed AC bonus/any AC
penalty, also feeds CMD (see the CMB/CMD/init/speed/weapons section above),
stacked once alongside the AC stack rather than summed separately.
