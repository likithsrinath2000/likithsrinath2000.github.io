# likith.o11y — personal site

A single-page, dependency-free personal site with an observability theme, for
**Likith Srinath** — ex-SRE, now Senior Software Engineer in Observability
(Logs & Events) @ LinkedIn.

Pure static HTML/CSS/JS — no build step, no framework, no dependencies.

## Highlights

- **Live log-stream backdrop** — a Matrix-style canvas of structured log lines
  (INFO/DEBUG/WARN/ERROR, timestamps, services).
- **Event pipeline canvas** — animated packets flowing services → collector →
  stream → store → query.
- **Live metrics ticker + sparkline** — simulated ingest / p99 / volume / error-rate.
- **Career log explorer** — the experience section is styled as an Azure Data
  Explorer / KQL console: query bar, level badges, activity histogram, and
  filter chips that rewrite the KQL and filter rows live. Click a row to expand.
- Typewriter role line, scroll-reveal, focus-card micro-visuals.
- Respects `prefers-reduced-motion` (animations disabled, content intact).
- Work section fetches live GitHub repos, with a curated offline fallback.

## Structure

```
index.html
assets/css/style.css
assets/js/main.js
.github/workflows/deploy.yml   # GitHub Pages CI
vercel.json                    # Vercel config
.nojekyll                      # tell Pages to serve files as-is
```

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy — GitHub Pages

1. Create a repo and push:
   ```bash
   git init && git add -A && git commit -m "o11y personal site"
   git branch -M main
   git remote add origin git@github.com:likithsrinath2000/<repo>.git
   git push -u origin main
   ```
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) deploys on every push
   to `main`. Site lands at `https://likithsrinath2000.github.io/<repo>/`.

> For a user site at `https://likithsrinath2000.github.io`, name the repo
> `likithsrinath2000.github.io`.

## Deploy — Vercel

```bash
npm i -g vercel   # once
vercel            # from this directory, follow prompts
```
Framework preset: **Other**. No build command, output dir = repo root.

## Editing content

- Career/experience data lives in the `CAREER` array near the bottom of
  `assets/js/main.js` — edit roles, durations, levels, and details there.
- Tech stack chips: `stack` array in `main.js`.
- Colors/theme: CSS custom properties in `:root` in `assets/css/style.css`.
