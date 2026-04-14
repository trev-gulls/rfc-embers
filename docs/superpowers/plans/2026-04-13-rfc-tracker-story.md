# RFC Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Ember.js RFC tracker demonstrating modern Ember patterns, hexagonal architecture, and scoped CSS.

**Architecture:** Hexagonal port/adapter pattern with `RfcGateway` as the port, `GitHubRfcSource` and `InMemoryRfcSource` as swappable implementations, and `RfcAdapter` bridging EmberData to the gateway. Routes use `store.request(query(...))` — the modern EmberData 5 request builder. Components are Glimmer-only with `ember-scoped-css` for encapsulated styles.

**Tech Stack:** Ember.js v5, TypeScript, EmberData 5, JSON:API, `ember-scoped-css`, `ember-truth-helpers`, QUnit/ember-qunit

---

## File Map

**App**
- `app/router.ts` — updated with rfcs and rfc routes
- `app/app.ts` — registers `GitHubRfcSource` as `source:rfc`
- `app/models/rfc.ts` — `Rfc` model with EmberData attrs + `RfcStatus` type
- `app/models/author.ts` — `Author` model
- `app/gateways/rfc-gateway.ts` — `RfcGateway` interface + shared JSON:API types
- `tests/app/sources/in-memory-rfc-source.ts` — fixture data, no network (test-only)
- `app/sources/github-rfc-source.ts` — fetches GitHub Issues API, translates to JSON:API
- `app/adapters/rfc-ember-adapter.ts` — extends `JSONAPIAdapter`, delegates to `source:rfc` gateway
- `app/serializers/rfc.ts` — extends `JSONAPISerializer` (no customization needed)
- `app/routes/rfcs.ts` — `/rfcs` list route, uses `store.request(query(...))`
- `app/routes/rfc.ts` — `/rfcs/:rfc_id` detail route, uses `store.request(findRecord(...))`
- `app/controllers/rfcs.ts` — filter state (`@tracked activeStatus`, `filteredRfcs` getter)
- `app/templates/rfcs.hbs` — list template with `<RfcFilter>` and `<RfcCard>`
- `app/templates/rfc.hbs` — detail template
- `app/components/status-badge/index.ts` — minimal Glimmer component class
- `app/components/status-badge/index.hbs` — renders `<span>` with status class
- `app/components/status-badge/index.css` — per-status color badges (scoped)
- `app/components/rfc-card/index.ts` — `@tracked isExpanded`, `toggleExpanded` action
- `app/components/rfc-card/index.hbs` — card with expand/collapse toggle
- `app/components/rfc-card/index.css` — card layout (scoped)
- `app/components/rfc-filter/index.ts` — `selectStatus` action, `statuses` getter
- `app/components/rfc-filter/index.hbs` — filter button bar
- `app/components/rfc-filter/index.css` — pill-style filter buttons (scoped)

**Tests**
- `tests/unit/models/rfc-test.ts` — verifies Rfc model attributes are readable after createRecord; no network
- `tests/unit/models/author-test.ts` — verifies Author model attributes; no network
- `tests/unit/sources/in-memory-rfc-source-test.ts` — verifies fixture shape matches the JsonApiDocument contract; covers fetchAll and fetchOne including error case
- `tests/unit/sources/github-rfc-source-test.ts` — stubs globalThis.fetch; verifies GitHub Issues → JSON:API translation and label-to-status mapping without hitting the network
- `tests/integration/components/status-badge-test.ts` — renders StatusBadge in a real DOM context; asserts text content and CSS class per status value
- `tests/integration/components/rfc-card-test.ts` — renders RfcCard with a stub RFC; asserts expand/collapse toggle behavior via click
- `tests/integration/components/rfc-filter-test.ts` — renders RfcFilter; asserts all status buttons render, active state reflects @activeStatus, and onFilterChange is called with the correct value
- `tests/acceptance/rfcs-test.ts` — visits /rfcs with InMemoryRfcSource registered; asserts cards render and status filter narrows the list
- `tests/acceptance/rfc-test.ts` — visits /rfcs/724; asserts title, number, author, summary, and status badge render correctly

---

### Task 1: Scaffold the Ember App

**Files:**
- Modify: `app/router.ts`
- Modify: `package.json` (deps added by npm install)

- [ ] **Step 1: Initialize Ember TypeScript project in the current directory**

The `rfc-tracker` directory already exists with `.git` and `docs/`. Use `ember init` to scaffold into it:

```bash
npx ember-cli init --typescript
```

If `--typescript` is not supported by `init`, run from the parent directory instead, then copy all generated files over:

```bash
cd .. && npx ember-cli new rfc-tracker --typescript --skip-git
```

Expected: `app/`, `tests/`, `config/`, `ember-cli-build.js`, `package.json` and friends are created.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install ember-scoped-css @ember-data/json-api @ember-data/adapter @ember-data/serializer ember-truth-helpers
```

Expected: packages added to `node_modules` and `package.json`.

- [ ] **Step 3: Update the router**

Replace the body of the `Router.map` call in `app/router.ts`:

```typescript
import EmberRouter from '@ember/routing/router';
import config from 'rfc-tracker/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('rfcs');
  this.route('rfc', { path: '/rfcs/:rfc_id' });
});
```

- [ ] **Step 4: Run the baseline test suite**

```bash
npm test
```

Expected: default scaffold tests pass (application renders).

- [ ] **Step 5: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Ember TypeScript app with ember-scoped-css"
```

