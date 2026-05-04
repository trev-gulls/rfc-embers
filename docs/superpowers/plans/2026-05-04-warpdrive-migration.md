# WarpDrive Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate rfc-embers from EmberData 5.8.x to EmberData 6 / WarpDrive, clearing `ember-data:deprecate-legacy-imports` and `warp-drive:deprecate-legacy-request-methods` while keeping the adapter/serializer layer intact.

**Architecture:** The `ember-data` umbrella package already auto-configures a `RequestManager` with `LegacyNetworkHandler` — no store service changes needed. The migration replaces `@ember-data/*` subpackage imports with `ember-data/*` consolidated imports, and replaces `store.findRecord`/`store.query` call sites with `store.request()` + WarpDrive builders from `@ember-data/json-api/request`. `RfcAdapter`, `RfcSerializer`, and the `RfcGateway` boundary are structurally untouched.

**Tech Stack:** Ember 6.12, EmberData 5.8 → 6.x, WarpDrive `LegacyNetworkHandler`, `@ember-data/json-api/request` builders, QUnit, Node/npm

---

## File Map

| File | Action | Why |
|---|---|---|
| `tests/unit/routes/rfcs-test.ts` | Create | Behavioral regression net for `RfcsRoute#model()` |
| `tests/unit/routes/rfc-test.ts` | Create | Behavioral regression net for `RfcRoute#model()` |
| `tests/unit/adapters/rfc-test.js` | Modify (add tests) | Verify adapter delegates to gateway correctly |
| `app/adapters/rfc.ts` | Modify (import only) | `@ember-data/adapter/json-api` → `ember-data/adapter/json-api` |
| `app/serializers/rfc.ts` | Modify (import only) | `@ember-data/serializer/json-api` → `ember-data/serializer/json-api` |
| `app/serializers/application.ts` | Modify (import only) | same |
| `app/routes/rfcs.ts` | Modify (import + logic) | `store.query` → `store.request(query(...))` |
| `app/routes/rfc.ts` | Modify (import + logic) | `store.findRecord` → `store.request(findRecord(...))` |
| `package.json` | Modify | Bump ember-data to ~6.12.0, remove `@types/ember-data__*` shims |

**Unchanged:** `app/services/store.ts`, `app/models/*.ts`, `app/gateways/`, `app/sources/`, all components/templates.

---

## Task 1: Write route behavioral tests (regression net)

> Tests must pass on the **current** code. They serve as a regression net — if they break during migration, something went wrong.

**Files:**
- Create: `tests/unit/routes/rfcs-test.ts`
- Create: `tests/unit/routes/rfc-test.ts`

- [ ] **Step 1: Create `tests/unit/routes/rfcs-test.ts`**

```ts
import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

const MOCK_COLLECTION = {
  data: [
    {
      id: '100',
      type: 'rfc',
      attributes: {
        title: 'First-class Component Templates',
        number: 100,
        status: 'proposed',
        summary: 'Introduces first-class component templates.',
      },
      relationships: {
        author: { data: { id: 'wycats', type: 'author' } },
      },
    },
    {
      id: '200',
      type: 'rfc',
      attributes: {
        title: 'Tracked Properties',
        number: 200,
        status: 'released',
        summary: 'Makes properties trackable.',
      },
      relationships: {
        author: { data: { id: 'pzuraq', type: 'author' } },
      },
    },
  ],
  included: [
    {
      id: 'wycats',
      type: 'author',
      attributes: { name: 'wycats', 'github-handle': 'wycats' },
    },
    {
      id: 'pzuraq',
      type: 'author',
      attributes: { name: 'pzuraq', 'github-handle': 'pzuraq' },
    },
  ],
};

module('Unit | Route | rfcs', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'source:rfc',
      {
        fetchAll: async () => MOCK_COLLECTION,
        // RfcAdapter's gateway getter requires both methods to be present
        fetchOne: async (_id: string) => ({
          data: MOCK_COLLECTION.data[0]!,
          included: MOCK_COLLECTION.included,
        }),
      },
      { instantiate: false },
    );
  });

  test('model() returns all RFC records from the gateway', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = this.owner.lookup('route:rfcs') as any;
    const result = await route.model();

    assert.strictEqual(result.length, 2, 'returns two RFC records');
  });

  test('model() normalizes RFC attributes from the gateway response', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = this.owner.lookup('route:rfcs') as any;
    const result = await route.model();

    assert.strictEqual(
      result[0].title,
      'First-class Component Templates',
      'first RFC has correct title',
    );
    assert.strictEqual(result[0].status, 'proposed', 'first RFC has correct status');
    assert.strictEqual(result[1].title, 'Tracked Properties', 'second RFC has correct title');
    assert.strictEqual(result[1].status, 'released', 'second RFC has correct status');
  });
});
```

