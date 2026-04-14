import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | status-badge', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders "proposed" status', async function (assert) {
    await render(hbs`<StatusBadge @status="proposed" />`);
    assert.dom('[data-test-status-badge]').hasText('proposed');
    assert.dom('[data-test-status-badge]').hasClass('status--proposed');
  });

  test('it renders "accepted" status', async function (assert) {
    await render(hbs`<StatusBadge @status="accepted" />`);
    assert.dom('[data-test-status-badge]').hasText('accepted');
    assert.dom('[data-test-status-badge]').hasClass('status--accepted');
  });

  test('it renders "released" status', async function (assert) {
    await render(hbs`<StatusBadge @status="released" />`);
    assert.dom('[data-test-status-badge]').hasText('released');
    assert.dom('[data-test-status-badge]').hasClass('status--released');
  });

  test('it renders "closed" status', async function (assert) {
    await render(hbs`<StatusBadge @status="closed" />`);
    assert.dom('[data-test-status-badge]').hasText('closed');
    assert.dom('[data-test-status-badge]').hasClass('status--closed');
  });
});
