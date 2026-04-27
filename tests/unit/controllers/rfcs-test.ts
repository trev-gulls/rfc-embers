import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';
import type RfcsController from 'rfc-embers/controllers/rfcs';
import type Rfc from 'rfc-embers/models/rfc';
import type { RfcStatus } from 'rfc-embers/models/rfc';

function makeRfc(status: RfcStatus): Partial<Rfc> {
  return { status };
}

module('Unit | Controller | rfcs', function (hooks) {
  setupTest(hooks);

  test('filteredRfcs returns all RFCs when activeStatus is null', function (assert) {
    const controller = this.owner.lookup('controller:rfcs') as RfcsController;
    controller.model = [
      makeRfc('proposed'),
      makeRfc('accepted'),
      makeRfc('released'),
    ] as Rfc[];
    controller.activeStatus = null;
    assert.strictEqual(controller.filteredRfcs.length, 3);
  });

  test('filteredRfcs returns only RFCs matching the active status', function (assert) {
    const controller = this.owner.lookup('controller:rfcs') as RfcsController;
    controller.model = [
      makeRfc('proposed'),
      makeRfc('accepted'),
      makeRfc('proposed'),
    ] as Rfc[];
    controller.activeStatus = 'proposed';
    assert.strictEqual(controller.filteredRfcs.length, 2);
  });

  test('filteredRfcs returns empty array when no RFCs match status', function (assert) {
    const controller = this.owner.lookup('controller:rfcs') as RfcsController;
    controller.model = [makeRfc('proposed'), makeRfc('accepted')] as Rfc[];
    controller.activeStatus = 'released';
    assert.strictEqual(controller.filteredRfcs.length, 0);
  });

  test('filteredRfcs updates when activeStatus changes', function (assert) {
    const controller = this.owner.lookup('controller:rfcs') as RfcsController;
    controller.model = [makeRfc('proposed'), makeRfc('released')] as Rfc[];
    controller.activeStatus = null;
    assert.strictEqual(controller.filteredRfcs.length, 2, 'all when null');
    controller.activeStatus = 'released';
    assert.strictEqual(controller.filteredRfcs.length, 1, 'filtered after change');
  });
});
