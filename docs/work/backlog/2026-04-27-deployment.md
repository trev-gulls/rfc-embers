---
status: pending
priority: low
created: 2026-04-27
updated: 2026-04-27
blocked-by: []
---

# Deployment

## Goal

Ship the app to a public URL. The app is a static Ember build with no server-side
component, so a static hosting platform is the natural fit.

## Acceptance Criteria

- [ ] Production build (`npm run build`) produces a deployable `dist/`
- [ ] App is deployed to a public URL and loads correctly
- [ ] CI pipeline runs `npm run build` and deploys on merge to `main`
- [ ] Environment-specific config (e.g. GitHub API base URL, optional token) is
      injectable at build time via env vars — no secrets committed
- [ ] Deployment target and process documented in README

## Notes

### Hosting options

**GitHub Pages** — free, zero config for public repos, deploy via `gh-pages` branch or
Actions. Static assets only; suits this app exactly.

**Netlify / Vercel** — free tier, automatic preview deploys per PR, instant rollbacks.
Netlify has first-class Ember support (`@netlify/plugin-ember`). Better DX than Pages.

**Recommendation:** Netlify for the PR preview deploys; worth it even for a side project.

### CI

- Use GitHub Actions — already the expected platform given the GitHub-based workflow.
- Cache `node_modules` to keep build times under 2 minutes.
- Consider gating deployment on `npm test` passing.

### Config

- `GITHUB_TOKEN` (optional) — raises API rate limit from 60 to 5000 req/hr. Should be
  injectable but not required; app must degrade gracefully without it.
- `EMBER_ENV=production` — already set by `npm run build`.
