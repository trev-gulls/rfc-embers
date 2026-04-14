import { setupTest } from 'rfc-embers/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Adapter | rfc', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const adapter = this.owner.lookup('adapter:rfc');
    assert.ok(adapter, 'adapter exists');
  });
});
