---
status: pending
created: 2026-05-26
updated: 2026-05-26
blocked-by: []
---

# Migrate components to GTS/GJS (strict-mode templates)

## Goal

Replace the current split `.ts` + `.hbs` component files with co-located `.gts` strict-mode
templates. Strict mode eliminates the global resolution of helpers, components, and modifiers —
everything used in a template must be explicitly imported, giving the file a complete, auditable
dependency graph and enabling first-class TypeScript inference without Glint's loose-mode shims.

The build is already prepared: `tests/index.html` uses
`import.meta.glob('./**/*.{js,ts,gjs,gts}', ...)` and Embroider/Vite supports `.gts` natively.

## Research Phase

Before migrating any component, evaluate the available authoring styles and pick a consistent
convention for this codebase.

### Styles to evaluate

1. **Class-backed component** — class owns state/actions, `<template>` tag lives inside the
   class body. Closest analogue to the current `.ts` + `.hbs` split.
   ```gts
   export default class RfcCard extends Component<Signature> {
     @tracked isExpanded = false;
     @action toggle() { this.isExpanded = !this.isExpanded; }
     <template>
       <button {{on "click" this.toggle}}>…</button>
     </template>
   }
   ```

2. **Functional / template-only export** — no class, `<template>` is the default export.
   Replaces current template-only components (e.g. `StatusBadge`).
   ```gts
   <template>
     <span class="status--{{@status}}">{{@status}}</span>
   </template>
   ```

3. **Named const + `<template>` as value** — component assigned to a `const`, useful for
   inline sub-components within a single file.
   ```gts
   const Badge = <template><span>{{@label}}</span></template>;
   export default class RfcCard extends Component { … }
   ```

4. **Mixed: multiple components in one file** — define private sub-components at the top,
   export the primary component at the bottom. Trades file-count for co-location.

### Research questions

- Which style does the Ember community / official docs recommend as the primary pattern?
- Does Glint's strict-mode support differ between class-backed and functional styles?
- Are inline sub-components (style 3/4) a good fit for `StatusBadge` referenced inside
  `RfcCard` and `rfc.hbs`, or is a separate file preferable?
- What changes are needed in `tsconfig.json` or `vite.config.mjs` to enable `.gts` processing?
- Are any installed addons (`ember-scoped-css`, `ember-truth-helpers`, `ember-modifier`)
  compatible with strict mode templates?

### Research output

A short decision record added to the Notes section below documenting:
- Chosen primary style (with rationale)
- How template-only components will be handled
- Any addon compatibility issues discovered

## Migration Plan (to be confirmed after research)

Migrate in order of increasing complexity:

1. `StatusBadge` — template-only, no state, good smoke test for the toolchain
2. `RfcFilter` — Glimmer class, no local state, controlled via args
3. `RfcCard` — Glimmer class with `@tracked` state and `@action`
4. Route templates (`application.hbs`, `rfcs.hbs`, `rfc.hbs`, loading/error substates)

## Acceptance Criteria

- [ ] Research phase complete; chosen style documented in Notes
- [ ] Addon compatibility confirmed (especially `ember-scoped-css` in strict mode)
- [ ] `StatusBadge` migrated to `.gts` and all existing tests pass
- [ ] `RfcFilter` migrated to `.gts` and all existing tests pass
- [ ] `RfcCard` migrated to `.gts` and all existing tests pass
- [ ] Route templates migrated (or decision made to leave `.hbs` for route-level templates)
- [ ] No `@glint/environment-ember-loose` loose-mode workarounds remain in migrated files
- [ ] `ARCHITECTURE.md` updated to reflect the new file structure and template style

## Notes

_Research findings and decision record go here._