---

### Task 2: Author and Rfc Models

**Files:**
- Create: `app/models/rfc.ts`
- Create: `app/models/author.ts`
- Create: `tests/unit/models/rfc-test.ts`
- Create: `tests/unit/models/author-test.ts`

- [ ] **Step 1: Generate model stubs**

```bash
npx ember-cli generate model rfc
npx ember-cli generate model author
```

Expected: creates stubs in `app/models/` and test stubs in `tests/unit/models/`.

- [ ] **Step 2: Write failing test for Rfc model**

Replace `tests/unit/models/rfc-test.ts`:

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Model | rfc', function (hooks) {
  setupTest(hooks);

  test('it has the expected attributes', function (assert) {
    const store = this.owner.lookup('service:store') as any;
    const record = store.createRecord('rfc', {
      title: 'Native TypeScript Types',
      number: 724,
      status: 'released',
      summary: 'Ship native TypeScript types with Ember packages.',
    });
    assert.strictEqual(record.title, 'Native TypeScript Types');
    assert.strictEqual(record.number, 724);
    assert.strictEqual(record.status, 'released');
    assert.strictEqual(record.summary, 'Ship native TypeScript types with Ember packages.');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx ember test --filter "Unit | Model | rfc"
```

Expected: FAIL — model has no attributes yet.

- [ ] **Step 4: Implement Rfc model**

Replace `app/models/rfc.ts`:

```typescript
import Model, { attr, belongsTo } from '@ember-data/model';
import type Author from './author';

export type RfcStatus = 'proposed' | 'accepted' | 'released' | 'closed';

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

- [ ] **Step 5: Write failing test for Author model**

Replace `tests/unit/models/author-test.ts`:

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Model | author', function (hooks) {
  setupTest(hooks);

  test('it has the expected attributes', function (assert) {
    const store = this.owner.lookup('service:store') as any;
    const record = store.createRecord('author', {
      name: 'Krystan HuffMenne',
      githubHandle: 'gitKrystan',
    });
    assert.strictEqual(record.name, 'Krystan HuffMenne');
    assert.strictEqual(record.githubHandle, 'gitKrystan');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx ember test --filter "Unit | Model | author"
```

Expected: FAIL — model has no attributes yet.

- [ ] **Step 7: Implement Author model**

Replace `app/models/author.ts`:

```typescript
import Model, { attr } from '@ember-data/model';

export default class Author extends Model {
  @attr('string') declare name: string;
  @attr('string') declare githubHandle: string;
}

declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    author: Author;
  }
}
```

Note: The JSON:API attribute name `github-handle` is automatically camelized to `githubHandle` by `JSONAPISerializer`.

- [ ] **Step 8: Run model tests to verify they pass**

```bash
npx ember test --filter "Unit | Model"
```

Expected: PASS for both rfc and author model tests.

- [ ] **Step 9: Commit models**

```bash
git add app/models/ tests/unit/models/
git commit -m "feat: add Rfc and Author EmberData models"
```

---

### Task 3: RfcGateway Interface and InMemoryRfcSource

**Files:**
- Create: `app/gateways/rfc-gateway.ts`
- Create: `tests/app/sources/in-memory-rfc-source.ts`
- Create: `tests/unit/sources/in-memory-rfc-source-test.ts`

- [ ] **Step 1: Create the RfcGateway interface**

Create `app/gateways/rfc-gateway.ts`:

```typescript
export interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data: { id: string; type: string } | null }>;
}

export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
}

export default interface RfcGateway {
  fetchAll(params?: Record<string, unknown>): Promise<JsonApiDocument>;
  fetchOne(id: string): Promise<JsonApiDocument>;
}
```

No test needed — this is a pure TypeScript interface with no runtime behavior.

- [ ] **Step 2: Write failing tests for InMemoryRfcSource**

Create `tests/unit/sources/in-memory-rfc-source-test.ts`:

```typescript
import { module, test } from 'qunit';
import InMemoryRfcSource from 'rfc-tracker/tests/app/sources/in-memory-rfc-source';
import type { JsonApiResource } from 'rfc-tracker/gateways/rfc-gateway';

