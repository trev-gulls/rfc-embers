import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

const MOCK_SINGULAR = {
  data: {
    id: '42',
    type: 'rfc',
    attributes: {
      title: 'Named Blocks',
      number: 42,
      status: 'released',
      summary: 'Adds named blocks to templates.',
    },
    relationships: {
      author: { data: { id: 'tomdale', type: 'author' } },
    },
  },
  included: [
    {
      id: 'tomdale',
      type: 'author',
      attributes: { name: 'tomdale', 'github-handle': 'tomdale' },
    },
  ],
};

module('Unit | Route | rfc', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'source:rfc',
      {
        // RfcAdapter's gateway getter requires both methods to be present
        fetchAll: async () => ({ data: [], included: [] }),
        fetchOne: async (_id: string) => MOCK_SINGULAR,
      },
      { instantiate: false },
    );
  });

  test('model() returns a single RFC by id', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = this.owner.lookup('route:rfc') as any;
    const result = await route.model({ rfc_id: '42' });

    assert.strictEqual(result.title, 'Named Blocks', 'RFC has correct title');
    assert.strictEqual(result.number, 42, 'RFC has correct number');
    assert.strictEqual(result.status, 'released', 'RFC has correct status');
    assert.strictEqual(
      result.summary,
      'Adds named blocks to templates.',
      'RFC has correct summary',
    );
  });

  test('model() throws for non-numeric ids', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = this.owner.lookup('route:rfc') as any;

    await assert.rejects(
      route.model({ rfc_id: 'not-a-number' }),
      /Invalid RFC id/,
      'rejects with "Invalid RFC id" for non-numeric input',
    );
  });
});
