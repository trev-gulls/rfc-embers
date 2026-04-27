# Unblock Ember v6 Upgrade — Address PR #2 Outstanding Issues (O1–O17)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 17 outstanding issues from the PR #2 review so the Ember v6 upgrade is unblocked, EmberData deprecations cannot become hard errors, and the app handles errors gracefully.

**Architecture:** Fixes are grouped into 7 focused tasks ordered by dependency: type foundation first (O10–O12) so later tasks compile cleanly, then gateway contract (O4, O8), then null/network safety in `GitHubRfcSource` (O2, O3, O9, O13, O14, O17), then test coverage (O5, O6, O7), then Ember routing UI (O1, O15), then input validation (O16).

**Tech Stack:** Ember 5 Octane, TypeScript 5, EmberData 5.8, QUnit, `@ember/test-helpers`, `AbortController`

---

## File Map

| File | Change |
|------|--------|
| `app/gateways/rfc-gateway.ts` | Split `JsonApiDocument` into `JsonApiSingularDocument`/`JsonApiCollectionDocument`; remove `params?` from `fetchAll` |
| `app/models/rfc.ts` | Add `RFC_STATUSES as const`; derive `RfcStatus` type from it |
| `app/components/rfc-filter/index.ts` | Import `RFC_STATUSES` from model; remove `ALL_STATUSES` |
| `app/adapters/rfc.ts` | Update return types; remove `@ts-expect-error`; safe gateway cast; remove params passthrough |
| `app/sources/github-rfc-source.ts` | Return typed singular/collection documents; nullable user; timeout + JSON guard; truncation warn; doc comments |
| `tests/app/sources/in-memory-rfc-source.ts` | Return typed singular/collection documents; remove params |
| `tests/unit/sources/github-rfc-source-test.ts` | Remove `as` casts; add `fetchOne` tests (O5); add null-user tests (O9); add timeout/JSON-error tests (O2, O3) |
| `tests/unit/sources/in-memory-rfc-source-test.ts` | Remove `as` casts |
| `tests/unit/controllers/rfcs-test.ts` | Replace stub with `filteredRfcs` unit tests (O6) |
| `tests/unit/serializers/rfc-test.js` → `rfc-test.ts` | Convert to TS; add `github-handle` normalization test (O7) |
| `app/templates/rfcs-error.hbs` | Create error substate (O1) |
| `app/templates/rfc-error.hbs` | Create error substate (O1) |
| `app/templates/rfcs-loading.hbs` | Create loading substate (O15) |
| `app/templates/rfc-loading.hbs` | Create loading substate (O15) |
| `app/routes/rfc.ts` | Validate `rfc_id` is numeric before calling `findRecord` (O16) |
| `tests/acceptance/rfc-test.ts` | Add test for invalid id rejection (O16) |

---

## Task 1: Type Foundation (O10, O11, O12)

**Files:**
- Modify: `app/gateways/rfc-gateway.ts`
- Modify: `app/models/rfc.ts`
- Modify: `app/components/rfc-filter/index.ts`
- Modify: `app/adapters/rfc.ts`
- Modify: `app/sources/github-rfc-source.ts`
- Modify: `tests/app/sources/in-memory-rfc-source.ts`
- Modify: `tests/unit/sources/in-memory-rfc-source-test.ts`
- Modify: `tests/unit/sources/github-rfc-source-test.ts`

These are compile-time changes only — no runtime behavior changes. Run the type checker after each file to catch errors early.

- [ ] **Step 1: Split `JsonApiDocument` in the gateway**

Replace `app/gateways/rfc-gateway.ts` with:

```typescript
export interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data: { id: string; type: string } | null }>;
}

export interface JsonApiSingularDocument {
  data: JsonApiResource;
  included?: JsonApiResource[];
}

export interface JsonApiCollectionDocument {
  data: JsonApiResource[];
  included?: JsonApiResource[];
}

export default interface RfcGateway {
  fetchAll(): Promise<JsonApiCollectionDocument>;
  fetchOne(id: string): Promise<JsonApiSingularDocument>;
}
```

- [ ] **Step 2: Derive `RfcStatus` from a const array in the model**

Replace `app/models/rfc.ts` with:

```typescript
import Model, { attr, belongsTo } from '@ember-data/model';
import type Author from './author';

export const RFC_STATUSES = ['proposed', 'accepted', 'released', 'closed'] as const;
export type RfcStatus = (typeof RFC_STATUSES)[number];

export default class Rfc extends Model {
  @attr('string') declare title: string;
  @attr('number') declare number: number;
  @attr('string') declare status: RfcStatus;
  @attr('string') declare summary: string;

  @belongsTo('author', { async: false, inverse: null })
  declare author: Author;
}

declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    rfc: Rfc;
  }
}
```