- [ ] **Step 2: Create `tests/unit/routes/rfc-test.ts`**

```ts
import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

const MOCK_SINGULAR = {
  data: {
    id: '42',
    type: 'rfc',
    attributes: {
      title: 'Named Blocks',
      number: 42,
      status: 'released',
      summary: 'Adds named blocks to templates.',
    },
    relationships: {
      author: { data: { id: 'tomdale', type: 'author' } },
    },
  },
  included: [
    {
      id: 'tomdale',
      type: 'author',
      attributes: { name: 'tomdale', 'github-handle': 'tomdale' },
    },
  ],
};

module('Unit | Route | rfc', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'source:rfc',
      {
        // RfcAdapter's gateway getter requires both methods to be present
        fetchAll: async () => ({ data: [], included: [] }),
        fetchOne: async (_id: string) => MOCK_SINGULAR,
      },
      { instantiate: false },
    );
  });

  test('model() returns a single RFC by id', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = this.owner.lookup('route:rfc') as any;
    const result = await route.model({ rfc_id: '42' });

    assert.strictEqual(result.title, 'Named Blocks', 'RFC has correct title');
    assert.strictEqual(result.number, 42, 'RFC has correct number');
    assert.strictEqual(result.status, 'released', 'RFC has correct status');
    assert.strictEqual(
      result.summary,
      'Adds named blocks to templates.',
      'RFC has correct summary',
    );
  });

  test('model() throws for non-numeric ids', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = this.owner.lookup('route:rfc') as any;

    await assert.rejects(
      route.model({ rfc_id: 'not-a-number' }),
      /Invalid RFC id/,
      'rejects with "Invalid RFC id" for non-numeric input',
    );
  });
});
```

- [ ] **Step 3: Run tests — verify both new test modules pass**

```bash
npm run test:ember 2>&1 | grep -E "(PASS|FAIL|Unit \| Route)"
```

Expected: all four new tests show as passing. No failures. Fix anything that fails before continuing.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/routes/rfcs-test.ts tests/unit/routes/rfc-test.ts
git commit -m "test: add behavioral route tests as migration regression net

