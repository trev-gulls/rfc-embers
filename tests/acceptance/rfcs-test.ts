import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit, currentURL, click } from '@ember/test-helpers';
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
});
