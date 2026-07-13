# Adding content

Everything game-specific lives in `src/data/` as plain JSON. You don't need to know
React or touch any component code to add a sphere, class, or race — just add or edit
a JSON file in the right shape and it shows up automatically next time the site builds.

Please write descriptions in your own words rather than copy-pasting from the wiki —
keep it short and mechanical (what it costs, what it does), not the original flavor text.

## Adding or completing a sphere

There are three sphere folders now, one per system - use whichever matches what you're adding:

- `src/data/spheres/` - magic spheres (Spheres of Power)
- `src/data/combatSpheres/` - combat spheres (Spheres of Might)
- `src/data/skillSpheres/` - skill spheres (Spheres of Guile)

Each sphere is one file in its folder, named after its id (e.g. `nature.json`, or
`guardian.json` under combatSpheres). There are already stub files for every sphere
that isn't fully filled in yet — just edit the existing file rather than creating a
new one. The JSON shape is identical across all three folders:

```json
{
  "id": "nature",
  "name": "Nature",
  "tagline": "One line describing the sphere's theme.",
  "populated": true,
  "baseAbility": {
    "name": "Geomancing",
    "description": "What the sphere lets you do with no talents spent."
  },
  "talents": [
    {
      "id": "some-talent-slug",
      "name": "Some Talent",
      "type": "basic",
      "spCost": 0,
      "description": "One or two sentences: what it costs to activate and what it does."
    }
  ]
}
```

Notes:
- `id` must be unique and match the filename (minus `.json`).
- Set `"populated": true` once the sphere has a real talent list — this removes the
  "stub" badge in the UI.
- `spCost` is the spell-point cost to *use* the talent's effect (often `0`), which is
  separate from the fact that every talent always costs **1 magic talent** to acquire.
- If a sphere has themed sub-groups (Destruction's blast shapes/types, Life's
  cure/vitality talents), you can add extra arrays like `"blastShapes": [...]` or
  `"cureTalents": [...]` alongside `"talents"` — look at `destruction.json` and
  `life.json` for real examples. Any array of talent-shaped objects you add will
  need a matching label in `TYPE_LABELS` in `src/components/SpherePicker.jsx` (one
  line each) if you introduce a new group name.

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

## Adding a race

Races live together in `src/data/races.json`. Follow the existing entries' shape —
`abilityMods` for fixed +/- modifiers, or `abilityNote` + no `abilityMods` for a
floating "+2 to one ability score of your choice" race like Human.

## Bigger additions (packages, drawbacks, feats, combat/skill spheres)

These aren't modeled in the app yet at all. If you want to add a new category:
1. Add a new JSON file/array under `src/data/` for it.
2. Add a small loader in `src/engine/` if it needs derived math (see `sphereLoader.js`
   and `progression.js` for the pattern).
3. Add a UI section in `src/components/` to display and select it, similar to
   `SpherePicker.jsx`.

Opening an issue or a draft PR with just the data (even without UI code) is still
useful — someone else can wire up the display.
