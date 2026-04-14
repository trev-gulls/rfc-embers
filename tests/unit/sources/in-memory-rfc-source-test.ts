import { module, test } from 'qunit';
import InMemoryRfcSource from 'rfc-embers/tests/app/sources/in-memory-rfc-source';
import type { JsonApiResource } from 'rfc-embers/gateways/rfc-gateway';

module('Unit | Source | InMemoryRfcSource', function () {
  test('fetchAll returns an array of 3 RFC resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    assert.ok(Array.isArray(doc.data), 'data is an array');
    assert.strictEqual((doc.data as unknown[]).length, 3, 'returns 3 fixtures');
  });

  test('fetchAll data items are valid JSON:API resources', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchAll();
    const items = doc.data as JsonApiResource[];
    for (const item of items) {
      assert.ok(item.id, `item ${item.id} has id`);
      assert.strictEqual(item.type, 'rfc', `item ${item.id} has type 'rfc'`);
      assert.ok(item.attributes['title'], `item ${item.id} has title`);
      assert.ok(item.attributes['status'], `item ${item.id} has status`);
    }
  });

  test('fetchOne returns a single RFC by id', async function (assert) {
    const source = new InMemoryRfcSource();
    const doc = await source.fetchOne('724');
    const item = doc.data as JsonApiResource;
    assert.strictEqual(item.id, '724');
    assert.strictEqual(item.type, 'rfc');
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
    const author = (doc.included ?? [])[0];
    assert.strictEqual(author?.type, 'author');
  });
});
