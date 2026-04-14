import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

module('Unit | Route | rfcs', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const route = this.owner.lookup('route:rfcs');
    assert.ok(route);
  });
});
