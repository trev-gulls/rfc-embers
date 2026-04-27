---
status: pending
priority: medium
created: 2026-04-27
updated: 2026-04-27
blocked-by: []
---

# Pagination

## Goal

Add pagination to the `/rfcs` list route so the app handles repositories with large numbers
of RFC issues without fetching everything upfront. GitHub's Issues API returns max 100
items per page; this cap is currently hit silently (see O14 in `docs/git/2026-04-15-pr-2-review.md`).

## Acceptance Criteria

- [ ] `GitHubRfcSource.fetchAll` supports page-based fetching via the GitHub Issues API (`page` + `per_page` params)
- [ ] `RfcGateway` interface updated to accept pagination params (page, perPage)
- [ ] `/rfcs` route and controller support navigating between pages
- [ ] Current page and total (or has-next) state is surfaced to the template
- [ ] `InMemoryRfcSource` implements the same interface (slice the fixture array)
- [ ] Pagination controls render in the list view (prev/next at minimum)
- [ ] URL reflects page state (`?page=N`) so links are shareable
- [ ] Tests cover controller pagination logic and `InMemoryRfcSource` slicing

## Notes

- The silent `per_page=100` truncation (O14) is the motivating bug — a warn/log is a
  short-term fix, but proper pagination is the real solution.
- GitHub API uses `Link` response headers for cursor-based pagination; check if simple
  `page` params are sufficient or if header-based cursors are needed.
- Status filter and pagination interact — filtered count may differ from total; design
  the gateway params to compose cleanly.
