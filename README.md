# Spherecaster

A free, open-source character builder for the whole **Spheres** system for the
Pathfinder Roleplaying Game by Drop Dead Studios: **[Spheres of Power](http://spheresofpower.wikidot.com/start)**
(magic), **Spheres of Might** (martial combat), **Spheres of Guile** (skills), and
**Champions of the Spheres** (the official Power+Might hybrid classes).

It auto-calculates the stuff that's tedious by hand — base attack bonus, saves, caster level,
spell points, sphere DCs, magic skill bonus/defense — the same way [charactersheet.co.uk](https://charactersheet.co.uk/pathfinder/#/)
does for core Pathfinder. Spheres and talents are fully freeform: each character sheet has
its own Magic/Combat/Skill Spheres cards where you name your own spheres and write your own
talents, rather than picking from a fixed built-in list.

Characters are saved in your browser (nothing leaves your device), and the whole site costs
nothing to run: it's a static site hosted for free on GitHub Pages.

## A built-in house rule

This app bakes in one permanent house rule for this table, applied to every Power/Champion
casting class regardless of its official casting ability: instead of one fixed casting stat,
casters use all three mental stats for different things -

- **Intelligence** sets the spell point pool (caster-class levels + Int mod)
- **The highest of Int/Wis/Cha** sets sphere DCs
- **Wisdom** adds to duration ("per caster level" rounds/minutes/hours), adds as bonus targets
  for `[mass]`-tagged or multi-target abilities, and adds half its mod to Alteration trait count
- **Charisma** governs any effect that explicitly adds "casting ability modifier" to damage
  dealt/healed or targets affected (e.g. Healing Aegis, Selective Blast)

This is why you won't find a "casting ability" picker anywhere in the app even for classes
that normally choose one (Incanter, Mageknight, etc.) - under this rule that choice doesn't
apply. If your group doesn't use this house rule, the main things to change by hand are the
Spell Points and Sphere DC formulas in `src/components/CharacterSheet.jsx`.

## Running it locally

You'll need [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Deploying your own copy for free

1. Create a new **public** repo on GitHub and push this code to it.
2. In the repo, go to **Settings → Pages**, and under "Build and deployment" set
   **Source** to **GitHub Actions**. (The workflow in `.github/workflows/deploy.yml`
   already does the build — you don't need to configure anything else.)
3. Open `vite.config.js` and make sure the `base` option matches your repo's name
   exactly, e.g. if your repo is `github.com/you/spherecaster`, set
   `base: '/spherecaster/'`.
4. Push to `main`. GitHub Actions will build and publish automatically — check the
   **Actions** tab for progress. Your site will be live at
   `https://<your-username>.github.io/<repo-name>/`.

Every time you (or a friend) pushes new data (more spheres, more classes) or code, the
site redeploys automatically. There's no server, no database, and no bill — GitHub Pages
and GitHub Actions are free for public repos.

### Sharing it with friends

Just send them the `https://<your-username>.github.io/<repo-name>/` URL. Anyone can use
it — their characters save locally in *their* browser, separate from everyone else's.
(See "Cloud saves" below if you'd rather everyone's characters live in one shared place.)

## Adding content

Classes live in plain JSON files under `src/data/` — no code changes needed to add
more. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the exact format. Race and
spheres/talents aren't data files at all — they're written directly on each character
sheet (see "Spheres" below).

## What's in here so far

- **Engine**: Power (magic) math is fully accurate — caster level table, spell point
  formula, sphere DC, magic skill bonus/defense. Standard Pathfinder BAB/save math and
  multiclassing work for all classes across all four systems. Might (combat sphere DC)
  and Guile (skill sphere DC) are wired up the same way. There's no talent budget or
  talent-count tracking - you write your own spheres and talents directly on the sheet,
  and it's on you to judge how many they should have.
- **Classes**: 28 total across all four systems (12 Power, 8 Might, 5 Guile, 3 Champion).
  10 of the 12 Power classes are now verified against the wiki (only Hedgewitch and
  Thaumaturge remain unconfirmed on hit die/BAB, though Hedgewitch's casting ability
  and caster type are confirmed). Might, Guile, and most Champion classes are still
  flagged `unverified` - reasonable estimates, not confirmed numbers yet.
- **Champions of the Spheres**: added as its own system, unifying Power + Might (this
  is the official scope of that book - it does not include Guile). Sage and Troubadour
  are verified against the wiki/published reviews; Prodigy's chassis is an estimate.
  None of the three classes' bespoke subsystems (Sage's Esotery, Prodigy's combo
  Sequences, Troubadour's Personas) are mechanically modeled yet - they're described in
  the class text but not simulated.
- **Spheres**: fully freeform, per character. There's no built-in sphere or talent
  library — each character sheet has a Magic/Combat/Skill Spheres card where you add
  a sphere, name it whatever you like, and add talents under it with their own name
  and description. Nothing to look up in a data file; it's on you to track what your
  table's homebrew or house-ruled spheres actually do.
- **Not modeled yet**: packages, drawbacks, feats, casting/martial/trade traditions,
  and anything from expansions beyond the three core books. Equipment/skills/feats
  currently just live in the freeform Notes box.

## Cloud saves (optional, still free)

Right now saves are local-only (`src/engine/storage.js`, backed by `localStorage`).
If your group wants everyone's characters visible in one shared place instead, the
storage layer is written as a small set of functions specifically so you can swap in
a free-tier backend (like [Firebase](https://firebase.google.com/pricing) or
[Supabase](https://supabase.com/pricing)) later without touching any UI code — just
rewrite the functions in that one file.

## License

MIT — do whatever you want with it.
