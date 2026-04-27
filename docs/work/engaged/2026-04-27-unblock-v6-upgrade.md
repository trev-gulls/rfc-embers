---
status: planning
branch: fix/unblock-v6-upgrade
created: 2026-04-27
updated: 2026-04-27
blocked-by: []
plan: docs/superpowers/plans/2026-04-27-unblock-v6-upgrade.md
see-also:
  - docs/git/2026-04-15-pr-2-review.md
  - docs/work/backlog/2026-04-15-ember-v6-upgrade.md
---

# Unblock Ember v6 Upgrade — Resolve PR #2 Outstanding Issues (O1–O17)

## Goal

Address all 17 outstanding issues flagged during the PR #2 review
(`docs/git/2026-04-15-pr-2-review.md`) so that `docs/work/backlog/2026-04-15-ember-v6-upgrade.md`
can be unblocked and the Ember v6 / Vite migration can begin.

Three of the issues (O4, O8, O10) were identified as EmberData deprecations that become
**hard errors** in EmberData 6.0 — they must be resolved before the version bump.

## Deferred Issues from PR #2 Review

All items below were classified as outstanding (not fixed) when PR #2 was merged.
See `docs/git/2026-04-15-pr-2-review.md` for full context, reviewer comments, and source.

### Critical — must fix

| Issue | Description |
|-------|-------------|
| O1 | No error substates — `rfcs-error.hbs` / `rfc-error.hbs` missing; API failures produce blank page |
| O2 | No fetch timeout in `GitHubRfcSource` — network stall hangs the app forever |
| O3 | `response.json()` unguarded — malformed response surfaces as opaque `SyntaxError` |

### Important — v6 hard errors or significant gaps

| Issue | Description |
|-------|-------------|
| O4  | `fetchAll` params ignored — gateway interface promises filtering; no implementation delivers it |
| O5  | `GitHubRfcSource.fetchOne` untested — separate endpoint, separate JSON:API shape, zero coverage |
| O6  | `RfcsController.filteredRfcs` untested in isolation — acceptance tests only cover one status |
| O7  | `github-handle` → `githubHandle` serializer normalization path untested |
| O8  | `RfcAdapter#gateway` unsafe cast — DI misconfiguration gives misleading `is not a function` errors |
| O9  | `GitHubIssue.user` not nullable — GitHub returns `null` for deleted accounts; crashes fetchAll |
| O10 | `JsonApiDocument.data` ambiguous union — split into singular/collection variants; removes `@ts-expect-error` in adapter |
| O11 | `ALL_STATUSES` manually maintained — convert to `RFC_STATUSES as const`; derive `RfcStatus` type from it |

### Suggestions — resolved in this branch

| Issue | Description |
|-------|-------------|
| O12 | `Author.name`/`githubHandle`/`id` triple-alias — document the GitHub Issues API limitation |
| O13 | `mapStatus` fallthrough undocumented — comment the `'proposed'` default |
| O14 | `per_page=100` silent truncation — warn when `issues.length === 100` |
| O15 | No loading substates — `rfcs-loading.hbs` / `rfc-loading.hbs` missing |
| O16 | `rfc_id` not validated before API call — `/rfcs/banana` fires a 404 fetch |
| O17 | GitHub API rate limiting — 60 req/hr unauthenticated; document the limitation |

## Tasks

Refer to the implementation plan at `docs/superpowers/plans/2026-04-27-unblock-v6-upgrade.md`
for step-by-step TDD instructions, exact file paths, and complete code.

- [ ] Task 1: Type foundation — O10, O11, O12
- [ ] Task 2: Null safety — O9
- [ ] Task 3: Network robustness — O2, O3, O13, O14, O17
- [ ] Task 4: Missing unit tests — O5, O6, O7
- [ ] Task 5: Error substates — O1
- [ ] Task 6: Loading substates — O15
- [ ] Task 7: Route input validation — O16

## Acceptance Criteria

- [ ] `npm run lint:types` exits 0 (no TypeScript errors)
- [ ] `npm run test:ember` exits 0 (all tests pass)
- [ ] `rfcs-error.hbs` and `rfc-error.hbs` exist and are covered by acceptance tests
- [ ] `rfcs-loading.hbs` and `rfc-loading.hbs` exist
- [ ] `GitHubRfcSource.fetchAll` aborts after 10s and surfaces a clear error
- [ ] `GitHubRfcSource` handles `null` user without crashing
- [ ] `JsonApiDocument` union is split; no `@ts-expect-error` in `app/adapters/rfc.ts`
- [ ] `RfcStatus` type is derived from `RFC_STATUSES as const`; `ALL_STATUSES` removed
- [ ] `RfcAdapter#gateway` throws a descriptive error on DI misconfiguration
- [ ] `filteredRfcs`, `fetchOne`, and serializer normalization all have unit test coverage
- [ ] `docs/work/backlog/2026-04-15-ember-v6-upgrade.md` `blocked-by` entry is cleared after merge
