# Adding content

Everything game-specific lives in `src/data/` as plain JSON. You don't need to know
React or touch any component code to add a class — just add or edit a JSON file in
the right shape and it shows up automatically next time the site builds.

Please write descriptions in your own words rather than copy-pasting from the wiki —
keep it short and mechanical (what it costs, what it does), not the original flavor text.

## Spheres and talents aren't data files anymore

There's no built-in sphere/talent library to edit. Each character sheet has its own
"Magic Spheres", "Combat Spheres", and "Skill Spheres" cards where you type in your
own sphere names and, inside each one, your own talents (name + description) —
see `src/components/SphereBuilder.jsx`. Nothing to contribute here in JSON form; if
you want to change how spheres/talents are structured or displayed, that's the
component to edit.

## Adding or fixing a class

Classes are split across four files by system - add to whichever matches:

- `src/data/classes.json` - Spherecaster classes (Power)
- `src/data/mightClasses.json` - Practitioner classes (Might)
- `src/data/guileClasses.json` - Operative classes (Guile)
- `src/data/championClasses.json` - Champion classes (Champions of the Spheres - the
  official Power+Might hybrid book)

All four share the same shape. Add an object like:

```json
{
  "id": "your-class-id",
  "name": "Your Class",
  "category": "Spherecaster",
  "system": "power",
  "verified": false,
  "hitDie": 8,
  "babType": "threeQuarter",
  "goodSaves": ["will"],
  "skillsPerLevel": 6,
  "classSkills": ["Bluff", "Knowledge (arcana)"],
  "casterType": "mid",
  "casterAbility": "cha",
  "description": "One or two sentences about the class's theme.",
  "source": "where these numbers came from"
}
```

Field notes:
- `category`: the display grouping shown in the class dropdown - `"Spherecaster"`,
  `"Practitioner"`, `"Operative"`, or `"Champion"` for the four systems.
- `system`: `"power"`, `"might"`, `"guile"`, or `"champion"` - this is what the engine
  uses to route DC/caster math, so it must match the folder/file you're adding to.
- `babType`: `"full"`, `"threeQuarter"`, or `"half"` — the engine derives the whole
  base attack bonus table from this, so you don't need to type out 20 rows.
- `goodSaves`: array containing any of `"fort"`, `"ref"`, `"will"` — same deal, the
  engine derives the save progression.
- Power classes only: `casterType` (`"high"`/`"mid"`/`"low"`/`"none"`) and
  `casterAbility` (`"int"`/`"wis"`/`"cha"`/`"choice"`).
- Might and Guile classes: set `"casterType": "none"`. Guile classes should also set
  `"operativeAbility": "choice"` (this is accurate to the real rules - operatives pick
  Int/Wis/Cha the first time they gain a skill talent).
- Champion classes: set `"system": "champion"`. If the class casts magic (like Sage),
  set `casterType`/`casterAbility` as normal - caster level and spell points still work
  through the standard Power math. A Champion class that's Might-only (like Troubadour)
  should instead use `"system": "might"` with `casterType: "none"`, same as any other
  Practitioner class — it'll still show up in the "Champion" category dropdown group
  since that's controlled by `category`, separate from `system`.
- Set `"verified": true` once you've checked the numbers against the wiki page for
  that class — until then, leave it `false` so the UI keeps warning people.

## Race isn't a data file either

Like spheres/talents, race is a freeform text field on the character sheet (Identity
card) and ability-score modifiers are typed directly into each ability box — there's
no `races.json` to edit anymore.

## Bigger additions (packages, drawbacks, feats)

These aren't modeled in the app yet at all. If you want to add a new category that
needs real data-driven math (not freeform text like spheres/talents):
1. Add a new JSON file/array under `src/data/` for it.
2. Add a small loader in `src/engine/` if it needs derived math (see `classLoader.js`
   and `progression.js` for the pattern).
3. Add a UI section in `src/components/` to display and select it.

Opening an issue or a draft PR with just the data (even without UI code) is still
useful — someone else can wire up the display.