- [ ] **Step 3: Import `RFC_STATUSES` in `RfcFilterComponent`, remove `ALL_STATUSES`**

Replace `app/components/rfc-filter/index.ts` with:

```typescript
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { RFC_STATUSES } from '../../models/rfc';
import type { RfcStatus } from '../../models/rfc';

type FilterStatus = RfcStatus | null;

interface Signature {
  Args: {
    activeStatus: FilterStatus;
    onFilterChange: (status: FilterStatus) => void;
  };
}

export default class RfcFilterComponent extends Component<Signature> {
  get statuses(): readonly RfcStatus[] {
    return RFC_STATUSES;
  }

  @action selectStatus(status: FilterStatus): void {
    const next = this.args.activeStatus === status ? null : status;
    this.args.onFilterChange(next);
  }
}
```

- [ ] **Step 4: Update `GitHubRfcSource` return types and remove old `JsonApiDocument` import**

Replace the imports and method signatures in `app/sources/github-rfc-source.ts`:

```typescript
import type RfcGateway from '../gateways/rfc-gateway';
import type {
  JsonApiCollectionDocument,
  JsonApiSingularDocument,
  JsonApiResource,
} from '../gateways/rfc-gateway';
import type { RfcStatus } from '../models/rfc';
```

Update method signatures:
```typescript
async fetchAll(): Promise<JsonApiCollectionDocument> { ... }
async fetchOne(id: string): Promise<JsonApiSingularDocument> { ... }
#toDocument(issues: GitHubIssue[]): JsonApiCollectionDocument { ... }
```

- [ ] **Step 5: Update `InMemoryRfcSource` return types and remove params**

Replace `tests/app/sources/in-memory-rfc-source.ts` with:

```typescript
import type RfcGateway from 'rfc-embers/gateways/rfc-gateway';
import type {
  JsonApiCollectionDocument,
  JsonApiSingularDocument,
  JsonApiResource,
} from 'rfc-embers/gateways/rfc-gateway';

const FIXTURES: JsonApiCollectionDocument = {
  data: [
    {
      id: '724',
      type: 'rfc',
      attributes: {
        title: 'Native TypeScript Types',
        number: 724,
        status: 'released',
        summary: 'Ship native TypeScript types with Ember packages.',
      },
      relationships: {
        author: { data: { id: 'gitKrystan', type: 'author' } },
      },
    },
    {
      id: '883',
      type: 'rfc',
      attributes: {
        title: 'Ember Polaris',
        number: 883,
        status: 'accepted',
        summary: 'The next major edition of Ember.',
      },
      relationships: {
        author: { data: { id: 'wycats', type: 'author' } },
      },
    },
    {
      id: '900',
      type: 'rfc',
      attributes: {
        title: 'Resource API',
        number: 900,
        status: 'proposed',
        summary: 'A unified Resource API for reactive state management.',
      },
      relationships: {
        author: { data: { id: 'NullVoxPopuli', type: 'author' } },
      },
    },
  ],
  included: [
    {
      id: 'gitKrystan',
      type: 'author',
      attributes: { name: 'Krystan HuffMenne', 'github-handle': 'gitKrystan' },
    },
    {
      id: 'wycats',
      type: 'author',
      attributes: { name: 'Yehuda Katz', 'github-handle': 'wycats' },
    },
    {
      id: 'NullVoxPopuli',
      type: 'author',
      attributes: { name: 'Preston Sego', 'github-handle': 'NullVoxPopuli' },
    },
  ],
};

export default class InMemoryRfcSource implements RfcGateway {
  async fetchAll(): Promise<JsonApiCollectionDocument> {
    return structuredClone(FIXTURES);
  }

  async fetchOne(id: string): Promise<JsonApiSingularDocument> {
    const item = FIXTURES.data.find((r) => r.id === id);
    if (!item) {
      throw new Error(`RFC with id ${id} not found`);
    }
    return structuredClone({ data: item, included: FIXTURES.included });
  }
}
```

- [ ] **Step 6: Update `RfcAdapter` — remove `@ts-expect-error`, update return types, safe cast**

Replace `app/adapters/rfc.ts` with:

