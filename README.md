# Spherecaster

A free, open-source character builder for **[Spheres of Power](http://spheresofpower.wikidot.com/start)**,
the third-party magic system for the Pathfinder Roleplaying Game by Drop Dead Studios.

It auto-calculates the stuff that's tedious by hand — base attack bonus, saves, caster level,
spell points, sphere DC, magic skill bonus/defense — and lets you pick spheres and talents
against a live talent budget, the same way [charactersheet.co.uk](https://charactersheet.co.uk/pathfinder/#/)
does for core Pathfinder.

Characters are saved in your browser (nothing leaves your device), and the whole site costs
nothing to run: it's a static site hosted for free on GitHub Pages.

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

This is the important part, since the game has way more content than made it into this
first version (see "What's in here so far" below). Everything about spheres, classes,
and races lives in plain JSON files under `src/data/` — no code changes needed to add
more. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the exact format.

## What's in here so far

- **Engine**: fully accurate — caster level table, spell point formula, sphere DC,
  magic skill bonus/defense, magic talent budget, standard Pathfinder BAB/save math,
  multiclassing.
- **Classes**: the Incanter is fully verified against the wiki. The other 11 core
  Spherecaster classes are seeded with reasonable stats but flagged `unverified` in
  the data and in the UI dropdown — double check them against the wiki before you
  rely on them, or better yet, help fix them (see CONTRIBUTING.md).
- **Spheres**: all 23 core magic spheres are populated with a real base ability and a
  curated set of talents (roughly 10-14 each), written in original wording. This isn't
  every talent from the books — some spheres have 30+ in print — but it's enough to
  actually build and play a character with any of them. See CONTRIBUTING.md if you
  want to keep expanding any sphere toward full completeness.
- **Not modeled yet**: combat spheres, skill spheres, packages, drawbacks, feats,
  casting traditions, and every class/sphere from expansions beyond the core book.
  Equipment/skills/feats currently just live in the freeform Notes box.

## Cloud saves (optional, still free)

Right now saves are local-only (`src/engine/storage.js`, backed by `localStorage`).
If your group wants everyone's characters visible in one shared place instead, the
storage layer is written as a small set of functions specifically so you can swap in
a free-tier backend (like [Firebase](https://firebase.google.com/pricing) or
[Supabase](https://supabase.com/pricing)) later without touching any UI code — just
rewrite the functions in that one file.

## License

MIT — do whatever you want with it.
