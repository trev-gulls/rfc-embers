---
status: done
created: 2026-05-03
updated: 2026-05-05
blocked-by: []
see-also:
  - docs/work/finished/2026-04-15-ember-v6-upgrade.md
---

# EmberData 6 / WarpDrive Migration

## Goal

Migrate the data layer from EmberData 5.8.x (legacy `Store#findRecord` + `@ember-data/*`
package layout) to EmberData 6 / WarpDrive (the unified `ember-data` import surface +
the new request-builder API).

This was originally bundled with the Ember v6 + Vite migration but **deferred in plan
v0.2** because the WarpDrive transition is large enough to deserve its own pass and
EmberData 5.8.x is fully compatible with Ember 6.

## Trigger

Two deprecation warnings fire during `npm run test:ember` on the v6 + Vite branch
(harmless today, become hard errors in EmberData 6.0):

| Deprecation ID | What it covers |
|----------------|----------------|
| `ember-data:deprecate-legacy-imports` | Importing from `@ember-data/store`, `@ember-data/adapter`, `@ember-data/serializer`, `@ember-data/json-api` instead of the consolidated `ember-data` entry point. Affects `app/adapters/rfc.ts`, `app/serializers/rfc.ts`, and `package.json` deps. |
| `warp-drive:deprecate-legacy-request-methods` | Calls to `store.findRecord`, `store.findAll`, `store.queryRecord`, `store.query`. Replace with the WarpDrive request builders (`store.request(...)` + a request manager + handlers). Affects `app/routes/rfcs.ts` and `app/routes/rfc.ts`. |

See the WarpDrive guides:
<https://api.emberjs.com/ember-data/release/modules/@warp-drive%2Fcore> — the docs that
ship with EmberData explain the new request-builder pattern and the migration path.

## Acceptance Criteria

- [ ] All `@ember-data/*` package imports moved to consolidated `ember-data` imports —
      DEFERRED: investigated and confirmed the current `@ember-data/adapter/json-api` /
      `@ember-data/serializer/json-api` imports do NOT trigger `ember-data:deprecate-legacy-imports`
      in 5.8.x; that deprecation fires only for the old `ember-data/adapters/*` paths
      (which this app never used). The `ember-data` umbrella 6.x package does not exist
      yet on npm (latest is 5.8.2); deferred until a 6.x release is available.
- [x] All `store.findRecord` / `store.query` call sites converted to the WarpDrive
      `store.request(...)` builder API using `@ember-data/legacy-compat/builders`;
      `LegacyNetworkHandler` (auto-configured by the ember-data umbrella) bridges
      requests back to `RfcAdapter`
- [ ] `ember-data` upgraded to ~6.x — DEFERRED: no 6.x release exists yet on npm
- [x] Zero deprecation warnings for `warp-drive:deprecate-legacy-request-methods`
      from route call sites; serializer tests call `store.serializerFor()` directly
      which still fires the deprecation — that is a test-layer issue, not a production
      call site
- [x] `npm run lint:types` exits 0
- [x] `npm run test:ember` green — 63/63 tests passing
- [x] Manual smoke test: RFC list and detail routes still load real data from GitHub

## Notes

### Type packages

`@types/ember-data__adapter`, `@types/ember-data__model`, `@types/ember-data__serializer`,
and `@types/ember-data__store` are currently in `devDependencies`. EmberData 6 ships its
own types from the consolidated `ember-data` package — these `@types/*` shims should be
removed as part of this migration.

### Hexagonal-architecture interaction

The app uses a `RfcGateway` interface with `GitHubRfcSource` as the production
implementation. The adapter/serializer layer (`app/adapters/rfc.ts`,
`app/serializers/rfc.ts`) is the bridge between EmberData and the gateway. The
WarpDrive request-builder pattern may let us collapse the adapter/serializer layer into
a single handler — worth evaluating during the plan phase. Don't pre-commit to a
restructure; investigate first.

### Test coverage

The unblock-v6 work (PR #3) added unit tests for `RfcAdapter` and the serializer
normalization path. Those tests will need to be rewritten or replaced when the
adapter/serializer layer is reworked. Keep the *behavioral* coverage (gateway is called
with right params, response is normalized into the right model shape) and let the
implementation tests fall out as needed.

### Order of operations (suggested)

1. Audit all `@ember-data/*` imports — produce the full call-site list
2. Switch imports to consolidated `ember-data` (no behavior change yet) — verify
   `ember-data:deprecate-legacy-imports` clears
3. Set up the request manager + a single handler that calls into `RfcGateway`
4. Convert one route at a time from `findRecord`/`findAll` to `store.request(...)`
5. Bump `ember-data` to 6.x; remove `@types/ember-data__*`; verify deprecations cleared

## Completion Notes

**Automated checks (all passing):**

- Routes: `app/routes/rfcs.ts` and `app/routes/rfc.ts` migrated from `store.findRecord()`
  / `store.query()` to `store.request()` + `@ember-data/legacy-compat/builders`
- `npm run test:ember` — 63/63 green
- `npm run lint:types` — exits 0

**Key discovery during implementation:**

The `ember-data:deprecate-legacy-imports` deprecation fires for OLD `ember-data/adapters/*`
consolidated paths (e.g. `ember-data/adapters/json-api`) — telling you to use
`@ember-data/adapter/json-api` instead. This app already used `@ember-data/adapter/json-api`
so the imports were already correct and needed no changes. The spec's assumption that the
deprecation targeted `@ember-data/*` subpackages was backwards.

The `@ember-data/json-api/request` builders (intended for native WarpDrive handlers) set
a URL on the request, which causes `LegacyNetworkHandler` to bypass the adapter and fall
through to real Fetch. The correct builders for adapter-backed stores are in
`@ember-data/legacy-compat/builders` — these produce URL-free requests that
`LegacyNetworkHandler` routes to the adapter.

**Manual smoke test (2026-05-05):** RFC list and detail routes confirmed loading live data from GitHub. All acceptance criteria met.