```typescript
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { getOwner } from '@ember/application';
import type RfcGateway from '../gateways/rfc-gateway';
import type {
  JsonApiCollectionDocument,
  JsonApiSingularDocument,
} from '../gateways/rfc-gateway';

export default class RfcAdapter extends JSONAPIAdapter {
  private get gateway(): RfcGateway {
    const source = getOwner(this)?.lookup('source:rfc');
    if (
      !source ||
      typeof (source as RfcGateway).fetchAll !== 'function' ||
      typeof (source as RfcGateway).fetchOne !== 'function'
    ) {
      throw new Error(
        "RfcAdapter: 'source:rfc' is not registered or does not implement RfcGateway. " +
          "Call owner.register('source:rfc', YourSource, { instantiate: false }) in your route or test setup.",
      );
    }
    return source as RfcGateway;
  }

  async query(
    _store: unknown,
    _type: unknown,
    _params: Record<string, unknown>,
  ): Promise<JsonApiCollectionDocument> {
    return this.gateway.fetchAll();
  }

  async findRecord(
    _store: unknown,
    _type: unknown,
    id: string,
  ): Promise<JsonApiSingularDocument> {
    return this.gateway.fetchOne(id);
  }
}
```

- [ ] **Step 7: Remove `as` casts from `InMemoryRfcSource` tests**

Replace `tests/unit/sources/in-memory-rfc-source-test.ts` with:

```typescript
import { module, test } from 'qunit';
import InMemoryRfcSource from 'rfc-embers/tests/app/sources/in-memory-rfc-source';

module('Unit | Source | InMemoryRfcSource', function () {
  test('fetchAll returns an array of 3 RFC resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    assert.strictEqual(doc.data.length, 3, 'returns 3 fixtures');
  });

  test('fetchAll data items are valid JSON:API resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    for (const item of doc.data) {
      assert.ok(item.id, `item ${item.id} has id`);
      assert.strictEqual(item.type, 'rfc', `item ${item.id} has type 'rfc'`);
      assert.ok(item.attributes['title'], `item ${item.id} has title`);
      assert.ok(item.attributes['status'], `item ${item.id} has status`);
    }
  });

  test('fetchOne returns a single RFC by id', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchOne('724');
    assert.strictEqual(doc.data.id, '724');
    assert.strictEqual(doc.data.type, 'rfc');
  });

  test('fetchOne throws for unknown id', async function (assert) {
    const source = new InMemoryRfcSource();
    await assert.rejects(source.fetchOne('9999'), /9999/);
  });

  test('fetchAll includes author resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    assert.ok(doc.included, 'has included');
    assert.ok((doc.included ?? []).length > 0, 'included is non-empty');
    assert.strictEqual(doc.included?.[0]?.type, 'author');
  });
});
```

- [ ] **Step 8: Remove `as` casts from `GitHubRfcSource` tests**

Update `tests/unit/sources/github-rfc-source-test.ts` — remove the `as JsonApiResource[]` / `as unknown[]` casts from the existing tests (the `fetchAll` tests). The `doc.data` is now typed as `JsonApiResource[]` directly:

```typescript
test('fetchAll returns a JSON:API document with data array', async function (assert) {
  const source = new GitHubRfcSource();
  const doc = await source.fetchAll();
  assert.strictEqual(doc.data.length, 3);
});

test('fetchAll maps GitHub labels to RFC status correctly', async function (assert) {
  const source = new GitHubRfcSource();
  const doc = await source.fetchAll();
  assert.strictEqual(doc.data.find((i) => i.id === '724')?.attributes['status'], 'released');
  assert.strictEqual(doc.data.find((i) => i.id === '883')?.attributes['status'], 'accepted');
  assert.strictEqual(doc.data.find((i) => i.id === '900')?.attributes['status'], 'proposed');
});

test('fetchAll deduplicates and includes author resources', async function (assert) {
  const source = new GitHubRfcSource();
  const doc = await source.fetchAll();
  assert.ok(doc.included, 'has included resources');
  assert.strictEqual(doc.included?.length, 3, 'one author per unique login');
  const author = doc.included?.find((r) => r.id === 'gitKrystan');
  assert.ok(author, 'gitKrystan is in included');
  assert.strictEqual(author?.type, 'author');
});

test('fetchAll throws on non-ok GitHub response', async function (assert) {
  globalThis.fetch = async () => ({ ok: false, status: 403 }) as Response;
  const source = new GitHubRfcSource();
  await assert.rejects(source.fetchAll(), /403/);
});
```

- [ ] **Step 9: Verify TypeScript passes**

Run: `npm run lint:types`
Expected: exit 0, no type errors

- [ ] **Step 10: Verify tests still pass**

Run: `npm run test:ember`
Expected: all existing tests pass (no new tests yet, only type changes)

- [ ] **Step 11: Commit**