module('Unit | Source | InMemoryRfcSource', function () {
  test('fetchAll returns an array of 3 RFC resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    assert.ok(Array.isArray(doc.data), 'data is an array');
    assert.strictEqual((doc.data as unknown[]).length, 3, 'returns 3 fixtures');
  });

  test('fetchAll data items are valid JSON:API resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    const items = doc.data as JsonApiResource[];
    for (const item of items) {
      assert.ok(item.id, `item ${item.id} has id`);
      assert.strictEqual(item.type, 'rfc', `item ${item.id} has type 'rfc'`);
      assert.ok(item.attributes['title'], `item ${item.id} has title`);
      assert.ok(item.attributes['status'], `item ${item.id} has status`);
    }
  });

  test('fetchOne returns a single RFC by id', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchOne('724');
    const item = doc.data as JsonApiResource;
    assert.strictEqual(item.id, '724');
    assert.strictEqual(item.type, 'rfc');
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
    const author = (doc.included ?? [])[0];
    assert.strictEqual(author?.type, 'author');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx ember test --filter "Unit | Source | InMemoryRfcSource"
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement InMemoryRfcSource**

Create `tests/app/sources/in-memory-rfc-source.ts`:

```typescript
import type RfcGateway from '../gateways/rfc-gateway';
import type { JsonApiDocument, JsonApiResource } from '../gateways/rfc-gateway';

const FIXTURES: JsonApiDocument = {
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
  async fetchAll(_params?: Record<string, unknown>): Promise<JsonApiDocument> {
    return FIXTURES;
  }

  async fetchOne(id: string): Promise<JsonApiDocument> {
    const items = FIXTURES.data as JsonApiResource[];
    const item = items.find((r) => r.id === id);
    if (!item) {
      throw new Error(`RFC with id ${id} not found`);
    }
    return { data: item, included: FIXTURES.included };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx ember test --filter "Unit | Source | InMemoryRfcSource"
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit gateway and InMemoryRfcSource**

```bash
git add app/gateways/ tests/app/sources/in-memory-rfc-source.ts tests/unit/sources/in-memory-rfc-source-test.ts
git commit -m "feat: add RfcGateway interface and InMemoryRfcSource"
```

---

### Task 4: RfcAdapter, Serializer, and Source Registration

**Files:**
- Create: `app/adapters/rfc-ember-adapter.ts`
- Create: `app/serializers/rfc.ts`
- Create: `app/sources/github-rfc-source.ts` (placeholder)
- Modify: `app/app.ts`

- [ ] **Step 1: Generate adapter and serializer stubs**

```bash
npx ember-cli generate adapter rfc-ember-adapter
npx ember-cli generate serializer rfc
```

Expected: creates stubs in `app/adapters/rfc-ember-adapter.ts` and `app/serializers/rfc.ts`.

- [ ] **Step 2: Implement RfcAdapter**

Replace `app/adapters/rfc-ember-adapter.ts`:

```typescript
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { getOwner } from '@ember/application';
import type RfcGateway from '../gateways/rfc-gateway';

export default class RfcAdapter extends JSONAPIAdapter {
  private get gateway(): RfcGateway {
    return getOwner(this)!.lookup('source:rfc') as RfcGateway;
  }

  override async query(
    _store: unknown,
    _type: unknown,
    params: Record<string, unknown>
  ): Promise<unknown> {
    return this.gateway.fetchAll(params);
  }

  override async findRecord(
    _store: unknown,
    _type: unknown,
    id: string
  ): Promise<unknown> {
    return this.gateway.fetchOne(id);
  }
}
```

- [ ] **Step 3: Implement RfcSerializer**

Replace `app/serializers/rfc.ts`:

```typescript
import JSONAPISerializer from '@ember-data/serializer/json-api';

export default class RfcSerializer extends JSONAPISerializer {}
```

The `JSONAPISerializer` handles camelization (`github-handle` → `githubHandle`) and JSON:API structure natively.

- [ ] **Step 4: Create GitHubRfcSource placeholder**

Create `app/sources/github-rfc-source.ts`:

```typescript
import type RfcGateway from '../gateways/rfc-gateway';
import type { JsonApiDocument } from '../gateways/rfc-gateway';

export default class GitHubRfcSource implements RfcGateway {
  async fetchAll(_params?: Record<string, unknown>): Promise<JsonApiDocument> {
    throw new Error('GitHubRfcSource: not yet implemented');
  }

  async fetchOne(_id: string): Promise<JsonApiDocument> {
    throw new Error('GitHubRfcSource: not yet implemented');
  }
}
```

- [ ] **Step 5: Register GitHubRfcSource in app.ts**

Open `app/app.ts` and add the initializer so the adapter finds its gateway in production:

```typescript
import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';
import GitHubRfcSource from './sources/github-rfc-source';

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

App.initializer({
  name: 'rfc-source',
  initialize(application) {
    application.register('source:rfc', GitHubRfcSource, { singleton: true });
  },
});

loadInitializers(App, config.modulePrefix);
```

- [ ] **Step 6: Run full test suite to verify nothing is broken**

```bash
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 7: Commit adapter, serializer, and registration**

```bash
git add app/adapters/ app/serializers/ app/sources/github-rfc-source.ts app/app.ts
git commit -m "feat: add RfcAdapter, RfcSerializer, and source:rfc registration"
```

---

### Task 5: StatusBadge Component

**Files:**
- Create: `app/components/status-badge/index.ts`
- Create: `app/components/status-badge/index.hbs`
- Create: `app/components/status-badge/index.css`
- Create: `tests/integration/components/status-badge-test.ts`

- [ ] **Step 1: Generate component stub**

```bash
npx ember-cli generate component status-badge
```

Expected: creates `app/components/status-badge/index.ts`, `index.hbs`, and `tests/integration/components/status-badge-test.ts`.

- [ ] **Step 2: Write failing integration test**

Replace `tests/integration/components/status-badge-test.ts`:

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | status-badge', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders "proposed" status', async function (assert) {
    await render(hbs`<StatusBadge @status="proposed" />`);
    assert.dom('[data-test-status-badge]').hasText('proposed');
    assert.dom('[data-test-status-badge]').hasClass('status--proposed');
  });

  test('it renders "accepted" status', async function (assert) {
    await render(hbs`<StatusBadge @status="accepted" />`);
    assert.dom('[data-test-status-badge]').hasText('accepted');
    assert.dom('[data-test-status-badge]').hasClass('status--accepted');
  });

  test('it renders "released" status', async function (assert) {
    await render(hbs`<StatusBadge @status="released" />`);
    assert.dom('[data-test-status-badge]').hasText('released');
    assert.dom('[data-test-status-badge]').hasClass('status--released');
  });

  test('it renders "closed" status', async function (assert) {
    await render(hbs`<StatusBadge @status="closed" />`);
    assert.dom('[data-test-status-badge]').hasText('closed');
    assert.dom('[data-test-status-badge]').hasClass('status--closed');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx ember test --filter "Integration | Component | status-badge"
```

Expected: FAIL — component renders nothing or lacks expected attributes/classes.

- [ ] **Step 4: Implement StatusBadge component class**

Replace `app/components/status-badge/index.ts`:

```typescript
import Component from '@glimmer/component';
import type { RfcStatus } from '../../models/rfc';

interface Signature {
  Args: {
    status: RfcStatus;
  };
}

export default class StatusBadgeComponent extends Component<Signature> {}
```

- [ ] **Step 5: Implement StatusBadge template**

Replace `app/components/status-badge/index.hbs`:

```handlebars
<span
  data-test-status-badge
  class="badge status--{{@status}}"
>
  {{@status}}
</span>
```

- [ ] **Step 6: Implement StatusBadge styles**

Create `app/components/status-badge/index.css`:

```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status--proposed {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.status--accepted {
  background-color: #dcfce7;
  color: #15803d;
}

.status--released {
  background-color: #f3e8ff;
  color: #7e22ce;
}

.status--closed {
  background-color: #f1f5f9;
  color: #64748b;
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx ember test --filter "Integration | Component | status-badge"
```

Expected: all 4 tests PASS.

- [ ] **Step 8: Commit StatusBadge**

```bash
git add app/components/status-badge/ tests/integration/components/status-badge-test.ts
git commit -m "feat: add StatusBadge component with scoped CSS"
```

---

### Task 6: RfcCard Component

**Files:**
- Create: `app/components/rfc-card/index.ts`
- Create: `app/components/rfc-card/index.hbs`
- Create: `app/components/rfc-card/index.css`
- Create: `tests/integration/components/rfc-card-test.ts`

- [ ] **Step 1: Generate component stub**

```bash
npx ember-cli generate component rfc-card
```

- [ ] **Step 2: Write failing integration test**

Replace `tests/integration/components/rfc-card-test.ts`:

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | rfc-card', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.rfc = {
      id: '724',
      title: 'Native TypeScript Types',
      number: 724,
      status: 'released',
      summary: 'Ship native TypeScript types with Ember packages.',
      author: { name: 'Krystan HuffMenne', githubHandle: 'gitKrystan' },
    };
  });

  test('it renders the RFC title and number', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    assert.dom('[data-test-rfc-card]').exists();
    assert.dom('[data-test-rfc-title]').hasText('Native TypeScript Types');
    assert.dom('[data-test-rfc-number]').hasText('#724');
  });

  test('it shows the status badge', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    assert.dom('[data-test-status-badge]').hasText('released');
  });

  test('summary is hidden by default', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    assert.dom('[data-test-rfc-summary]').doesNotExist();
  });

  test('clicking expand shows the summary', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    await click('[data-test-expand-button]');
    assert.dom('[data-test-rfc-summary]').exists();
    assert.dom('[data-test-rfc-summary]').containsText('Ship native TypeScript types');
  });

  test('clicking expand again hides the summary', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    await click('[data-test-expand-button]');
    await click('[data-test-expand-button]');
    assert.dom('[data-test-rfc-summary]').doesNotExist();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx ember test --filter "Integration | Component | rfc-card"
```

Expected: FAIL — component renders nothing.

- [ ] **Step 4: Implement RfcCard component class**

Replace `app/components/rfc-card/index.ts`:

```typescript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import type Rfc from 'rfc-tracker/models/rfc';

interface Signature {
  Args: {
    rfc: Rfc;
  };
}

export default class RfcCardComponent extends Component<Signature> {
  @tracked isExpanded = false;

  @action toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }
}
```

- [ ] **Step 5: Implement RfcCard template**

Replace `app/components/rfc-card/index.hbs`:

```handlebars
<article data-test-rfc-card class="card">
  <header class="card-header">
    <div class="card-meta">
      <span data-test-rfc-number class="rfc-number">#{{@rfc.number}}</span>
      <StatusBadge @status={{@rfc.status}} />
    </div>
    <h2 data-test-rfc-title class="rfc-title">{{@rfc.title}}</h2>
    <button
      data-test-expand-button
      type="button"
      class="expand-button"
      {{on "click" this.toggleExpanded}}
    >
      {{if this.isExpanded "Collapse" "Expand"}}
    </button>
  </header>

  {{#if this.isExpanded}}
    <div data-test-rfc-summary class="card-summary">
      <p>{{@rfc.summary}}</p>
      {{#if @rfc.author}}
        <p class="author">by {{@rfc.author.name}}</p>
      {{/if}}
    </div>
  {{/if}}
</article>
```

- [ ] **Step 6: Implement RfcCard styles**

Create `app/components/rfc-card/index.css`:

```css
.card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  background: #fff;
  transition: box-shadow 0.15s ease;
}

.card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rfc-number {
  font-size: 0.875rem;
  color: #64748b;
  font-family: monospace;
}

.rfc-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
}

.expand-button {
  align-self: flex-start;
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: #475569;
}

.expand-button:hover {
  background: #f8fafc;
}

.card-summary {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
  color: #475569;
  font-size: 0.875rem;
  line-height: 1.6;
}

.author {
  margin-top: 0.5rem;
  color: #94a3b8;
  font-style: italic;
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx ember test --filter "Integration | Component | rfc-card"
```

Expected: all 5 tests PASS.

- [ ] **Step 8: Commit RfcCard**

```bash
git add app/components/rfc-card/ tests/integration/components/rfc-card-test.ts
git commit -m "feat: add RfcCard component with expand toggle"
```

---

### Task 7: RfcFilter Component

**Files:**
- Create: `app/components/rfc-filter/index.ts`
- Create: `app/components/rfc-filter/index.hbs`
- Create: `app/components/rfc-filter/index.css`
- Create: `tests/integration/components/rfc-filter-test.ts`

- [ ] **Step 1: Generate component stub**

```bash
npx ember-cli generate component rfc-filter
```

- [ ] **Step 2: Write failing integration test**

Replace `tests/integration/components/rfc-filter-test.ts`:

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | rfc-filter', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.activeStatus = null;
    this.onFilterChange = (status: string | null) => {
      this.activeStatus = status;
    };
  });

  test('it renders all status filter buttons', async function (assert) {
    await render(
      hbs`<RfcFilter @activeStatus={{this.activeStatus}} @onFilterChange={{this.onFilterChange}} />`
    );
    assert.dom('[data-test-filter-button="all"]').exists();
    assert.dom('[data-test-filter-button="proposed"]').exists();
    assert.dom('[data-test-filter-button="accepted"]').exists();
    assert.dom('[data-test-filter-button="released"]').exists();
    assert.dom('[data-test-filter-button="closed"]').exists();
  });

  test('"All" button is active when no filter is set', async function (assert) {
    await render(
      hbs`<RfcFilter @activeStatus={{null}} @onFilterChange={{this.onFilterChange}} />`
    );
    assert.dom('[data-test-filter-button="all"]').hasClass('filter-button--active');
  });

  test('clicking a status button calls onFilterChange with that status', async function (assert) {
    assert.expect(1);
    this.onFilterChange = (status: string | null) => {
      assert.strictEqual(status, 'proposed');
    };
    await render(
      hbs`<RfcFilter @activeStatus={{null}} @onFilterChange={{this.onFilterChange}} />`
    );
    await click('[data-test-filter-button="proposed"]');
  });

  test('clicking the active status button clears the filter', async function (assert) {
    assert.expect(1);
    this.onFilterChange = (status: string | null) => {
      assert.strictEqual(status, null);
    };
    await render(
      hbs`<RfcFilter @activeStatus="proposed" @onFilterChange={{this.onFilterChange}} />`
    );
    await click('[data-test-filter-button="proposed"]');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx ember test --filter "Integration | Component | rfc-filter"
```

Expected: FAIL — component renders nothing.

- [ ] **Step 4: Implement RfcFilter component class**

Replace `app/components/rfc-filter/index.ts`:

```typescript
import Component from '@glimmer/component';
import { action } from '@ember/object';
import type { RfcStatus } from '../../models/rfc';

type FilterStatus = RfcStatus | null;

interface Signature {
  Args: {
    activeStatus: FilterStatus;
    onFilterChange: (status: FilterStatus) => void;
  };
}

export const ALL_STATUSES: RfcStatus[] = ['proposed', 'accepted', 'released', 'closed'];

export default class RfcFilterComponent extends Component<Signature> {
  get statuses(): RfcStatus[] {
    return ALL_STATUSES;
  }

  @action selectStatus(status: FilterStatus): void {
    // Clicking the already-active filter clears it
    const next = this.args.activeStatus === status ? null : status;
    this.args.onFilterChange(next);
  }
}
```

- [ ] **Step 5: Implement RfcFilter template**

Replace `app/components/rfc-filter/index.hbs`:

```handlebars
<div class="filter-bar" role="group" aria-label="Filter by status">
  <button
    data-test-filter-button="all"
    type="button"
    class="filter-button {{if (eq @activeStatus null) 'filter-button--active'}}"
    {{on "click" (fn this.selectStatus null)}}
  >
    All
  </button>

  {{#each this.statuses as |status|}}
    <button
      data-test-filter-button={{status}}
      type="button"
      class="filter-button {{if (eq @activeStatus status) 'filter-button--active'}}"
      {{on "click" (fn this.selectStatus status)}}
    >
      {{status}}
    </button>
  {{/each}}
</div>
```

Note: the `eq` helper is provided by `ember-truth-helpers` (installed in Task 1).

- [ ] **Step 6: Implement RfcFilter styles**

Create `app/components/rfc-filter/index.css`:

```css
.filter-bar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.filter-button {
  padding: 6px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: #64748b;
  text-transform: capitalize;
  transition: background 0.1s ease, color 0.1s ease;
}

.filter-button:hover {
  background: #f8fafc;
  color: #334155;
}

.filter-button--active {
  background: #1e293b;
  color: #fff;
  border-color: #1e293b;
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx ember test --filter "Integration | Component | rfc-filter"
```

Expected: all 4 tests PASS.

- [ ] **Step 8: Commit RfcFilter**

```bash
git add app/components/rfc-filter/ tests/integration/components/rfc-filter-test.ts
git commit -m "feat: add RfcFilter component with status toggle"
```

---

### Task 8: /rfcs List Route

**Files:**
- Create: `app/routes/rfcs.ts`
- Create: `app/controllers/rfcs.ts`
- Create: `app/templates/rfcs.hbs`
- Modify: `tests/acceptance/rfcs-test.ts`

- [ ] **Step 1: Generate route and controller stubs**

```bash
npx ember-cli generate route rfcs
npx ember-cli generate controller rfcs
```

- [ ] **Step 2: Write failing acceptance test**

Replace `tests/acceptance/rfcs-test.ts`:

```typescript
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit, currentURL, click } from '@ember/test-helpers';
import InMemoryRfcSource from 'rfc-tracker/tests/app/sources/in-memory-rfc-source';

module('Acceptance | rfcs', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('source:rfc', InMemoryRfcSource);
  });

  test('visiting /rfcs shows the list page', async function (assert) {
    await visit('/rfcs');
    assert.strictEqual(currentURL(), '/rfcs');
  });

  test('it lists 3 RFC cards', async function (assert) {
    await visit('/rfcs');
    assert.dom('[data-test-rfc-card]').exists({ count: 3 });
  });

  test('filter buttons are rendered', async function (assert) {
    await visit('/rfcs');
    assert.dom('[data-test-filter-button="all"]').exists();
    assert.dom('[data-test-filter-button="proposed"]').exists();
  });

  test('filtering by "released" shows only the released RFC', async function (assert) {
    await visit('/rfcs');
    await click('[data-test-filter-button="released"]');
    // Only RFC #724 has status "released" in fixtures
    assert.dom('[data-test-rfc-card]').exists({ count: 1 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx ember test --filter "Acceptance | rfcs"
```

Expected: FAIL — route not implemented.

- [ ] **Step 4: Implement rfcs route**

Replace `app/routes/rfcs.ts`:

```typescript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import { query } from '@ember-data/json-api/request';

export default class RfcsRoute extends Route {
  @service declare store: Store;

  async model() {
    const { content } = await this.store.request(query('rfc', {}));
    return content.data;
  }
}
```

- [ ] **Step 5: Implement RfcsController**

Replace `app/controllers/rfcs.ts`:

```typescript
import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import type Rfc from 'rfc-tracker/models/rfc';
import type { RfcStatus } from 'rfc-tracker/models/rfc';

export default class RfcsController extends Controller {
  declare model: Rfc[];

  @tracked activeStatus: RfcStatus | null = null;

  get filteredRfcs(): Rfc[] {
    if (!this.activeStatus) return this.model;
    return this.model.filter((rfc) => rfc.status === this.activeStatus);
  }

  @action setActiveStatus(status: RfcStatus | null): void {
    this.activeStatus = status;
  }
}
```

- [ ] **Step 6: Implement rfcs template**

Replace `app/templates/rfcs.hbs`:

```handlebars
<div class="rfcs-page">
  <h1 class="page-title">Ember RFCs</h1>

  <RfcFilter
    @activeStatus={{this.activeStatus}}
    @onFilterChange={{this.setActiveStatus}}
  />

  <div class="rfc-list">
    {{#each this.filteredRfcs as |rfc|}}
      <RfcCard @rfc={{rfc}} />
    {{else}}
      <p class="no-results">No RFCs match the current filter.</p>
    {{/each}}
  </div>
</div>
```

- [ ] **Step 7: Run acceptance tests to verify they pass**

```bash
npx ember test --filter "Acceptance | rfcs"
```

Expected: all 4 tests PASS.

- [ ] **Step 8: Commit rfcs route**

```bash
git add app/routes/rfcs.ts app/controllers/rfcs.ts app/templates/rfcs.hbs tests/acceptance/rfcs-test.ts
git commit -m "feat: add /rfcs list route with status filter"
```

---

### Task 9: /rfcs/:id Detail Route

**Files:**
- Create: `app/routes/rfc.ts`
- Create: `app/templates/rfc.hbs`
- Create: `tests/acceptance/rfc-test.ts`

- [ ] **Step 1: Generate route stub**

```bash
npx ember-cli generate route rfc
```

- [ ] **Step 2: Write failing acceptance test**

Create `tests/acceptance/rfc-test.ts`:

```typescript
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit, currentURL } from '@ember/test-helpers';
import InMemoryRfcSource from 'rfc-tracker/tests/app/sources/in-memory-rfc-source';

module('Acceptance | rfc detail', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('source:rfc', InMemoryRfcSource);
  });

  test('visiting /rfcs/724 shows the detail page', async function (assert) {
    await visit('/rfcs/724');
    assert.strictEqual(currentURL(), '/rfcs/724');
    assert.dom('[data-test-rfc-detail-title]').hasText('Native TypeScript Types');
  });

  test('it shows the RFC number', async function (assert) {
    await visit('/rfcs/724');
    assert.dom('[data-test-rfc-detail-number]').hasText('#724');
  });

  test('it shows the full summary', async function (assert) {
    await visit('/rfcs/724');
    assert.dom('[data-test-rfc-detail-summary]').containsText(
      'Ship native TypeScript types with Ember packages.'
    );
  });

  test('it shows the author name', async function (assert) {
    await visit('/rfcs/724');
    assert.dom('[data-test-rfc-detail-author]').hasText('Krystan HuffMenne');
  });

  test('it shows the status badge', async function (assert) {
    await visit('/rfcs/724');
    assert.dom('[data-test-status-badge]').hasText('released');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx ember test --filter "Acceptance | rfc detail"
```

Expected: FAIL — route not implemented.

- [ ] **Step 4: Implement rfc detail route**

Replace `app/routes/rfc.ts`:

```typescript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import { findRecord } from '@ember-data/json-api/request';

export default class RfcRoute extends Route {
  @service declare store: Store;

  async model(params: { rfc_id: string }) {
    const { content } = await this.store.request(findRecord('rfc', params.rfc_id));
    return content.data;
  }
}
```

- [ ] **Step 5: Implement rfc detail template**

Create `app/templates/rfc.hbs`:

```handlebars
<div class="rfc-detail">
  <div class="rfc-detail-header">
    <span data-test-rfc-detail-number class="rfc-number">#{{model.number}}</span>
    <StatusBadge @status={{model.status}} />
  </div>

  <h1 data-test-rfc-detail-title class="rfc-detail-title">{{model.title}}</h1>

  {{#if model.author}}
    <p data-test-rfc-detail-author class="rfc-detail-author">
      by {{model.author.name}}
    </p>
  {{/if}}

  <div data-test-rfc-detail-summary class="rfc-detail-summary">
    <p>{{model.summary}}</p>
  </div>

  <LinkTo @route="rfcs" class="back-link">← Back to all RFCs</LinkTo>
</div>
```

- [ ] **Step 6: Run acceptance tests to verify they pass**

```bash
npx ember test --filter "Acceptance | rfc detail"
```

Expected: all 5 tests PASS.

- [ ] **Step 7: Commit rfc detail route**

```bash
git add app/routes/rfc.ts app/templates/rfc.hbs tests/acceptance/rfc-test.ts
git commit -m "feat: add /rfcs/:id detail route"
```

---

### Task 10: GitHubRfcSource

**Files:**
- Modify: `app/sources/github-rfc-source.ts`
- Create: `tests/unit/sources/github-rfc-source-test.ts`

The GitHub Issues API endpoint for Ember RFCs:
`https://api.github.com/repos/emberjs/rfcs/issues?state=all&per_page=100&labels=RFC`

Label → status mapping:
- label name includes "Released" → `released`
- label name includes "Accepted" → `accepted`
- `state === 'closed'` with no Released label → `closed`
- anything else → `proposed`

- [ ] **Step 1: Write failing unit test for GitHubRfcSource**

Create `tests/unit/sources/github-rfc-source-test.ts`:

```typescript
import { module, test } from 'qunit';
import GitHubRfcSource from 'rfc-tracker/sources/github-rfc-source';
import type { JsonApiResource } from 'rfc-tracker/gateways/rfc-gateway';

const MOCK_ISSUES = [
  {
    number: 724,
    title: 'Native TypeScript Types',
    body: 'Ship native TypeScript types with Ember packages.',
    state: 'closed',
    user: { login: 'gitKrystan' },
    labels: [{ name: 'Released' }],
  },
  {
    number: 883,
    title: 'Ember Polaris',
    body: 'The next major edition of Ember.',
    state: 'open',
    user: { login: 'wycats' },
    labels: [{ name: 'Accepted' }],
  },
  {
    number: 900,
    title: 'Resource API',
    body: 'A unified Resource API.',
    state: 'open',
    user: { login: 'NullVoxPopuli' },
    labels: [],
  },
];

module('Unit | Source | GitHubRfcSource', function (hooks) {
  hooks.beforeEach(function () {
    this.originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => MOCK_ISSUES,
      } as Response);
  });

  hooks.afterEach(function () {
    globalThis.fetch = this.originalFetch;
  });

  test('fetchAll returns a JSON:API document with data array', async function (assert) {
    const source = new GitHubRfcSource();
    const doc = await source.fetchAll();
    assert.ok(Array.isArray(doc.data), 'data is an array');
    assert.strictEqual((doc.data as unknown[]).length, 3);
  });

  test('fetchAll maps GitHub labels to RFC status correctly', async function (assert) {
    const source = new GitHubRfcSource();
    const doc = await source.fetchAll();
    const items = doc.data as JsonApiResource[];
    assert.strictEqual(items.find((i) => i.id === '724')?.attributes['status'], 'released');
    assert.strictEqual(items.find((i) => i.id === '883')?.attributes['status'], 'accepted');
    assert.strictEqual(items.find((i) => i.id === '900')?.attributes['status'], 'proposed');
  });

  test('fetchAll deduplicates and includes author resources', async function (assert) {
    const source = new GitHubRfcSource();
    const doc = await source.fetchAll();
    assert.ok(doc.included && doc.included.length === 3, 'one author per unique login');
    const author = doc.included?.find((r) => r.id === 'gitKrystan');
    assert.ok(author, 'gitKrystan is in included');
    assert.strictEqual(author?.type, 'author');
  });

  test('fetchAll throws on non-ok GitHub response', async function (assert) {
    globalThis.fetch = async () => ({ ok: false, status: 403 } as Response);
    const source = new GitHubRfcSource();
    await assert.rejects(source.fetchAll(), /403/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ember test --filter "Unit | Source | GitHubRfcSource"
```

Expected: FAIL — stub throws "not yet implemented".

- [ ] **Step 3: Implement GitHubRfcSource**

Replace `app/sources/github-rfc-source.ts`:

```typescript
import type RfcGateway from '../gateways/rfc-gateway';
import type { JsonApiDocument, JsonApiResource } from '../gateways/rfc-gateway';
import type { RfcStatus } from '../models/rfc';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: { login: string };
  labels: Array<{ name: string }>;
}

const GITHUB_API_URL =
  'https://api.github.com/repos/emberjs/rfcs/issues?state=all&per_page=100&labels=RFC';

function mapStatus(issue: GitHubIssue): RfcStatus {
  const labelNames = issue.labels.map((l) => l.name.toLowerCase());
  if (labelNames.some((l) => l.includes('released'))) return 'released';
  if (labelNames.some((l) => l.includes('accepted'))) return 'accepted';
  if (issue.state === 'closed') return 'closed';
  return 'proposed';
}

export default class GitHubRfcSource implements RfcGateway {
  async fetchAll(_params?: Record<string, unknown>): Promise<JsonApiDocument> {
    const response = await fetch(GITHUB_API_URL);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const issues: GitHubIssue[] = await response.json();
    return this.#toDocument(issues);
  }

  async fetchOne(id: string): Promise<JsonApiDocument> {
    const response = await fetch(
      `https://api.github.com/repos/emberjs/rfcs/issues/${id}`
    );
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const issue: GitHubIssue = await response.json();
    return {
      data: this.#issueToResource(issue),
      included: [this.#authorResource(issue.user.login)],
    };
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
        author: { data: { id: issue.user.login, type: 'author' } },
      },
    };
  }

  #authorResource(login: string): JsonApiResource {
    return {
      id: login,
      type: 'author',
      attributes: { name: login, 'github-handle': login },
    };
  }

  #toDocument(issues: GitHubIssue[]): JsonApiDocument {
    const data = issues.map((i) => this.#issueToResource(i));
    const seen = new Set<string>();
    const included: JsonApiResource[] = [];
    for (const issue of issues) {
      if (!seen.has(issue.user.login)) {
        seen.add(issue.user.login);
        included.push(this.#authorResource(issue.user.login));
      }
    }
    return { data, included };
  }
}
```

- [ ] **Step 4: Run GitHubRfcSource tests to verify they pass**

```bash
npx ember test --filter "Unit | Source | GitHubRfcSource"
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. Any acceptance tests that use `InMemoryRfcSource` should be unaffected by the GitHub source stub.

- [ ] **Step 6: Commit GitHubRfcSource**

```bash
git add app/sources/github-rfc-source.ts tests/unit/sources/github-rfc-source-test.ts
git commit -m "feat: implement GitHubRfcSource with GitHub Issues API"
```

---

## Self-Review

**Spec coverage:**
- Models (rfc, author) → Task 2
- Routes /rfcs and /rfcs/:id → Tasks 8, 9
- Components (rfc-card, status-badge, rfc-filter) → Tasks 5, 6, 7
- RfcGateway interface → Task 3
- InMemoryRfcSource → Task 3
- GitHubRfcSource → Task 10
- RfcEmberAdapter (as RfcAdapter) → Task 4
- ember-scoped-css → each component has its own `.css` file
- Glimmer-only components → all extend `@glimmer/component`
- `store.request(query(...))` → Tasks 8, 9 routes
- TypeScript `declare` pattern → Task 2 models
- QUnit unit + integration + acceptance tests → all covered
- `InMemoryRfcSource` injected in `beforeEach` → both acceptance tests

**Constraints check:**
- No `Component.extend` anywhere — confirmed
- No `store.findAll('rfc')` — using `store.request(query(...))` throughout
- No skipping scoped CSS — all 3 components have `.css` files
- No over-engineering — nothing beyond what the spec asked for

**Type consistency:**
- `RfcStatus` defined once in `app/models/rfc.ts`, imported by filter and badge
- `JsonApiResource` / `JsonApiDocument` defined once in `app/gateways/rfc-gateway.ts`, used by all sources and adapter
- `RfcGateway` interface used consistently by `InMemoryRfcSource`, `GitHubRfcSource`, and `RfcAdapter`
