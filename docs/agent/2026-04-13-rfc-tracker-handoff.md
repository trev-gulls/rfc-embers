# RFC Tracker — Handoff

## Origin

Built as an interview artifact for the Optro (AuditBoard) Senior SWE II – Frontend (Web Frameworks) role.

Research that informed this: `~/Code/llm/research/topics/**/optro/report.md`
Generated via the `agentic-workflows:research-topic` skill in the `llm/research` project.

## Current State

Not started. Scaffold not run. Directory is empty.

## What to Do Next

1. Scaffold the app:
   ```bash
   cd .. && npx ember-cli new rfc-tracker --typescript
   cd rfc-tracker
   npm install ember-scoped-css @ember-data/json-api
   ```
2. Replace the generated `app/` structure with the components, models, routes, and gateway described below
3. Implement `RfcGateway` interface and `GitHubRfcSource`
4. Wire `RfcEmberAdapter` to call `RfcGateway`, inject `GitHubRfcSource` as the implementation
5. Add `InMemoryRfcSource` for use in tests

---

## Decision Log

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | Ember.js v5 + TypeScript | Opinionated conventions reduce decision fatigue; first-class TypeScript support |
| Package manager | npm | Ember CLI depends on Node internally; keeping the toolchain consistent avoids a dual-runtime setup |
| Data layer | EmberData + JSON:API, `store.request()` builder | Modern Ember pattern; decouples routes from the legacy adapter API surface |
| Component styles | `ember-scoped-css` | CSS encapsulated per-component at the framework level; prevents class name collisions without build configuration |
| Component style | Glimmer only | Glimmer components are the current Ember standard; typed signatures and `@tracked` reactivity |
| Data source | Live GitHub API via hexagonal gateway | Public API maps naturally to the RFC domain; port/adapter pattern decouples transport from EmberData |
| Architecture | Hexagonal — `RfcGateway` port with swappable sources | Decouples EmberData from GitHub; `InMemoryRfcSource` makes tests fast and deterministic |

---

## What to Build

An RFC tracker displaying Ember RFCs (or mock data shaped like them).

### Models

```
rfc:    id, title, number, status (proposed|accepted|released|closed), summary, author
author: id, name, githubHandle
```

### Routes

```
/rfcs        — list of all RFCs, filterable by status
/rfcs/:id    — detail view for a single RFC
```

### Components

```
rfc-card/     — summary card with expand toggle (@tracked isExpanded)
status-badge/ — colored badge per status value
rfc-filter/   — status filter bar (@tracked activeStatus)
```

Each component gets its own folder with `index.ts`, `index.hbs`, and `index.css`.

### Gateway Architecture

```
RfcEmberAdapter       — extends Ember's Adapter, EmberData boundary
    ↓ calls
RfcGateway            — TypeScript interface, your domain's port
    ↓ implemented by
GitHubRfcSource       — fetches from GitHub API, translates to JSON:API
InMemoryRfcSource     — test double, returns fixture data
```

```
app/
├── gateways/
│   └── rfc-gateway.ts          # interface RfcGateway
├── sources/
│   ├── github-rfc-source.ts    # GitHubRfcSource implements RfcGateway
│   └── in-memory-rfc-source.ts # InMemoryRfcSource implements RfcGateway
└── adapters/
    └── rfc-ember-adapter.ts    # RfcEmberAdapter extends Adapter, calls RfcGateway
```

`RfcGateway` is a plain TypeScript interface — no Ember dependencies. `RfcEmberAdapter` owns the Ember boundary and delegates data fetching entirely to whichever `RfcGateway` implementation is injected.

---

## Key Patterns

### EmberData model with TypeScript `declare`

```typescript
// app/models/rfc.ts
import Model, { attr, belongsTo } from '@ember-data/model';
import type Author from './author';

export default class Rfc extends Model {
  @attr('string') declare title: string;
  @attr('string') declare status: 'proposed' | 'accepted' | 'released' | 'closed';
  @attr('number') declare number: number;
  @attr('string') declare summary: string;

  @belongsTo('author', { async: false, inverse: null })
  declare author: Author;
}
```

### Route using new request builder

```typescript
// app/routes/rfcs.ts
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

### Glimmer component with `@tracked`

```typescript
// app/components/rfc-card/index.ts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import type Rfc from 'rfc-tracker/models/rfc';

interface Signature {
  Args: { rfc: Rfc };
}

export default class RfcCardComponent extends Component<Signature> {
  @tracked isExpanded = false;

  @action toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }
}
```

### ember-scoped-css

```css
/* app/components/rfc-card/index.css */
.card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
.title { font-weight: 600; }
```

---

## JSON:API Shape

`GitHubRfcSource` fetches from the GitHub API and translates to this JSON:API envelope before returning to `RfcEmberAdapter`:

```json
{
  "data": [
    {
      "id": "724",
      "type": "rfc",
      "attributes": {
        "title": "Native TypeScript Types",
        "number": 724,
        "status": "released",
        "summary": "Ship native TypeScript types with Ember packages."
      },
      "relationships": {
        "author": { "data": { "id": "gitKrystan", "type": "author" } }
      }
    }
  ],
  "included": [
    {
      "id": "gitKrystan",
      "type": "author",
      "attributes": { "name": "Krystan HuffMenne", "github-handle": "gitKrystan" }
    }
  ]
}
```

`InMemoryRfcSource` returns the same shape with hardcoded fixture data — no network call.

---

## Testing

Ember CLI scaffolds QUnit by default — nothing extra to install. Three test types:

- **Unit** — models, services, utilities in isolation
- **Integration (rendering)** — component tests, renders in a real DOM context
- **Acceptance** — full route/app tests via `visit()`

### Injecting InMemoryRfcSource

`InMemoryRfcSource` is the test double for `RfcGateway`. Register it in the test's `beforeEach` so `RfcEmberAdapter` never hits the network:

```typescript
// tests/acceptance/rfcs-test.ts
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit } from '@ember/test-helpers';
import InMemoryRfcSource from 'rfc-tracker/sources/in-memory-rfc-source';

module('Acceptance | rfcs', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('source:rfc', InMemoryRfcSource);
  });

  test('it lists RFCs', async function (assert) {
    await visit('/rfcs');
    assert.dom('[data-test-rfc-card]').exists({ count: 3 });
  });
});
```

### Integration test for a component

```typescript
// tests/integration/components/rfc-card-test.ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | rfc-card', function (hooks) {
  setupRenderingTest(hooks);

  test('it expands on click', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    assert.dom('.summary').doesNotExist();
    await click('button');
    assert.dom('.summary').exists();
  });
});
```

### Run tests

```bash
npm test
# watch mode during dev:
npx ember test --server
```

---

## Constraints

- No `Component.extend` anywhere
- No `store.findAll('rfc')` — use `store.request(query(...))`
- No skipping scoped CSS
- No over-engineering — one feature working well beats five half-done
