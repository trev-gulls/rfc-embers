import { module, test } from 'qunit';
import InMemoryRfcSource from 'rfc-embers/tests/app/sources/in-memory-rfc-source';

module('Unit | Source | InMemoryRfcSource', function () {
  test('fetchAll returns an array of 3 RFC resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    assert.strictEqual(doc.data.length, 3, 'returns 3 fixtures');
  });

  test('fetchAll data items are valid JSON:API resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    for (const item of doc.data) {
      assert.ok(item.id, `item ${item.id} has id`);
      assert.strictEqual(item.type, 'rfc', `item ${item.id} has type 'rfc'`);
      assert.ok(item.attributes['title'], `item ${item.id} has title`);
      assert.ok(item.attributes['status'], `item ${item.id} has status`);
    }
  });

  test('fetchOne returns a single RFC by id', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchOne('724');
    assert.strictEqual(doc.data.id, '724');
    assert.strictEqual(doc.data.type, 'rfc');
  });

  test('fetchOne throws for unknown id', async function (assert) {
    const source = new InMemoryRfcSource();
    await assert.rejects(source.fetchOne('9999'), /9999/);
  });

  test('fetchAll includes author resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    assert.ok(doc.included, 'has included');
    assert.ok((doc.included ?? []).length > 0, 'included is non-empty');
    assert.strictEqual(doc.included?.[0]?.type, 'author');
  });
});
