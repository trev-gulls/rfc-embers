---
status: pending
created: 2026-05-03
updated: 2026-05-03
blocked-by: []
see-also:
  - docs/work/finished/2026-04-15-ember-v6-upgrade.md
---

# Bump Codemod-Skipped V2 Addon Nags

## Goal

Address the three v2-addon nags that `ember-vite-codemod` reported (and we deliberately
skipped via `--skip-v2-addon`) during the v6 + Vite migration. Each is at a recent
version already; the codemod just wants them at their newer v2 forms / matching the
`@ember/app-blueprint` v6.12.x defaults.

This is **low priority** — the app builds, runs, and tests pass at the current versions.
Addressing it brings us closer to the canonical v6 blueprint and may simplify any future
codemod runs (e.g. for a v7 migration).

## Affected Packages

| Package | Current | Codemod-suggested | Notes |
|---------|---------|--------------------|-------|
| `@glimmer/component` | ^1.1.2 | v2 (^2.x) | The v2 form is a true V2 addon (per the V2 addon spec) — same public API, different package shape |
| `@ember/test-helpers` | ^5.4.1 | v5+ as V2 addon | Already at v5; the nag is about the package format, not the version |
| `ember-load-initializers` | ^3.0.1 | v3+ as V2 addon | Already at v3; same — package format nag |

## Acceptance Criteria

- [ ] All three packages bumped to their v2-addon-formatted releases
- [ ] `npm install` produces no resolution warnings related to these three packages
- [ ] `npm start` — dev server boots cleanly
- [ ] `npm run test:ember` — 59/59 tests still pass
- [ ] Re-running `ember-vite-codemod` (dry-run) reports no remaining v2-addon nags

## Notes

### How to discover the right versions

```bash
npx ember-vite-codemod
```

Run it from a clean git working tree on the current main branch. It will print the
v2-addon recommendations without `--skip-v2-addon`. Capture the exact version constraints
it suggests and apply them.

### Why we skipped it during the migration

We were already changing many things at once (Vite, Ember 6.12, broccoli removal). The
codemod offered `--skip-v2-addon` as a pressure release valve. Deferring the v2-addon
bumps kept the migration PR's diff focused on the actual build-pipeline change.

### Risk assessment

Very low. Each of these three addons has a stable API that's preserved across the v1→v2
package format change. The risk is purely transitive — a v2-addon-formatted package may
pull in or drop a transitive dep in a way that conflicts with another part of the graph.
If `npm install` produces resolution warnings, address them one package at a time.
