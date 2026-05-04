# Ember v5 → v6 Vite Migration Debug Log

## Context

Migrating `rfc-embers` from Ember 5.12 (ember-cli webpack-era pipeline) to Ember 6.12 with Embroider + Vite. The app uses `classicEmberSupport()` + `ember()` + `babel()` from `@embroider/vite`.

---

## Blocker History

### 1. Vite version selection

**Why not v5:** `@embroider/vite` is ESM-only. Vite 5 uses `require()` to load plugin config files — can't load ESM-only plugins.

**Why not v8:** Vite 8 uses Rolldown instead of Rollup. The `ember()` plugin has a `hasRolldown` guard (line 46 of ember.js) but Embroider's classic compat assumptions don't fully work under Rolldown yet.

**Current choice: Vite 7.3.2** — still Rollup-based (`rollup: '^4.40.0'` in its deps), supports ESM plugins. Within `@embroider/vite`'s peer dep range (`>= 5.2.0`).

---

### 2. `ember-load-initializers` AMD require failure

**Error:** `Rollup failed to resolve import "require" from ember-load-initializers.72bcdb2d/.../index.js`

**Root cause:** `ember-load-initializers` does `import require from 'require'` — importing the AMD loader's `require` function, which is provided by `vendor.js` at runtime. There is no npm package named `require`. Rollup can't resolve it statically.

**Fix:** Removed `loadInitializers(App, config.modulePrefix)` from `app.ts` and the import. Safe because:
- There are no files under `app/initializers/` (no file-based initializers to discover)
- The only initializer is defined inline via `App.initializer({...})`, which bypasses the AMD discovery mechanism entirely

---

### 3. `./config/environment` relative import resolution

**Error:** `Could not resolve "./config/environment" from "app/app.ts"`

**Root cause:** Classic Ember AMD resolution resolved relative imports relative to the *module ID* (`rfc-embers/app` → `rfc-embers/config/environment`). Vite/ESM resolves relative to the *file path* (`app/app.ts` → `app/config/environment.*`), which doesn't exist.

**Fix:** Changed to the package-absolute import `rfc-embers/config/environment`. This is what the Embroider resolver is designed to handle.

---

### 4. `rfc-embers/config/environment` not resolvable

**Error:** `Rollup failed to resolve import "rfc-embers/config/environment" from "app/app.ts"`

**Root cause (deep):** The `@embroider/core` module resolver has NO special case for `{modulePrefix}/config/environment`. Traced the full resolution path:

1. `beforeResolve` → `handleRenaming`: app is an engine (`isEngine() = true`), so the auto-upgraded self-import path is skipped. No `exports` field in package.json, so the v2 self-import path is also skipped. Passes through unchanged.
2. `defaultResolve` → Rollup native resolve fails (no `rfc-embers` package in `node_modules/`).
3. `fallbackResolve` → `searchAppTree` only covers V2 addon `app-js` merge map entries. The main app's own files are NOT in the merge map. Returns `undefined`. Fallback exits.

**What was tried first:** Creating `app/config/environment.ts` hoping the Embroider merge map would pick it up. It didn't — the merge map is only built from V2 addon `app-js` declarations in `package.json`, not from files on disk under `app/`.

**Fix:** Add a Vite virtual module plugin for `rfc-embers/config/environment`. The plugin:
- Intercepts `resolveId` for the module
- Provides an `load` that returns ESM code reading from the `<meta>` tag injected by `classicEmberSupport()`'s `contentFor()` plugin
- Mirrors exactly what the classic AMD `config-module` content-for did (see `content-for.json` → `config-module` key)

---

## Current File State

### `vite.config.ts`
```ts
import { defineConfig } from 'vite';
import { classicEmberSupport, ember, extensions } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  plugins: [
    classicEmberSupport(),
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
      plugins: [
        ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
        ['@babel/plugin-transform-runtime'],
      ],
    }),
    emberConfigEnvironment(), // virtual module plugin for config/environment
  ],
});
```

### `app/app.ts` (changes from original)
- Removed `import loadInitializers from 'ember-load-initializers'`
- Removed `loadInitializers(App, config.modulePrefix)` call
- Changed `import config from './config/environment'` → `import config from 'rfc-embers/config/environment'`

### `index.html`
- Added at project root (Vite requires this as the entry point)
- Entry script: `<script type="module" src="/app/app.ts">`
- Vendor script: `<script src="/assets/vendor.js">` (pre-built AMD runtime, handled by `scripts()` plugin)
- Content-for placeholders preserved: `{{content-for "head"}}`, etc.

### 5. vendor.js path mismatch

