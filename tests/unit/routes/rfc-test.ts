import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

module('Unit | Route | rfc', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const route = this.owner.lookup('route:rfc');
    assert.ok(route);
  });
});
