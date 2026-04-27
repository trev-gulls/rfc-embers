---
title: RFC Tracker Implementation
type: feature
status: merged
branch: feat/rfc-tracker-implementation
started: 2026-04-14
finished: 2026-04-15
pr: trev-gulls/rfc-embers#2
plan: docs/superpowers/plans/2026-04-13-rfc-tracker-story.md
---

## Goal

Build the full Ember.js RFC tracker app per the implementation plan: models, gateway/adapter, components, routes, tests.

## Tasks

- [ ] Task 1: Scaffold Ember TypeScript app, install deps, update router
- [ ] Task 2: Author and Rfc EmberData models
- [ ] Task 3: RfcGateway interface + InMemoryRfcSource
- [ ] Task 4: RfcAdapter, RfcSerializer, source:rfc registration
- [ ] Task 5: StatusBadge component (Glimmer + scoped CSS)
- [ ] Task 6: RfcCard component (expand/collapse toggle)
- [ ] Task 7: RfcFilter component (status pill buttons)
- [ ] Task 8: /rfcs list route + controller + template
- [ ] Task 9: /rfcs/:id detail route + template
- [ ] Task 10: GitHubRfcSource (GitHub Issues API → JSON:API)