**Symptom:** Build succeeded but `dist/index.html` had `<script src="/assets/vendor.js">` while the emitted file was at `dist/@embroider/virtual/vendor.js`.

**Root cause:** The classic ember-cli AMD convention is `<script src="/assets/vendor.js">`. The `scripts()` plugin fingerprints it from `{rootDir}/assets/vendor.js`. But in Embroider+Vite, vendor content is provided by the Embroider virtual module system as `@embroider/virtual/vendor.js` — not from `tmp/compat-prebuild/assets/vendor.js`. The `scripts()` plugin couldn't find it at the expected path and emitted nothing for vendor.js.

**Fix:** Changed `index.html` to reference `/@embroider/virtual/vendor.js` directly. The `scripts()` plugin's `transformHTML` handles `/@embroider/virtual/...` prefix paths by prepending the base URL. The Embroider virtual vendor is emitted to `dist/@embroider/virtual/vendor.js` by the resolver's `generateBundle` hook.

### Warning: `<script src="/@embroider/virtual/vendor.js"> can't be bundled without type="module"`
This is expected and harmless. Vite warns about non-module scripts in HTML during build, but the `scripts()` plugin from `classicEmberSupport()` handles virtual vendor as a pre-built asset — it's emitted as-is, not bundled. The warning does not cause build failure.

---

### 6. `@embroider/macros` runtime import error

**Error:** `Uncaught SyntaxError: The requested module '/node_modules/@embroider/macros/src/index.js?v=c7bf52e4' does not provide an export named 'isDevelopingApp'`

**Root cause (multi-layer):**

1. `['@embroider/macros/babel']` was added as a Babel plugin entry. This is **wrong** — `@embroider/macros/babel` (→ `src/babel.js`) exports `buildMacros`, not a default Babel plugin. Babel rejects it with "Must export a default export when using ES6 modules", causing a cascade that breaks **all** Babel transforms.
2. With Babel transforms broken, files importing `isDevelopingApp` from `@embroider/macros` pass through un-transformed.
3. `@embroider/macros` is **intentionally excluded from dep optimization** by the `ember()` plugin (see `ember.js:44`): `config.optimizeDeps.exclude.push('@embroider/macros')`. It also sets `config.esbuild = false`, disabling Vite's built-in CJS→ESM conversion.
4. Result: `@embroider/macros/src/index.js` (CJS, `exports.xxx = ...`) is served raw to the browser. The browser cannot import named exports from raw CJS — it expects live ESM bindings.

The design intent: the macros Babel plugin compiles away ALL imports from `@embroider/macros` before they reach the browser. The package should never be imported at runtime.

**Fix:** Replace `['@embroider/macros/babel']` with the correct usage pattern:

```ts
import { buildMacros } from '@embroider/macros/babel';
const { babelMacros } = buildMacros();

// then in babel plugins:
plugins: [
  ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
  ['@babel/plugin-transform-runtime'],
  ...babelMacros,  // spread the real plugin configs from buildMacros
],
```

`buildMacros()` reads the project root, creates a `MacrosConfig` with proper dev settings (`mode: "run-time"`, `isDevelopingPackageRoots`), and returns `babelMacros` as an array of `[pluginPath, options]` tuples. In dev (`NODE_ENV=development`) it enables runtime mode so `isDevelopingApp()` is callable at runtime too.

**How `buildMacros` relates to `_babel_compat_.js`:** The `node_modules/.embroider/_babel_compat_.js` file is generated by the compat prebuild and contains the serialized macros plugin config. `buildMacros()` generates equivalent config dynamically. Both end up using `/path/to/@embroider/macros/src/babel/macros-babel-plugin.js` with the same essential settings.

---

## Architecture Notes

### Content-for / config meta tag flow
1. `ember build` (compat prebuild) writes `node_modules/.embroider/content-for.json`
2. This file has `head` content = `<meta name="rfc-embers/config/environment" content="...URL-encoded JSON..."/>`
3. `contentFor()` plugin (part of `classicEmberSupport()`) reads this JSON and replaces `{{content-for "head"}}` in `index.html` at build and serve time
4. Virtual module plugin reads from this meta tag at runtime

### vendor.js / AMD runtime flow
1. `scripts()` plugin (part of `classicEmberSupport()`) handles `<script src="/assets/vendor.js">` in index.html
2. During dev: serves vendor.js from `tmp/compat-prebuild/assets/vendor.js`
3. During build: emits vendor.js as a fingerprinted static asset
4. vendor.js provides `window.require`, `window.define`, and `requirejs._eak_seen` (classic AMD)