```bash
git add app/gateways/rfc-gateway.ts app/models/rfc.ts app/components/rfc-filter/index.ts
git add app/adapters/rfc.ts app/sources/github-rfc-source.ts
git add tests/app/sources/in-memory-rfc-source.ts
git add tests/unit/sources/in-memory-rfc-source-test.ts tests/unit/sources/github-rfc-source-test.ts
git commit -m "refactor(types): split JsonApiDocument, derive RfcStatus from const array, safe adapter cast (O4, O8, O10, O11, O12)"
```

---

## Task 2: Null Safety for Deleted GitHub Accounts (O9)

**Files:**
- Modify: `tests/unit/sources/github-rfc-source-test.ts` (tests first)
- Modify: `app/sources/github-rfc-source.ts` (implementation)

- [ ] **Step 1: Write failing tests for null user**

Add these two tests to the `module('Unit | Source | GitHubRfcSource', ...)` block in `tests/unit/sources/github-rfc-source-test.ts`:

```typescript
test('fetchAll handles issues with null user (deleted accounts)', async function (assert) {
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => [{ ...MOCK_ISSUES[0], user: null }],
    }) as Response;
  const source = new GitHubRfcSource();
  const doc = await source.fetchAll();
  assert.strictEqual(doc.data.length, 1, 'processes the issue');
  assert.strictEqual(
    doc.included?.[0]?.id,
    'unknown',
    'null user gets fallback id "unknown"',
  );
});

test('fetchOne handles null user (deleted account)', async function (assert) {
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => ({ ...MOCK_ISSUES[0], user: null }),
    }) as Response;
  const source = new GitHubRfcSource();
  const doc = await source.fetchOne('724');
  assert.strictEqual(doc.data.id, '724', 'still returns the RFC');
  assert.strictEqual(
    doc.included?.[0]?.id,
    'unknown',
    'null user gets fallback id "unknown"',
  );
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm run test:ember`
Expected: the two new tests FAIL with a TypeError about reading `login` of null

- [ ] **Step 3: Make `GitHubIssue.user` nullable and guard all access**

In `app/sources/github-rfc-source.ts`, change the `GitHubIssue` interface and update the three places that access `user.login`:

```typescript
interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: { login: string } | null; // null for deleted GitHub accounts
  labels: Array<{ name: string }>;
}
```

In `#issueToResource`:
```typescript
relationships: {
  author: { data: { id: issue.user?.login ?? 'unknown', type: 'author' } },
},
```

In `fetchOne` (the part that builds `login` for `included`):
```typescript
const login = issue.user?.login ?? 'unknown';
return {
  data: this.#issueToResource(issue),
  included: [this.#authorResource(login)],
};
```

In `#toDocument`:
```typescript
for (const issue of issues) {
  const login = issue.user?.login ?? 'unknown';
  if (!seen.has(login)) {
    seen.add(login);
    included.push(this.#authorResource(login));
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm run test:ember`
Expected: all tests pass including the two new null-user tests

- [ ] **Step 5: Commit**

```bash
git add app/sources/github-rfc-source.ts tests/unit/sources/github-rfc-source-test.ts
git commit -m "fix: handle null GitHub user on deleted accounts in GitHubRfcSource (O9)"
```

---

## Task 3: Network Robustness — Timeout, JSON Guard, Truncation Warn (O2, O3, O13, O14, O17)

**Files:**
- Modify: `tests/unit/sources/github-rfc-source-test.ts` (tests first)
- Modify: `app/sources/github-rfc-source.ts` (implementation)

All changes are in `GitHubRfcSource`. No other files need changing.

- [ ] **Step 1: Write failing test for malformed JSON response (O3)**

Add to `tests/unit/sources/github-rfc-source-test.ts`:

```typescript
test('fetchAll rejects with a descriptive error when response is not valid JSON', async function (assert) {
  globalThis.fetch = async () =>
    ({
      ok: true,
      url: 'https://api.github.com/repos/emberjs/rfcs/issues',
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      },
    }) as unknown as Response;
  const source = new GitHubRfcSource();
  await assert.rejects(
    source.fetchAll(),
    /failed to parse response/i,
    'error message identifies the parse failure',
  );
});

test('fetchOne rejects with a descriptive error when response is not valid JSON', async function (assert) {
  globalThis.fetch = async () =>
    ({
      ok: true,
      url: 'https://api.github.com/repos/emberjs/rfcs/issues/724',
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    }) as unknown as Response;
  const source = new GitHubRfcSource();
  await assert.rejects(
    source.fetchOne('724'),
    /failed to parse response/i,
    'error message identifies the parse failure',
  );
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm run test:ember`
Expected: the two new JSON-error tests FAIL because the raw `SyntaxError` propagates without wrapping

