---
status: pending
created: 2026-04-15
updated: 2026-04-15
blocked-by: []
---

# Styling and GitHub-Flavored Markdown Rendering

## Goal

Add a cohesive visual layer to the app: a utility-first styling approach (Tailwind) that
works with ember-scoped-css for component isolation, and a client-side GFM renderer for
RFC issue bodies. RFCs come from multiple sources (in-memory and GitHub API) so rendering
must be purely client-side. Markdown quality is a core UX concern since issue bodies are
the primary content.

## Acceptance Criteria

- [ ] Tailwind CSS integrated and working alongside `ember-scoped-css`
- [ ] RFC list and detail views have a baseline design (layout, typography, spacing)
- [ ] Issue body field renders full GitHub Flavored Markdown: headings, bold/italic, tables,
      task lists (`- [ ]`), strikethrough, fenced code blocks with syntax highlighting,
      and autolinks
- [ ] Rendered Markdown is XSS-safe (sanitized before insertion into the DOM)
- [ ] Rendering is acceptably fast for typical RFC issue bodies (no perceptible lag on
      first render or when switching between RFCs)
- [ ] Markdown renderer choice is documented with rationale (see Notes)

## Notes

### Library options and trade-offs

**marked** (`marked` + `marked-gfm-heading-id` + `DOMPurify`)
- Fastest parse time, smallest bundle (~60 KB)
- Good GFM support via plugins; sync API suits Ember's rendering model
- Requires separate sanitizer (DOMPurify) — two deps instead of one
- Best fit if RFC bodies are numerous and rendered frequently (e.g. list view previews)

**markdown-it** (`markdown-it` + plugins + `DOMPurify`)
- Middle ground: ~100 KB, very extensible plugin ecosystem
- Excellent GFM support via `markdown-it-task-lists`, `markdown-it-anchor`, etc.
- Sync API, well-maintained, used broadly in production tools

**remark/rehype** (`remark` + `remark-gfm` + `rehype-sanitize` + `rehype-stringify`)
- Full AST pipeline — most flexible for future transforms (e.g. link rewriting, heading IDs)
- Heaviest (~250 KB+), async API requires more wiring in Ember
- Overkill unless AST-level transforms are needed

**Recommendation:** Start with `markdown-it` — better default GFM than `marked` without
the async complexity of remark/rehype. Re-evaluate if bundle size becomes a concern.

### Rendering strategy

Since RFC bodies are fetched asynchronously and RFCs switch frequently:
- Render markdown in a getter or helper, not a template expression, to avoid unnecessary
  re-renders
- Consider memoizing rendered HTML per RFC id (Map keyed by id) to avoid re-parsing on
  tab/route revisit
- For in-memory source, pre-render at load time since all data is available upfront

### Tailwind + ember-scoped-css

`ember-scoped-css` scopes CSS by component. Tailwind utilities are global by design — run
Tailwind through PostCSS at the app level (not scoped), and use scoped CSS only for
component-specific overrides. Check for a community `ember-tailwind` addon before manual
wiring.