### app-boot content-for
The `app-boot` content-for block uses AMD-style `require("rfc-embers/app")["default"].create(...)`. This is NOT injected in our index.html (no `{{content-for "app-boot"}}` placeholder). The ESM `<script type="module">` block in `index.html` is the actual entry point and calls `Application.create(environment.APP)` directly. The app boots via ESM, not AMD.

---

### 7. Blank page — empty `requirejs.entries`

**Symptom:** Build succeeds, no errors, vendor.js loads, app.ts module evaluates, but page renders blank. Console clean.

**Root cause:** `window.requirejs.entries` is empty. The classic `ember-resolver` looks up routes/templates/components/services in `requirejs.entries` (the AMD module registry vendor.js exposes). Under classic ember-cli, broccoli writes every app file there as an `define()` call. Under Vite ESM nothing populates it — so the resolver finds no router, no application template, no nothing, and silently does nothing.

**Fix (canonical, from `@ember/app-blueprint` v6.12.1):**

1. **`app/app.ts`:** import the virtual module `@embroider/virtual/compat-modules` and pass it to the resolver via `Resolver.withModules(compatModules)`. Also pass it as the third arg to `loadInitializers(App, config.modulePrefix, compatModules)`.

```ts
import compatModules from '@embroider/virtual/compat-modules';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  Resolver = Resolver.withModules(compatModules);
}

loadInitializers(App, config.modulePrefix, compatModules);
```

`@embroider/virtual/compat-modules` is a virtual specifier handled by the `@embroider/core` module resolver (see `module-resolver.js:296`). The plugin synthesizes an ESM module that auto-imports every app file and exports them as a `{ "rfc-embers/router": Module, "rfc-embers/templates/application": Module, ... }` map. `Resolver.withModules()` teaches `ember-resolver` to look in that map instead of `requirejs.entries`.

