import { module, test } from 'qunit';
import { setupTest } from 'rfc-embers/tests/helpers';

module('Unit | Serializer | rfc', function (hooks) {
  setupTest(hooks);

  test('serializer is registered', function (assert) {
    const store = this.owner.lookup('service:store') as {
      serializerFor: (name: string) => unknown;
    };
    assert.ok(store.serializerFor('rfc'), 'rfc serializer is registered');
  });

  test('keyForAttribute dasherizes model attribute names on deserialize', function (assert) {
    const store = this.owner.lookup('service:store') as {
      serializerFor: (name: string) => {
        keyForAttribute: (key: string, method: string) => string;
      };
    };
    const serializer = store.serializerFor('rfc');
    assert.strictEqual(
      serializer.keyForAttribute('githubHandle', 'deserialize'),
      'github-handle',
      'githubHandle model attribute maps to github-handle JSON:API key',
    );
  });

  test('dasherizes githubHandle on serialize', function (assert) {
    const store = this.owner.lookup('service:store') as {
      serializerFor: (name: string) => {
        keyForAttribute: (key: string, method: string) => string;
      };
    };
    const serializer = store.serializerFor('rfc');
    assert.strictEqual(
      serializer.keyForAttribute('githubHandle', 'serialize'),
      'github-handle',
      'githubHandle model attribute serializes to github-handle JSON key',
    );
  });
});
