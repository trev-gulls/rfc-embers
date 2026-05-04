import { setupTest } from 'rfc-embers/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Adapter | rfc', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const adapter = this.owner.lookup('adapter:rfc');
    assert.ok(adapter, 'adapter exists');
  });

  test('query() delegates to gateway.fetchAll() and returns its document', async function (assert) {
    let fetchAllCalled = false;
    const expectedDocument = {
      data: [
        {
          id: '1',
          type: 'rfc',
          attributes: { title: 'Test RFC', number: 1, status: 'proposed', summary: '' },
          relationships: { author: { data: { id: 'testuser', type: 'author' } } },
        },
      ],
      included: [
        {
          id: 'testuser',
          type: 'author',
          attributes: { name: 'testuser', 'github-handle': 'testuser' },
        },
      ],
    };

    this.owner.register(
      'source:rfc',
      {
        fetchAll: async () => {
          fetchAllCalled = true;
          return expectedDocument;
        },
        // gateway getter requires both methods present
        fetchOne: async () => ({ data: null, included: [] }),
      },
      { instantiate: false },
    );

    const adapter = this.owner.lookup('adapter:rfc');
    const result = await adapter.query(undefined, undefined, {});

    assert.true(fetchAllCalled, 'gateway.fetchAll() was called');
    assert.deepEqual(result, expectedDocument, 'returns the JSON:API document from the gateway');
  });

  test('findRecord() calls gateway.fetchOne() with the correct id', async function (assert) {
    let receivedId;
    const expectedDocument = {
      data: {
        id: '99',
        type: 'rfc',
        attributes: { title: 'Numeric Id RFC', number: 99, status: 'proposed', summary: '' },
        relationships: { author: { data: { id: 'testuser', type: 'author' } } },
      },
      included: [
        {
          id: 'testuser',
          type: 'author',
          attributes: { name: 'testuser', 'github-handle': 'testuser' },
        },
      ],
    };

    this.owner.register(
      'source:rfc',
      {
        // gateway getter requires both methods present
        fetchAll: async () => ({ data: [], included: [] }),
        fetchOne: async (id) => {
          receivedId = id;
          return expectedDocument;
        },
      },
      { instantiate: false },
    );

    const adapter = this.owner.lookup('adapter:rfc');
    const result = await adapter.findRecord(undefined, undefined, '99');

    assert.strictEqual(receivedId, '99', 'gateway.fetchOne() was called with the correct id');
    assert.deepEqual(result, expectedDocument, 'returns the JSON:API document from the gateway');
  });
});