Unit tests for RfcsRoute#model() and RfcRoute#model() that assert the
gateway is called and records are normalized correctly. These pass on
current code and will continue to pass after the WarpDrive migration
without modification."
```

---

## Task 2: Add adapter behavioral tests

**Files:**
- Modify: `tests/unit/adapters/rfc-test.js`

- [ ] **Step 1: Replace `tests/unit/adapters/rfc-test.js` with the expanded version**

The existing `it exists` test is preserved unchanged. Add two new tests:

```js
import { setupTest } from 'rfc-embers/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Adapter | rfc', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const adapter = this.owner.lookup('adapter:rfc');
    assert.ok(adapter, 'adapter exists');
  });

  test('query() delegates to gateway.fetchAll() and returns its document', async function (assert) {
    let fetchAllCalled = false;
    const expectedDocument = {
      data: [
        {
          id: '1',
          type: 'rfc',
          attributes: { title: 'Test RFC', number: 1, status: 'proposed', summary: '' },
          relationships: { author: { data: { id: 'testuser', type: 'author' } } },
        },
      ],
      included: [
        {
          id: 'testuser',
          type: 'author',
          attributes: { name: 'testuser', 'github-handle': 'testuser' },
        },
      ],
    };

    this.owner.register(
      'source:rfc',
      {
        fetchAll: async () => {
          fetchAllCalled = true;
          return expectedDocument;
        },
        // gateway getter requires both methods present; use a valid no-op shape
        fetchOne: async () => ({ data: { id: '', type: 'rfc', attributes: {} }, included: [] }),
      },
      { instantiate: false },
    );

    const adapter = this.owner.lookup('adapter:rfc');
    const result = await adapter.query(undefined, undefined, {});

    assert.true(fetchAllCalled, 'gateway.fetchAll() was called');
    assert.deepEqual(result, expectedDocument, 'returns the JSON:API document from the gateway');
  });

  test('findRecord() calls gateway.fetchOne() with the correct id', async function (assert) {
    let receivedId;
    const expectedDocument = {
      data: {
        id: '99',
        type: 'rfc',
        attributes: { title: 'Numeric Id RFC', number: 99, status: 'proposed', summary: '' },
        relationships: { author: { data: { id: 'testuser', type: 'author' } } },
      },
      included: [
        {
          id: 'testuser',
          type: 'author',
          attributes: { name: 'testuser', 'github-handle': 'testuser' },
        },
      ],
    };

    this.owner.register(
      'source:rfc',
      {
        // gateway getter requires both methods present
        fetchAll: async () => ({ data: [], included: [] }),
        fetchOne: async (id) => {
          receivedId = id;
          return expectedDocument;
        },
      },
      { instantiate: false },
    );

    const adapter = this.owner.lookup('adapter:rfc');
    const result = await adapter.findRecord(undefined, undefined, '99');

    assert.strictEqual(receivedId, '99', 'gateway.fetchOne() was called with the correct id');
    assert.deepEqual(result, expectedDocument, 'returns the JSON:API document from the gateway');
  });
});
```

- [ ] **Step 2: Run tests — verify all adapter tests pass**

```bash
npm run test:ember 2>&1 | grep -E "(PASS|FAIL|Unit \| Adapter)"
```

Expected: all three adapter tests pass (existing `it exists` + two new ones).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/adapters/rfc-test.js
git commit -m "test: add adapter behavioral tests for gateway delegation

Verify RfcAdapter.query() calls gateway.fetchAll() and
RfcAdapter.findRecord() calls gateway.fetchOne() with the correct id.
These tests pass on current code and survive the WarpDrive migration
unchanged since the adapter layer is not restructured."
```

---

## Task 3: Fix legacy adapter and serializer import paths

> Clears `ember-data:deprecate-legacy-imports` for the adapter/serializer files.
> No behavior changes — only the import source changes.

**Files:**
- Modify: `app/adapters/rfc.ts`
- Modify: `app/serializers/rfc.ts`
- Modify: `app/serializers/application.ts`

- [ ] **Step 1: Update `app/adapters/rfc.ts`**

Change line 1 only (`@ember-data` → `ember-data`). Everything else stays byte-for-byte identical:

```ts
import JSONAPIAdapter from 'ember-data/adapter/json-api';
import { getOwner } from '@ember/application';
import type RfcGateway from '../gateways/rfc-gateway';

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

  // @ts-expect-error: EmberData's adapter chain returns RSVP.Promise which carries a 'new'
  // constructor signature; native async returns platform Promise which lacks it. Runtime is
  // correct — remove this suppression if EmberData drops RSVP from its type definitions.
  async query(
    _store: unknown,
    _type: unknown,
    _params: Record<string, unknown>,
  ) {
    return this.gateway.fetchAll();
  }

  // @ts-expect-error: same RSVP.Promise vs native Promise incompatibility as query above.
  async findRecord(_store: unknown, _type: unknown, id: string) {
    return this.gateway.fetchOne(id);
  }
}
```

- [ ] **Step 2: Update `app/serializers/rfc.ts`**

```ts
import JSONAPISerializer from 'ember-data/serializer/json-api';

export default class RfcSerializer extends JSONAPISerializer {}
```

- [ ] **Step 3: Update `app/serializers/application.ts`**

```ts
import JSONAPISerializer from 'ember-data/serializer/json-api';

export default class ApplicationSerializer extends JSONAPISerializer {}
```

- [ ] **Step 4: Run tests — verify all tests still pass**

```bash
npm run test:ember
```

Expected: all existing tests pass. Look for the string `ember-data:deprecate-legacy-imports` in the output — it should no longer appear for the adapter/serializer files. If it still appears, check the output for which file is still importing from `@ember-data/*`.

