import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Model | author', function (hooks) {
  setupTest(hooks);

  test('it has the expected attributes', function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = this.owner.lookup('service:store') as any;
    const record = store.createRecord('author', {
      name: 'Krystan HuffMenne',
      githubHandle: 'gitKrystan',
    });
    assert.strictEqual(record.name, 'Krystan HuffMenne');
    assert.strictEqual(record.githubHandle, 'gitKrystan');
  });
});