- [ ] **Step 3: Write failing test for fetch abort / timeout (O2)**

Add to the same test file:

```typescript
test('fetchAll rejects when the request is aborted (timeout simulation)', async function (assert) {
  globalThis.fetch = async (_url: RequestInfo | URL, options?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  };
  const source = new GitHubRfcSource();
  // Patch timeout to fire immediately so the test doesn't wait 10 s
  const origSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void, _delay: number) => {
    return origSetTimeout(fn, 0);
  }) as typeof setTimeout;
  try {
    await assert.rejects(source.fetchAll(), /aborted/i);
  } finally {
    globalThis.setTimeout = origSetTimeout;
  }
});
```

- [ ] **Step 4: Run tests to confirm timeout test also fails**

Run: `npm run test:ember`
Expected: the abort test FAILS because `GitHubRfcSource` does not yet use `AbortController`

- [ ] **Step 5: Implement all robustness changes in `app/sources/github-rfc-source.ts`**

Add the constant and private helpers, then wrap `fetchAll` and `fetchOne`. Replace the entire file with:

```typescript
import type RfcGateway from '../gateways/rfc-gateway';
import type {
  JsonApiCollectionDocument,
  JsonApiSingularDocument,
  JsonApiResource,
} from '../gateways/rfc-gateway';
import type { RfcStatus } from '../models/rfc';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: { login: string } | null; // null for deleted GitHub accounts
  labels: Array<{ name: string }>;
}

// Unauthenticated requests are rate-limited to 60 req/hr by GitHub.
// Pass a personal access token via Authorization header to raise the limit to 5000 req/hr.
const GITHUB_API_URL =
  'https://api.github.com/repos/emberjs/rfcs/issues?state=all&per_page=100';

const FETCH_TIMEOUT_MS = 10_000;

function mapStatus(issue: GitHubIssue): RfcStatus {
  const labelNames = issue.labels.map((l) => l.name.toLowerCase());
  if (labelNames.some((l) => l.includes('s-released'))) return 'released';
  if (
    labelNames.some(
      (l) => l.includes('s-recommended') || l.includes('s-ready for release'),
    )
  )
    return 'accepted';
  if (labelNames.some((l) => l.includes('s-discontinued'))) return 'closed';
  // No matching stage label — open issues with no label are treated as proposed
  return 'proposed';
}

export default class GitHubRfcSource implements RfcGateway {
  async fetchAll(): Promise<JsonApiCollectionDocument> {
    const { signal, clear } = this.#makeTimeout();
    try {
      const response = await fetch(GITHUB_API_URL, { signal });
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      const issues = await this.#parseJson<GitHubIssue[]>(response);
      if (issues.length === 100) {
        console.warn(
          'GitHubRfcSource: received exactly 100 issues — results may be truncated ' +
            '(GitHub API per_page limit is 100 items per request).',
        );
      }
      return this.#toDocument(issues);
    } finally {
      clear();
    }
  }

  async fetchOne(id: string): Promise<JsonApiSingularDocument> {
    const { signal, clear } = this.#makeTimeout();
    try {
      const response = await fetch(
        `https://api.github.com/repos/emberjs/rfcs/issues/${id}`,
        { signal },
      );
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      const issue = await this.#parseJson<GitHubIssue>(response);
      const login = issue.user?.login ?? 'unknown';
      return {
        data: this.#issueToResource(issue),
        included: [this.#authorResource(login)],
      };
    } finally {
      clear();
    }
  }

  #makeTimeout(): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return { signal: controller.signal, clear: () => clearTimeout(id) };
  }

  async #parseJson<T>(response: Response): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch (e) {
      throw new Error(
        `GitHubRfcSource: failed to parse response from ${response.url}: ${String(e)}`,
      );
    }
  }

  #issueToResource(issue: GitHubIssue): JsonApiResource {
    return {
      id: String(issue.number),
      type: 'rfc',
      attributes: {
        title: issue.title,
        number: issue.number,
        status: mapStatus(issue),
        summary: issue.body ?? '',
      },
      relationships: {
        author: { data: { id: issue.user?.login ?? 'unknown', type: 'author' } },
      },
    };
  }

  #authorResource(login: string): JsonApiResource {
    return {
      id: login,
      type: 'author',
      // GitHub Issues API does not return display names; name falls back to login
      attributes: { name: login, 'github-handle': login },
    };
  }

  #toDocument(issues: GitHubIssue[]): JsonApiCollectionDocument {
    const data = issues.map((i) => this.#issueToResource(i));
    const seen = new Set<string>();
    const included: JsonApiResource[] = [];
    for (const issue of issues) {
      const login = issue.user?.login ?? 'unknown';
      if (!seen.has(login)) {
        seen.add(login);
        included.push(this.#authorResource(login));
      }
    }
    return { data, included };
  }
}
```

- [ ] **Step 6: Run tests to confirm all pass**

Run: `npm run test:ember`
Expected: all tests pass including the three new robustness tests

- [ ] **Step 7: Commit**

```bash
git add app/sources/github-rfc-source.ts tests/unit/sources/github-rfc-source-test.ts
git commit -m "fix: add fetch timeout, JSON parse guard, truncation warning to GitHubRfcSource (O2, O3, O13, O14, O17)"
```

---

## Task 4: Missing Unit Tests (O5, O6, O7)

**Files:**
- Modify: `tests/unit/sources/github-rfc-source-test.ts` — add `fetchOne` tests (O5)
- Modify: `tests/unit/controllers/rfcs-test.ts` — replace stub with real tests (O6)
- Rename + replace: `tests/unit/serializers/rfc-test.js` → `rfc-test.ts` — add normalization test (O7)

### O5: `GitHubRfcSource.fetchOne` tests

- [ ] **Step 1: Add `fetchOne` tests to the GitHubRfcSource test file**

Add these tests to `tests/unit/sources/github-rfc-source-test.ts` inside the `module(...)` block. Note: `MOCK_ISSUES[0]` is the issue with `number: 724`, `user: { login: 'gitKrystan' }`, `labels: [{ name: 'S-Released' }]`.

```typescript
test('fetchOne returns a single JSON:API document for the given id', async function (assert) {
  globalThis.fetch = async () =>
    ({
      ok: true,
      url: 'https://api.github.com/repos/emberjs/rfcs/issues/724',
      json: async () => MOCK_ISSUES[0],
    }) as unknown as Response;
  const source = new GitHubRfcSource();
  const doc = await source.fetchOne('724');
  assert.strictEqual(doc.data.id, '724');
  assert.strictEqual(doc.data.type, 'rfc');
  assert.strictEqual(doc.data.attributes['status'], 'released');
});

