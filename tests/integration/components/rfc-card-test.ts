import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | rfc-card', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.set('rfc', {
      id: '724',
      title: 'Native TypeScript Types',
      number: 724,
      status: 'released',
      summary: 'Ship native TypeScript types with Ember packages.',
      author: { name: 'Krystan HuffMenne', githubHandle: 'gitKrystan' },
    });
  });

  test('it renders the RFC title and number', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    assert.dom('[data-test-rfc-card]').exists();
    assert.dom('[data-test-rfc-title]').hasText('Native TypeScript Types');
    assert.dom('[data-test-rfc-number]').hasText('#724');
  });

  test('it shows the status badge', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    assert.dom('[data-test-status-badge]').hasText('released');
  });

  test('summary is hidden by default', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    assert.dom('[data-test-rfc-summary]').doesNotExist();
  });

  test('clicking expand shows the summary', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    await click('[data-test-expand-button]');
    assert.dom('[data-test-rfc-summary]').exists();
    assert
      .dom('[data-test-rfc-summary]')
      .containsText('Ship native TypeScript types');
  });

  test('clicking expand again hides the summary', async function (assert) {
    await render(hbs`<RfcCard @rfc={{this.rfc}} />`);
    await click('[data-test-expand-button]');
    await click('[data-test-expand-button]');
    assert.dom('[data-test-rfc-summary]').doesNotExist();
  });
});
