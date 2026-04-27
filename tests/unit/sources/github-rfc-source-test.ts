import { module, test } from 'qunit';
import GitHubRfcSource from 'rfc-embers/sources/github-rfc-source';

const MOCK_ISSUES = [
  {
    number: 724,
    title: 'Native TypeScript Types',
    body: 'Ship native TypeScript types with Ember packages.',
    state: 'closed',
    user: { login: 'gitKrystan' },
    labels: [{ name: 'S-Released' }],
  },
  {
    number: 883,
    title: 'Ember Polaris',
    body: 'The next major edition of Ember.',
    state: 'open',
    user: { login: 'wycats' },
    labels: [{ name: 'S-Recommended' }],
  },
  {
    number: 900,
    title: 'Resource API',
    body: 'A unified Resource API.',
    state: 'open',
    user: { login: 'NullVoxPopuli' },
    labels: [],
  },
];

let originalFetch: typeof globalThis.fetch;

module('Unit | Source | GitHubRfcSource', function (hooks) {
  hooks.beforeEach(function () {
    originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      ({ ok: true, json: async () => MOCK_ISSUES }) as Response;
  });

  hooks.afterEach(function () {
    globalThis.fetch = originalFetch;
  });

  test('fetchAll returns a JSON:API document with data array', async function (assert) {
    const source = new GitHubRfcSource();
    const doc = await source.fetchAll();
    assert.strictEqual(doc.data.length, 3);
  });

  test('fetchAll maps GitHub labels to RFC status correctly', async function (assert) {
    const source = new GitHubRfcSource();
    const doc = await source.fetchAll();
    assert.strictEqual(doc.data.find((i) => i.id === '724')?.attributes['status'], 'released');
    assert.strictEqual(doc.data.find((i) => i.id === '883')?.attributes['status'], 'accepted');
    assert.strictEqual(doc.data.find((i) => i.id === '900')?.attributes['status'], 'proposed');
  });

  test('fetchAll deduplicates and includes author resources', async function (assert) {
    const source = new GitHubRfcSource();
    const doc = await source.fetchAll();
    assert.ok(doc.included, 'has included resources');
    assert.strictEqual(doc.included?.length, 3, 'one author per unique login');
    const author = doc.included?.find((r) => r.id === 'gitKrystan');
    assert.ok(author, 'gitKrystan is in included');
    assert.strictEqual(author?.type, 'author');
  });

  test('fetchAll throws on non-ok GitHub response', async function (assert) {
    globalThis.fetch = async () => ({ ok: false, status: 403 }) as Response;
    const source = new GitHubRfcSource();
    await assert.rejects(source.fetchAll(), /403/);
  });

  test('fetchAll handles issues with null user (deleted accounts)', async function (assert) {
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => [{ ...MOCK_ISSUES[0], user: null }],
      }) as Response;
    const source = new GitHubRfcSource();
    const doc = await source.fetchAll();
    assert.strictEqual(doc.data.length, 1, 'processes the issue');
    assert.strictEqual(
      doc.included?.[0]?.id,
      'unknown',
      'null user gets fallback id "unknown"',
    );
  });

  test('fetchOne handles null user (deleted account)', async function (assert) {
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => ({ ...MOCK_ISSUES[0], user: null }),
      }) as Response;
    const source = new GitHubRfcSource();
    const doc = await source.fetchOne('724');
    assert.strictEqual(doc.data.id, '724', 'still returns the RFC');
    assert.strictEqual(
      doc.included?.[0]?.id,
      'unknown',
      'null user gets fallback id "unknown"',
    );
  });
});