test('fetchOne includes the author resource for the issue', async function (assert) {
  globalThis.fetch = async () =>
    ({
      ok: true,
      url: 'https://api.github.com/repos/emberjs/rfcs/issues/724',
      json: async () => MOCK_ISSUES[0],
    }) as unknown as Response;
  const source = new GitHubRfcSource();
  const doc = await source.fetchOne('724');
  assert.ok(doc.included, 'has included');
  assert.strictEqual(doc.included?.length, 1, 'exactly one author resource');
  assert.strictEqual(doc.included?.[0]?.id, 'gitKrystan');
  assert.strictEqual(doc.included?.[0]?.type, 'author');
});

test('fetchOne throws on non-ok response', async function (assert) {
  globalThis.fetch = async () => ({ ok: false, status: 404 }) as Response;
  const source = new GitHubRfcSource();
  await assert.rejects(source.fetchOne('999'), /404/);
});
```

- [ ] **Step 2: Run tests to confirm they pass immediately**

Run: `npm run test:ember`
Expected: the three `fetchOne` tests PASS (the implementation already exists; these are pure coverage additions)

### O6: `RfcsController.filteredRfcs` unit tests

- [ ] **Step 3: Replace the stub in `tests/unit/controllers/rfcs-test.ts`**

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';
import type RfcsController from 'rfc-embers/controllers/rfcs';
import type Rfc from 'rfc-embers/models/rfc';
import type { RfcStatus } from 'rfc-embers/models/rfc';

function makeRfc(status: RfcStatus): Partial<Rfc> {
  return { status };
}

module('Unit | Controller | rfcs', function (hooks) {
  setupTest(hooks);

  test('filteredRfcs returns all RFCs when activeStatus is null', function (assert) {
    const controller = this.owner.lookup('controller:rfcs') as RfcsController;
    controller.model = [
      makeRfc('proposed'),
      makeRfc('accepted'),
      makeRfc('released'),
    ] as Rfc[];
    controller.activeStatus = null;
    assert.strictEqual(controller.filteredRfcs.length, 3);
  });

  test('filteredRfcs returns only RFCs matching the active status', function (assert) {
    const controller = this.owner.lookup('controller:rfcs') as RfcsController;
    controller.model = [
      makeRfc('proposed'),
      makeRfc('accepted'),
      makeRfc('proposed'),
    ] as Rfc[];
    controller.activeStatus = 'proposed';
    assert.strictEqual(controller.filteredRfcs.length, 2);
  });

  test('filteredRfcs returns empty array when no RFCs match status', function (assert) {
    const controller = this.owner.lookup('controller:rfcs') as RfcsController;
    controller.model = [makeRfc('proposed'), makeRfc('accepted')] as Rfc[];
    controller.activeStatus = 'released';
    assert.strictEqual(controller.filteredRfcs.length, 0);
  });

  test('filteredRfcs is reactive — updates when activeStatus changes', function (assert) {
    const controller = this.owner.lookup('controller:rfcs') as RfcsController;
    controller.model = [makeRfc('proposed'), makeRfc('released')] as Rfc[];
    controller.activeStatus = null;
    assert.strictEqual(controller.filteredRfcs.length, 2, 'all when null');
    controller.activeStatus = 'released';
    assert.strictEqual(controller.filteredRfcs.length, 1, 'filtered after change');
  });
});
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm run test:ember`
Expected: all four controller tests PASS

