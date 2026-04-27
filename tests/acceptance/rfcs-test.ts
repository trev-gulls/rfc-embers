import { module, test } from 'qunit';
import { setupApplicationTest } from 'rfc-embers/tests/helpers';
import { visit, currentURL, click, waitFor } from '@ember/test-helpers';
import type { JsonApiCollectionDocument } from 'rfc-embers/gateways/rfc-gateway';
import InMemoryRfcSource from 'rfc-embers/tests/app/sources/in-memory-rfc-source';

module('Acceptance | rfcs', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('source:rfc', new InMemoryRfcSource(), {
      instantiate: false,
    });
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

  test('shows loading substate while RFCs are fetching', async function (assert) {
    let resolveAll!: (doc: JsonApiCollectionDocument) => void;

    (this.owner as unknown as { unregister(key: string): void }).unregister(
      'source:rfc',
    );
    this.owner.register(
      'source:rfc',
      {
        fetchAll: () =>
          new Promise<JsonApiCollectionDocument>((r) => {
            resolveAll = r;
          }),
        fetchOne: async () => {
          throw new Error('not needed');
        },
      },
      { instantiate: false },
    );

    // Start the transition without awaiting — model hook is now pending
    const visitPromise = visit('/rfcs');

    // Wait for Ember to render the loading substate
    await waitFor('[data-test-rfcs-loading]');
    assert
      .dom('[data-test-rfcs-loading]')
      .exists('loading substate is shown while fetch is pending');

    // Unblock the model hook and let the route settle
    resolveAll({ data: [], included: [] });
    await visitPromise;

    assert
      .dom('[data-test-rfcs-loading]')
      .doesNotExist('loading substate is gone after data loads');
  });

  test('shows error substate when the source throws', async function (assert) {
    (this.owner as unknown as { unregister(key: string): void }).unregister(
      'source:rfc',
    );
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
    assert
      .dom('[data-test-rfcs-error]')
      .exists('rfcs error substate is rendered');
    assert
      .dom('[data-test-rfcs-error]')
      .containsText('network failure', 'error message is surfaced');
  });
});
