import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

const MOCK_COLLECTION = {
  data: [
    {
      id: '100',
      type: 'rfc',
      attributes: {
        title: 'First-class Component Templates',
        number: 100,
        status: 'proposed',
        summary: 'Introduces first-class component templates.',
      },
      relationships: {
        author: { data: { id: 'wycats', type: 'author' } },
      },
    },
    {
      id: '200',
      type: 'rfc',
      attributes: {
        title: 'Tracked Properties',
        number: 200,
        status: 'released',
        summary: 'Makes properties trackable.',
      },
      relationships: {
        author: { data: { id: 'pzuraq', type: 'author' } },
      },
    },
  ],
  included: [
    {
      id: 'wycats',
      type: 'author',
      attributes: { name: 'wycats', 'github-handle': 'wycats' },
    },
    {
      id: 'pzuraq',
      type: 'author',
      attributes: { name: 'pzuraq', 'github-handle': 'pzuraq' },
    },
  ],
};

module('Unit | Route | rfcs', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'source:rfc',
      {
        fetchAll: async () => MOCK_COLLECTION,
        // RfcAdapter's gateway getter requires both methods to be present
        fetchOne: async (_id: string) => ({
          data: MOCK_COLLECTION.data[0]!,
          included: MOCK_COLLECTION.included,
        }),
      },
      { instantiate: false },
    );
  });

  test('model() returns all RFC records from the gateway', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = this.owner.lookup('route:rfcs') as any;
    const result = await route.model();

    assert.strictEqual(result.length, 2, 'returns two RFC records');
  });

  test('model() normalizes RFC attributes from the gateway response', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = this.owner.lookup('route:rfcs') as any;
    const result = await route.model();

    assert.strictEqual(
      result[0].title,
      'First-class Component Templates',
      'first RFC has correct title',
    );
    assert.strictEqual(
      result[0].status,
      'proposed',
      'first RFC has correct status',
    );
    assert.strictEqual(
      result[1].title,
      'Tracked Properties',
      'second RFC has correct title',
    );
    assert.strictEqual(
      result[1].status,
      'released',
      'second RFC has correct status',
    );
  });
});
