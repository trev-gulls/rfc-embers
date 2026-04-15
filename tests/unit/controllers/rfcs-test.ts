import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

module('Unit | Controller | rfcs', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    const controller = this.owner.lookup('controller:rfcs');
    assert.ok(controller);
  });
});
