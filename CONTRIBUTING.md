# Adding content

Everything game-specific lives in `src/data/` as plain JSON. You don't need to know
React or touch any component code to add a sphere, class, or race — just add or edit
a JSON file in the right shape and it shows up automatically next time the site builds.

Please write descriptions in your own words rather than copy-pasting from the wiki —
keep it short and mechanical (what it costs, what it does), not the original flavor text.

## Adding or completing a sphere

Each sphere is one file in `src/data/spheres/`, named after its id (e.g. `nature.json`).
There are already stub files for every sphere that isn't fully filled in yet — just edit
the existing file rather than creating a new one.

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

Classes live together in `src/data/classes.json` as one array. Add an object like:

```json
{
  "id": "your-class-id",
  "name": "Your Class",
  "category": "Spherecaster",
  "verified": false,
  "hitDie": 8,
  "babType": "threeQuarter",
  "goodSaves": ["will"],
  "skillsPerLevel": 6,
  "classSkills": ["Bluff", "Knowledge (arcana)"],
  "casterType": "mid",
  "casterAbility": "cha",
  "talentProgression": "standard",
  "description": "One or two sentences about the class's theme.",
  "source": "where these numbers came from"
}
```

Field notes:
- `babType`: `"full"`, `"threeQuarter"`, or `"half"` — the engine derives the whole
  base attack bonus table from this, so you don't need to type out 20 rows.
- `goodSaves`: array containing any of `"fort"`, `"ref"`, `"will"` — same deal, the
  engine derives the save progression.
- `casterType`: `"high"`, `"mid"`, `"low"`, or `"none"` for non-casting classes.
- `casterAbility`: `"int"`, `"wis"`, `"cha"`, or `"choice"` if the class picks at 1st level.
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