This re-introduces `loadInitializers` (which we'd removed for blocker #2). The 3-arg form takes the module map directly and bypasses the `import require from 'require'` AMD discovery problem entirely.

2. **`babel.config.mjs` (new file):** the canonical babel config uses `babelCompatSupport()` from `@embroider/compat/babel`, which internally handles macros, deprecation transforms, etc. — no need for the hand-rolled `buildMacros()` from blocker #6.

```mjs
import { babelCompatSupport, templateCompatSupport } from '@embroider/compat/babel';

export default {
  plugins: [
    ['@babel/plugin-transform-typescript', { allExtensions: true, onlyRemoveTypeImports: true, allowDeclareFields: true }],
    ['babel-plugin-ember-template-compilation', { transforms: [...templateCompatSupport()], enableLegacyModules: [...] }],
    ['module:decorator-transforms', { runtime: { import: '...runtime-esm' } }],
    ['@babel/plugin-transform-runtime', { useESModules: true, regenerator: false, ... }],
    ...babelCompatSupport(),
  ],
};
```

3. **`vite.config.ts`:** simplified — `@rollup/plugin-babel` auto-discovers `babel.config.mjs`, so the inline plugin list and `buildMacros` workaround are gone.

4. **`index.html`:** boot via inline `<script type="module">` calling `Application.create(environment.APP)`, not from `App.create()` inside `app.ts`. Also adds `<link rel="stylesheet" href="/@embroider/virtual/{vendor,app}.css">`.

**Why blocker #6's `buildMacros` workaround was the wrong layer:** `buildMacros()` only sets up macros. The real need was the entire compat babel pipeline (template compilation, decorator transforms, deprecation handling, macros, etc.) which `babelCompatSupport()` provides as a single batteries-included call. Macros come along for free.

---

### 8. Components fail to resolve in templates — missing `exports` field

**Symptom:** After fixing #7, several templates 500 with `Failed to resolve import "@embroider/virtual/components/status-badge" from "app/components/rfc-card/index.hbs"`. Specifically: any template invoking another component by uppercase tag name (`<RfcCard>`, `<StatusBadge>`, `<RfcFilter>`) fails. Components whose templates don't invoke other components (e.g. `status-badge/index.hbs`) work fine.

**Root cause:** The template compiler rewrites `<StatusBadge>` to `import StatusBadge from '@embroider/virtual/components/status-badge'`. The `@embroider/core` module resolver intercepts that virtual specifier and maps it to a real module — but only if the requesting file is part of a "v2 ember package" (`module-resolver.js:378`: `if (!fromPkg?.isV2Ember()) return request`). Without an `exports` field declaring the v2 package layout, our app isn't recognized as v2 and the rewrite is bypassed; the import falls through to Vite's resolver as `@embroider/virtual/components/status-badge` and 500s.

**Fix:** Add the canonical `exports` field to `package.json`:

```json
"exports": {
  "./tests/*": "./tests/*",
  "./*": "./app/*"
}
```

This is what the `@ember/app-blueprint` v6.12.1 generates. Beyond satisfying `isV2Ember()`, it also makes Node-style self-imports (`rfc-embers/components/foo` → `./app/components/foo`) work, which the resolver relies on once it has decided to rewrite.

---

### 9. The hand-rolled config virtual plugin was unnecessary

**Background:** Blocker #4 added a custom Vite plugin `emberConfigEnvironment()` that intercepted `rfc-embers/config/environment` and emitted ESM that read from a `<meta>` tag injected by `contentFor()`.

**What the canonical pattern actually does:** v6 blueprint creates a real file at `app/config/environment.ts`:

```ts
import loadConfigFromMeta from '@embroider/config-meta-loader';
const config = loadConfigFromMeta('rfc-embers') as unknown;
// ...assertions and typed re-export
export default config as { modulePrefix: string; rootURL: string; APP: Record<string, unknown>; ... };
```

`@embroider/config-meta-loader` is a published package that does the meta-tag read for us, with proper type assertions. Because `app/config/environment.ts` is a real file, the canonical `index.html` boot block can use the relative form `import environment from './app/config/environment'` and Vite resolves it normally — no virtual plugin needed.

**Action:** Install `@embroider/config-meta-loader`, create `app/config/environment.ts` per the blueprint, and delete `emberConfigEnvironment()` from `vite.config.ts`.

---

### 10. The cascade root cause — `ember-cli-build.js` missing `buildOnce`

**Symptom (after fixes #7–9):** Dev server still struggling. The compat prebuild was generating `-embroider-entrypoint.js` that imported every project-root file (`tsconfig.json`, `package.json`, `package-lock.json`, `dist/@embroider/virtual/vendor.js`, `dist/assets/main-*.js`, `vite.config.ts`, `babel.config.mjs`, etc.) — not just files under `app/`. That blew up because:
- `tsconfig.json` has JSON5 comments → Vite's JSON parser 500s
- Stale `dist/` from a prior build was being imported as live code
- Vite's optimize-deps cache thrashed on every file change

**Root cause:** Our `ember-cli-build.js`:

```js
const { compatBuild } = require('@embroider/compat');
module.exports = function (defaults) {
  const app = new EmberApp(defaults, { ... });
  return compatBuild(app);  // ← single arg
};
```

The fresh v6.12 blueprint generates `ember-cli-build.mjs`:

```js
import EmberApp from 'ember-cli/lib/broccoli/ember-app.js';
import { compatBuild } from '@embroider/compat';

export default async function (defaults) {
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, { ... });
  return compatBuild(app, buildOnce);  // ← second arg
}
```

Without the `buildOnce` second arg, `compatBuild` runs the legacy Broccoli pipeline whose entrypoint glob has no scope, so it picks up project-root files. With `buildOnce` from `@embroider/vite`, the prebuild becomes Vite-aware and only includes the `app/` tree.

**Action:** Convert `ember-cli-build.js` → `.mjs` and add the `buildOnce` second arg.

**Also do:** `rm -rf dist/` so even a misconfigured prebuild can't import from it. The `.gitignore` already ignores `dist/` but a directory was left over from earlier builds.

---

### 11. Meta-finding — there's an official codemod

After all this manual debugging, discovered Mainmatter publishes **`ember-vite-codemod`** which automates exactly this migration:

```sh
npx ember-vite-codemod@latest
```

Per its README, it:
- Creates `app/config/environment.js` (handles #9)
- Creates `vite.config.mjs` and `babel.config.cjs` (handles #6, parts of #7)
- Moves `index.html` to root with the canonical boot block (handles #5, parts of #7)
- Modifies `ember-cli-build.js` to add the `buildOnce` second arg (handles #10)
- Updates `testem.js`, `tests/test-helper.js`, `package.json` deps + scripts

Supports classic Ember v3.28+ and Embroider+Webpack apps. Requires a clean git tree (override with `--skip-git`).

**What it doesn't do:** ecosystem package upgrades. `ember-qunit` 9, `ember-page-title` 9, ember-data 5.8 quirks, etc. still need separate handling. The codemod does the minimum to make Vite build.

**Recommendation:** For any future v6+ migration, run the codemod first, then layer customizations on top. The manual approach in blockers #1–10 of this doc is preserved for the historical record of *why* each piece is necessary.

References:
- Mainmatter blog: https://mainmatter.com/blog/2025/03/10/ember-vite-codemod/
- GitHub: https://github.com/mainmatter/ember-vite-codemod
