---
status: pending
created: 2026-04-15
updated: 2026-04-15
blocked-by: []
---

# Upgrade to Ember v6 (LTS) with Vite

## Goal

Upgrade ember-source from v5 to the stable/LTS release of v6. Ember v6 ships Vite as the
default build tool, replacing the webpack-based ember-auto-import + broccoli pipeline. The
primary payoff is a leaner dependency graph, faster builds, and native HMR in development.

This should also resolve the testem ESM/CJS incompatibility introduced in v5 if the new
test setup moves to a different runner.

## Acceptance Criteria

- [ ] `ember-source` upgraded to v6.x LTS (or stable if LTS not yet designated)
- [ ] `ember-cli` upgraded to the matching v6-compatible release
- [ ] Build pipeline migrated to Vite (`vite.config.*` replaces `ember-cli-build.js`)
- [ ] All current devDependencies audited — outdated/redundant ones (e.g. `ember-auto-import`,
      `loader.js`, `ember-cli-terser`) removed if subsumed by Vite
- [ ] `ember build --environment=production` produces a working build
- [ ] Dev server starts cleanly with working HMR
- [ ] Tests pass in CI (`npm test`)
- [ ] `package-lock.json` shows a materially reduced `node_modules` count vs pre-upgrade

## Notes

- Check the official Ember v6 upgrade guide and `ember-cli-update` before touching deps manually.
- `ember-scoped-css` and `ember-data` will need version-compatible releases for v6 — verify
  before starting.
- The `testem` pin workaround (`overrides: { testem: "3.18.0" }`) should be revisited or
  removed once the new test setup is confirmed working.