- [ ] **Step 5: Commit**

```bash
git add app/adapters/rfc.ts app/serializers/rfc.ts app/serializers/application.ts
git commit -m "fix: consolidate adapter/serializer imports to ember-data entry point

Replaces @ember-data/adapter/json-api and @ember-data/serializer/json-api
subpackage imports with the ember-data consolidated equivalents, clearing
the ember-data:deprecate-legacy-imports deprecation for these files.
No behavior change."
```

---

## Task 4: Bump ember-data to 6.x and remove legacy type shims

> Enables EmberData 6 features (needed for builders), removes the `@types/ember-data__*`
> shims (EmberData 6 ships its own types).

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Check the latest available ember-data 6.x version**

```bash
npm view ember-data versions --json | node -e "const v=JSON.parse(require('fs').readFileSync(0,'utf8'));v.filter(x=>x.startsWith('6.')).forEach(x=>console.log(x))"
```

Look for the latest `6.x.y` release. Use `~6.12.0` if available (to match `ember-source: ~6.12.0`). Use the highest available 6.x if 6.12 is not yet released.

- [ ] **Step 2: Upgrade ember-data and remove @types shims**

```bash
npm install --save-dev ember-data@~6.12.0
npm remove @types/ember-data__adapter @types/ember-data__model @types/ember-data__serializer @types/ember-data__store
```

If `ember-data@~6.12.0` is not found, substitute the actual latest 6.x version from Step 1.

- [ ] **Step 3: Run type-check — verify it passes**

```bash
npm run lint:types
```

Expected: exits 0. If it fails with type errors referencing `@ember-data/model`, the model files may need their imports updated — see the note in Step 4 below.

- [ ] **Step 4: Check model files for deprecation warnings**

```bash
npm run test:ember 2>&1 | grep "deprecate-legacy-imports"
```

If warnings appear referencing `app/models/rfc.ts` or `app/models/author.ts`, update both files: change `import Model, { attr, belongsTo } from '@ember-data/model'` → `import Model, { attr, belongsTo } from 'ember-data/model'` (and `import Model, { attr }` similarly). The `declare module 'ember-data/types/registries/model'` block in each file stays unchanged.

If no warnings appear, skip this change.

- [ ] **Step 5: Run full tests — verify everything still passes**

```bash
npm run test:ember
```

