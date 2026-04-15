import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit, currentURL } from '@ember/test-helpers';
import InMemoryRfcSource from 'rfc-embers/tests/app/sources/in-memory-rfc-source';

module('Acceptance | rfc detail', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('source:rfc', new InMemoryRfcSource(), {
      instantiate: false,
    });
  });

  test('visiting /rfcs/724 shows the detail page', async function (assert) {
    await visit('/rfcs/724');
    assert.strictEqual(currentURL(), '/rfcs/724');
    assert
      .dom('[data-test-rfc-detail-title]')
      .hasText('Native TypeScript Types');
  });

  test('it shows the RFC number', async function (assert) {
    await visit('/rfcs/724');
    assert.dom('[data-test-rfc-detail-number]').hasText('#724');
  });

  test('it shows the full summary', async function (assert) {
    await visit('/rfcs/724');
    assert
      .dom('[data-test-rfc-detail-summary]')
      .containsText('Ship native TypeScript types with Ember packages.');
  });

  test('it shows the author name', async function (assert) {
    await visit('/rfcs/724');
    assert.dom('[data-test-rfc-detail-author]').hasText('by Krystan HuffMenne');
  });

  test('it shows the status badge', async function (assert) {
    await visit('/rfcs/724');
    assert.dom('[data-test-status-badge]').hasText('released');
  });
});
