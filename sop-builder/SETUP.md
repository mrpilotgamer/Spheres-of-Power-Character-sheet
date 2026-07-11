# First-time setup (one-time, ~5 minutes)

You'll need a free GitHub account. If you don't have one, sign up at github.com first.

## 1. Create the repo

1. Go to github.com → **New repository**.
2. Name it something like `spheres-of-power-builder` (whatever you pick, remember it — you'll need it in step 4).
3. Keep it **Public** (required for free GitHub Pages) and don't initialize it with a README (you already have one).
4. Click **Create repository**.

## 2. Push this code to it

Unzip this project, open a terminal in that folder, then run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

(Replace `YOUR-USERNAME` and `YOUR-REPO-NAME` with your actual GitHub username and the repo name you picked.)

## 3. Match the base path to your repo name

If you named your repo anything other than `spheres-of-power-builder`, open `vite.config.js`
and change this line to match:

```js
base: '/YOUR-REPO-NAME/',
```

Commit and push that change too (`git add -A && git commit -m "fix base path" && git push`).

## 4. Turn on GitHub Pages

1. In your repo on GitHub, go to **Settings → Pages**.
2. Under "Build and deployment" → **Source**, choose **GitHub Actions**.
3. That's it — no further config needed, since `.github/workflows/deploy.yml` already
   tells GitHub how to build and publish the site.

## 5. Watch it deploy

Go to the **Actions** tab in your repo. You should see a "Deploy to GitHub Pages" run
in progress. Once it's green (usually under a minute), your site is live at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

Send that link to your friends. Every time you push new commits to `main` (like more
sphere data), it automatically rebuilds and redeploys — no extra steps needed.
