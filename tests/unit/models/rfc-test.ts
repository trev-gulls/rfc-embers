import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Model | rfc', function (hooks) {
  setupTest(hooks);

  test('it has the expected attributes', function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = this.owner.lookup('service:store') as any;
    const record = store.createRecord('rfc', {
      title: 'Native TypeScript Types',
      number: 724,
      status: 'released',
      summary: 'Ship native TypeScript types with Ember packages.',
    });
    assert.strictEqual(record.title, 'Native TypeScript Types');
    assert.strictEqual(record.number, 724);
    assert.strictEqual(record.status, 'released');
    assert.strictEqual(
      record.summary,
      'Ship native TypeScript types with Ember packages.',
    );
  });
});
