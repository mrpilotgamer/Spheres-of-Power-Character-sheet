# Deployment (Vercel)

The site deploys on [Vercel](https://vercel.com) from the `main` branch of this repo. There's no backend and no environment variables — it's a static Vite build.

## One-time setup

1. Sign in to Vercel with your GitHub account.
2. **Add New → Project**, import this repository.
3. Vercel auto-detects Vite. Accept the defaults (build command `npm run build`, output `dist`). Deploy.

That's it. Every merge to `main` triggers a production deploy automatically; pull requests get preview deployments.

## Development workflow

- Day-to-day work happens on `Test-branch`; open a PR into `main` when a stage is ready.
- Before merging: `npm run lint`, `npm test`, and `npm run build` must pass (see `CLAUDE.md`).
- Characters live in each visitor's browser localStorage — deploys never touch user data.

## History

The project originally also deployed to GitHub Pages; that workflow was retired in July 2026 in favor of Vercel-only (the old `github.io` URL stays frozen at its last deployed version).