Expected: all tests pass. Resolve any EmberData 6 breaking changes before continuing (check the [WarpDrive changelog](https://github.com/emberjs/data/releases) if unexpected failures appear).

- [ ] **Step 6: Commit**

```bash
# Stage package.json and package-lock.json (and model files if they were changed in Step 4)
git add package.json package-lock.json
git commit -m "chore: bump ember-data to ~6.x, remove legacy @types shims

EmberData 6 ships its own types from the consolidated ember-data package,
making the @types/ember-data__* DefinitelyTyped shims redundant."
```

---

## Task 5: Convert routes to store.request() with WarpDrive builders

> Clears `warp-drive:deprecate-legacy-request-methods`.
> Builders are imported from `@ember-data/json-api/request` (a subpath of the
> `@ember-data/json-api` package already in `dependencies`).

**Files:**
- Modify: `app/routes/rfcs.ts`
- Modify: `app/routes/rfc.ts`

- [ ] **Step 1: Update `app/routes/rfcs.ts`**

```ts
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { query } from '@ember-data/json-api/request';
import type Store from 'ember-data/store';

export default class RfcsRoute extends Route {
  @service declare store: Store;

  async model() {
    const { content } = await this.store.request(query('rfc', {}));
    return content.data;
  }
}
```

Note: `query('rfc', {})` maps to `op: 'query'`, which `LegacyNetworkHandler` routes to
`RfcAdapter.query()`. The `content.data` return value is the array of normalized Rfc records —
the same shape the template already receives from the old `store.query()` call.

- [ ] **Step 2: Update `app/routes/rfc.ts`**

```ts
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { findRecord } from '@ember-data/json-api/request';
import type Store from 'ember-data/store';

export default class RfcRoute extends Route {
  @service declare store: Store;

  async model(params: { rfc_id: string }) {
    if (!/^\d+$/.test(params.rfc_id)) {
      throw new Error(
        `Invalid RFC id: "${params.rfc_id}". RFC ids must be numeric.`,
      );
    }
    const { content } = await this.store.request(findRecord('rfc', params.rfc_id));
    return content.data;
  }
}
```

Note: `reload: true` is dropped — every `store.request()` call dispatches through
`LegacyNetworkHandler` to the adapter, which always fetches fresh from the gateway.
The `findRecord('rfc', id)` builder sets `op: 'findRecord'`.

- [ ] **Step 3: Run tests — verify all tests still pass**

```bash
npm run test:ember
```

Expected: all tests pass including the regression net from Tasks 1–2. The four route tests and two new adapter tests should all be green.

- [ ] **Step 4: Confirm both deprecations are cleared**

```bash
npm run test:ember 2>&1 | grep -E "deprecate-legacy-imports|deprecate-legacy-request-methods"
```

Expected: no output (both deprecation strings absent). If either still appears, check the grep output for which file is the source and fix it before continuing.

- [ ] **Step 5: Run type-check**

```bash
npm run lint:types
```

Expected: exits 0. If `store.request` is not found on the `Store` type, ensure the import changed from `@ember-data/store` to `ember-data/store` (the consolidated type includes `request()`).

- [ ] **Step 6: Commit**

```bash
git add app/routes/rfcs.ts app/routes/rfc.ts
git commit -m "fix: migrate routes from store.findRecord/query to store.request()

Replaces store.findRecord and store.query with store.request() + WarpDrive
builders from @ember-data/json-api/request, clearing the
warp-drive:deprecate-legacy-request-methods deprecation.

LegacyNetworkHandler (auto-configured by the ember-data umbrella package)
bridges store.request() back to RfcAdapter.findRecord() and RfcAdapter.query(),
keeping the gateway integration and serializer normalization unchanged."
```

---

## Task 6: Final cleanup and acceptance verification

**Files:**
- Possibly modify: `package.json` (remove now-unused explicit subpackage deps)

- [ ] **Step 1: Check whether @ember-data subpackages in `dependencies` are still needed**

```bash
grep -r "@ember-data/adapter\|@ember-data/json-api\|@ember-data/serializer" app/ --include="*.ts"
```

Expected: no output (all imports consolidated). If the umbrella `ember-data@6.x` includes
these as peer/bundled packages, they can be removed from `dependencies`. Run:

```bash
npm remove @ember-data/adapter @ember-data/json-api @ember-data/serializer
npm run test:ember
```

If tests break after removal, add them back (`npm install @ember-data/adapter @ember-data/json-api @ember-data/serializer`) — they're still required as explicit deps in this version.

- [ ] **Step 2: Full acceptance run**

```bash
npm run test:ember 2>&1 | grep -E "deprecate-legacy-imports|deprecate-legacy-request-methods|FAIL"
```

Expected: no output. All three strings absent means both deprecations cleared and no test failures.

- [ ] **Step 3: Full lint pass**

```bash
npm run lint:types && npm run lint:js
```

Expected: both exit 0.

- [ ] **Step 4: Manual smoke test**

Start the dev server (`npm start`), open the RFC list route — verify RFCs load from GitHub. Click into any RFC detail — verify the RFC page loads. Both routes must display live data to pass.

- [ ] **Step 5: Commit any cleanup changes and update tracking doc**

If any changes were made in Step 1 (subpackage removal):

```bash
git add package.json package-lock.json
git commit -m "chore: remove explicit @ember-data subpackage deps (subsumed by ember-data 6)"
```

Then update the tracking doc status:

In `docs/work/backlog/2026-05-03-emberdata-6-warpdrive-migration.md`, change `status: pending` → `status: done` and check off all acceptance criteria checkboxes. Move the file to `docs/work/finished/`.

```bash
git mv docs/work/backlog/2026-05-03-emberdata-6-warpdrive-migration.md \
       docs/work/finished/2026-05-03-emberdata-6-warpdrive-migration.md
git add docs/work/finished/2026-05-03-emberdata-6-warpdrive-migration.md
git commit -m "docs: mark warpdrive migration complete"
```
