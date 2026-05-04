---
status: finished
branch: feat/ember-vite-codemod
created: 2026-04-15
updated: 2026-05-03
merged: pending
pr: https://github.com/trev-gulls/rfc-embers/pull/4
blocked-by: []
see-also:
  - docs/dev/2026-04-27-webpack-to-vite-debug.md
  - docs/work/finished/2026-04-27-unblock-v6-upgrade.md
  - docs/work/backlog/2026-05-03-emberdata-6-warpdrive-migration.md
  - docs/work/backlog/2026-05-03-codemod-v2-addon-bumps.md
---

# Upgrade to Ember v6 (stable) with Vite

## Outcome

Migrated `rfc-embers` from Ember 5.12 + ember-cli/webpack to **Ember 6.12 stable + Vite**
using Mainmatter's [`ember-vite-codemod`](https://github.com/mainmatter/ember-vite-codemod).

Targeted **stable** rather than LTS: per the Ember release-train policy
(<https://emberjs.com/releases/>), stable releases are production-ready after a six-week
beta cycle. v6.12 was the latest stable as of 2026-05-03; LTS designation expected late
May / early June 2026.

## What Shipped

- `ember-source` ~5.12.0 → ~6.12.0 (stable)
- `ember-cli` ~5.12.0 → ~6.12.0
- Build pipeline migrated to Vite (`vite.config.mjs` + `babel.config.mjs`)
- Broccoli-era packages removed: `ember-auto-import`, `ember-fetch`, `loader.js`,
  `webpack`, `ember-cli-terser`, `ember-cli-inject-live-reload`, `ember-cli-app-version`,
  `ember-cli-clean-css`, `ember-cli-dependency-checker`
- `ember-resolver` ^13.2.0, `ember-load-initializers` ^3.0.1, `ember-qunit` ^9.0.4,
  `@ember/test-helpers` ^5.4.1 (codemod-bumped)
- `ember-page-title` ^9.0.3, `ember-modifier` ^4.3.0, `qunit-dom` ^3.5.1,
  `ember-data` ~5.8.2 (manual bump on top)
- Test infra rewired by codemod — `tests/test-helper.ts` exports `start()`,
  `tests/index.html` uses `import.meta.glob('./**/*.{js,ts,gjs,gts}', { eager: true })`
- Dev server boots cleanly (Vite); browser-verified at two checkpoints
  (5.12 + Vite, then 6.12 + Vite) via chrome-devtools-mcp
- `npm run test:ember` — **59 tests, 59 pass, 0 fail**

## Notes

### EmberData stays on 5.8.x

The original plan called for moving to EmberData 6 / WarpDrive at the same time. This was
**cancelled in plan v0.2** — EmberData 5.8.x stays compatible with Ember 6, and the
WarpDrive migration is large enough to deserve its own pass. The deprecation warnings that
surface during tests (`ember-data:deprecate-legacy-imports`,
`warp-drive:deprecate-legacy-request-methods`) are tracked separately in
`docs/work/backlog/2026-05-03-emberdata-6-warpdrive-migration.md`.

### Manual approach abandoned

A first attempt at the migration (`feat/ember-v6-upgrade` branch, preserved as historical
record) tried to assemble the v6 + Vite config by hand and hit ~17 cascading blockers.
The lessons from that attempt are documented in
`docs/dev/2026-04-27-webpack-to-vite-debug.md` and were the reason the codemod approach
worked on the next try — most notably, the manual approach was missing the
`compatBuild(app, buildOnce)` second arg from `@embroider/vite` that bridges the compat
prebuild into Vite. Without it, `requirejs.entries` stays empty at runtime and the
resolver finds nothing, producing a silent blank page.

### `testem` pin workaround still present

The `overrides: { testem: "3.18.0" }` workaround in `package.json` is still present under
the new test setup. The codemod did not remove it; the new pipeline still runs through
testem for `npm run test:ember`. Revisit when convenient. Tracked informally — not worth
its own backlog entry yet.

### Outstanding follow-ups

- `docs/work/backlog/2026-05-03-emberdata-6-warpdrive-migration.md` — the deferred
  EmberData 6 / WarpDrive transition (captures the deprecation warnings)
- `docs/work/backlog/2026-05-03-codemod-v2-addon-bumps.md` — three v2-addon nags from the
  codemod (`@glimmer/component`, `@ember/test-helpers`, `ember-load-initializers`)

## Original Acceptance Criteria (all met)

- [x] `ember-source` upgraded to v6.x — chose stable (6.12) since LTS not yet designated
- [x] `ember-cli` upgraded to the matching v6-compatible release (6.12)
- [x] Build pipeline migrated to Vite (`vite.config.mjs` replaces `ember-cli-build.js` for
      runtime; `ember-cli-build.js` retained as a thin compat shim for `compatBuild`)
- [x] devDependencies audited; broccoli-era packages removed (see above)
- [x] `ember build --environment=production` (`vite build`) produces a working build
- [x] Dev server starts cleanly with HMR
- [x] Tests pass (59/59)
- [x] `package-lock.json` materially smaller — net diff: -10091 lines (mostly the
      removed broccoli/webpack dep tree)
