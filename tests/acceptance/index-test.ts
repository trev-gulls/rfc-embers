import { module, test } from 'qunit';
import { setupApplicationTest } from 'rfc-embers/tests/helpers';
import { visit, currentURL } from '@ember/test-helpers';
import InMemoryRfcSource from 'rfc-embers/tests/app/sources/in-memory-rfc-source';

module('Acceptance | index', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('source:rfc', new InMemoryRfcSource(), {
      instantiate: false,
    });
  });

  test('visiting / redirects to /rfcs', async function (assert) {
    await visit('/');
    assert.strictEqual(currentURL(), '/rfcs');
  });
});
