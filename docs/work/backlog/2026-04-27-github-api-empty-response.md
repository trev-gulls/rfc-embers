---
status: backlog
created: 2026-04-27
---

# GitHub API Returns Empty RFC List in Development

## Symptom

Running the app locally shows "No RFCs match the current filter." — the RFC list is empty.

## Observed Evidence

Network tab showed:
- `GET https://api.github.com/repos/emberjs/rfcs/issues?state=all&per_page=100`
- Status: `200 OK (from disk cache)`
- `Content-Length: 5`
- Body: `[]`

## Suspected Causes

1. **Browser disk cache** — the browser served a stale cached `[]` response. Hard-refreshing (Cmd+Shift+R) or disabling cache in DevTools may resolve it.
2. **GitHub API rate limiting** — unauthenticated requests are capped at 60 req/hr. When rate-limited, GitHub returns 403, but a cached prior empty response could persist.

## Not the Cause

The `/issues` endpoint is correct. GitHub's REST API treats pull requests as issues, so `/issues?state=all` returns RFC pull requests for `emberjs/rfcs`.

## Investigation Needed

- Reproduce reliably: does a hard-refresh fix it?
- If rate limiting: add auth token support to `GitHubRfcSource` (already documented in O17 / the `FETCH_TIMEOUT_MS` comment)
- Consider whether `Cache-Control` response headers from GitHub should be respected or overridden with a `cache: 'no-cache'` fetch option during development