### O7: Serializer `github-handle` → `githubHandle` normalization test

- [ ] **Step 5: Rename the stub serializer test from `.js` to `.ts`**

```bash
git mv tests/unit/serializers/rfc-test.js tests/unit/serializers/rfc-test.ts
```

- [ ] **Step 6: Replace the file contents with a proper TS test**

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

module('Unit | Serializer | rfc', function (hooks) {
  setupTest(hooks);

  test('serializer exists', function (assert) {
    const store = this.owner.lookup('service:store') as { serializerFor: (name: string) => unknown };
    assert.ok(store.serializerFor('rfc'), 'rfc serializer is registered');
  });

  test('keyForAttribute normalizes github-handle to githubHandle on deserialize', function (assert) {
    const store = this.owner.lookup('service:store') as {
      serializerFor: (name: string) => { keyForAttribute: (key: string, method: string) => string };
    };
    const serializer = store.serializerFor('rfc');
    const result = serializer.keyForAttribute('github-handle', 'deserialize');
    assert.strictEqual(
      result,
      'githubHandle',
      'github-handle in JSON:API payload maps to githubHandle model attribute',
    );
  });

  test('keyForAttribute dasherizes githubHandle on serialize', function (assert) {
    const store = this.owner.lookup('service:store') as {
      serializerFor: (name: string) => { keyForAttribute: (key: string, method: string) => string };
    };
    const serializer = store.serializerFor('rfc');
    const result = serializer.keyForAttribute('githubHandle', 'serialize');
    assert.strictEqual(
      result,
      'github-handle',
      'githubHandle model attribute serializes to github-handle JSON key',
    );
  });
});
```

- [ ] **Step 7: Run tests to confirm they pass**

Run: `npm run test:ember`
Expected: all three serializer tests PASS

- [ ] **Step 8: Commit**

```bash
git add tests/unit/sources/github-rfc-source-test.ts
git add tests/unit/controllers/rfcs-test.ts
git add tests/unit/serializers/rfc-test.ts
git commit -m "test: add missing coverage for fetchOne, filteredRfcs, and serializer normalization (O5, O6, O7)"
```

---

## Task 5: Error Substates (O1)

**Files:**
- Create: `app/templates/rfcs-error.hbs`
- Create: `app/templates/rfc-error.hbs`
- Modify: `tests/acceptance/rfcs-test.ts`
- Modify: `tests/acceptance/rfc-test.ts`

Ember automatically renders `<route>-error.hbs` when a route's model hook throws. The error object is available as `this.model` in the template.

- [ ] **Step 1: Write a failing acceptance test for the rfcs error substate**

Add to `tests/acceptance/rfcs-test.ts`:

```typescript
test('shows error substate when source throws', async function (assert) {
  this.owner.register(
    'source:rfc',
    {
      fetchAll: async () => {
        throw new Error('network failure');
      },
      fetchOne: async () => {
        throw new Error('network failure');
      },
    },
    { instantiate: false },
  );
  await visit('/rfcs');
  assert.dom('[data-test-rfcs-error]').exists('error substate is rendered');
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npm run test:ember`
Expected: the new test FAILS because visiting `/rfcs` produces a blank page (no error template exists yet)

- [ ] **Step 3: Create `app/templates/rfcs-error.hbs`**

```handlebars
<div class="error-page" data-test-rfcs-error>
  <h2>Could not load RFCs</h2>
  <p class="error-message">{{this.model.message}}</p>
  <LinkTo @route="rfcs">Try again</LinkTo>
</div>
```

- [ ] **Step 4: Write a failing acceptance test for the rfc detail error substate**

Add to `tests/acceptance/rfc-test.ts`:

```typescript
test('shows error substate when fetching a single RFC fails', async function (assert) {
  this.owner.register(
    'source:rfc',
    {
      fetchAll: async () => ({ data: [], included: [] }),
      fetchOne: async () => {
        throw new Error('not found');
      },
    },
    { instantiate: false },
  );
  await visit('/rfcs/724');
  assert.dom('[data-test-rfc-error]').exists('error substate is rendered');
});
```

- [ ] **Step 5: Run test to confirm it fails**

Run: `npm run test:ember`
Expected: the new rfc detail error test FAILS

- [ ] **Step 6: Create `app/templates/rfc-error.hbs`**

```handlebars
<div class="error-page" data-test-rfc-error>
  <h2>Could not load RFC</h2>
  <p class="error-message">{{this.model.message}}</p>
  <LinkTo @route="rfcs">← Back to all RFCs</LinkTo>
</div>
```

- [ ] **Step 7: Run tests to confirm both error substate tests pass**

Run: `npm run test:ember`
Expected: all tests pass including the two new error substate tests

- [ ] **Step 8: Commit**

```bash
git add app/templates/rfcs-error.hbs app/templates/rfc-error.hbs
git add tests/acceptance/rfcs-test.ts tests/acceptance/rfc-test.ts
git commit -m "feat: add error substates for rfcs and rfc routes (O1)"
```

---

## Task 6: Loading Substates (O15)

**Files:**
- Create: `app/templates/rfcs-loading.hbs`
- Create: `app/templates/rfc-loading.hbs`

Loading substates are harder to test reliably in QUnit (they require controlling async timing). Add the templates without automated tests — they are visually verifiable during development.

- [ ] **Step 1: Create `app/templates/rfcs-loading.hbs`**

```handlebars
<div class="loading-page" data-test-rfcs-loading>
  <p>Loading RFCs…</p>
</div>
```

- [ ] **Step 2: Create `app/templates/rfc-loading.hbs`**

```handlebars
<div class="loading-page" data-test-rfc-loading>
  <p>Loading RFC…</p>
</div>
```

- [ ] **Step 3: Run tests to confirm nothing broke**

Run: `npm run test:ember`
Expected: all tests still pass

- [ ] **Step 4: Commit**

```bash
git add app/templates/rfcs-loading.hbs app/templates/rfc-loading.hbs
git commit -m "feat: add loading substates for rfcs and rfc routes (O15)"
```

---

## Task 7: Route Input Validation (O16)

**Files:**
- Modify: `tests/acceptance/rfc-test.ts` (test first)
- Modify: `app/routes/rfc.ts` (implementation)

- [ ] **Step 1: Write a failing test for invalid `rfc_id`**

Add to `tests/acceptance/rfc-test.ts`:

```typescript
test('shows error substate for a non-numeric rfc_id', async function (assert) {
  await visit('/rfcs/banana');
  assert.dom('[data-test-rfc-error]').exists('error substate shown for invalid id');
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npm run test:ember`
Expected: the test FAILS — visiting `/rfcs/banana` currently fires a GitHub API fetch for `issues/banana`, which returns a 404 eventually

- [ ] **Step 3: Implement validation in `app/routes/rfc.ts`**

```typescript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';

export default class RfcRoute extends Route {
  @service declare store: Store;

  async model(params: { rfc_id: string }) {
    if (!/^\d+$/.test(params.rfc_id)) {
      throw new Error(`Invalid RFC id: "${params.rfc_id}". RFC ids must be numeric.`);
    }
    return this.store.findRecord('rfc', params.rfc_id, { reload: true });
  }
}
```

- [ ] **Step 4: Run tests to confirm the validation test passes**

Run: `npm run test:ember`
Expected: all tests pass including the new invalid-id test

- [ ] **Step 5: Commit**

```bash
git add app/routes/rfc.ts tests/acceptance/rfc-test.ts
git commit -m "fix: validate rfc_id is numeric before fetching, prevent blank page on /rfcs/banana (O16)"
```

---

## Verification

- [ ] **Final: run full test suite and type check**

```bash
npm run lint:types && npm run test:ember
```

Expected: `lint:types` exits 0, all test suites pass

- [ ] **Update the work tracking file**

Move `docs/work/backlog/2026-04-15-ember-v6-upgrade.md` `blocked-by` entry to resolved once all tasks above are committed. The v6 upgrade can then proceed.
