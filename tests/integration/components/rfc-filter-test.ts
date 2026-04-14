import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | rfc-filter', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.activeStatus = null;
    this.onFilterChange = (status: string | null) => {
      this.activeStatus = status;
    };
  });

  test('it renders all status filter buttons', async function (assert) {
    await render(
      hbs`<RfcFilter @activeStatus={{this.activeStatus}} @onFilterChange={{this.onFilterChange}} />`,
    );
    assert.dom('[data-test-filter-button="all"]').exists();
    assert.dom('[data-test-filter-button="proposed"]').exists();
    assert.dom('[data-test-filter-button="accepted"]').exists();
    assert.dom('[data-test-filter-button="released"]').exists();
    assert.dom('[data-test-filter-button="closed"]').exists();
  });

  test('"All" button is active when no filter is set', async function (assert) {
    await render(
      hbs`<RfcFilter @activeStatus={{null}} @onFilterChange={{this.onFilterChange}} />`,
    );
    assert
      .dom('[data-test-filter-button="all"]')
      .hasClass('filter-button--active');
  });

  test('clicking a status button calls onFilterChange with that status', async function (assert) {
    assert.expect(1);
    this.onFilterChange = (status: string | null) => {
      assert.strictEqual(status, 'proposed');
    };
    await render(
      hbs`<RfcFilter @activeStatus={{null}} @onFilterChange={{this.onFilterChange}} />`,
    );
    await click('[data-test-filter-button="proposed"]');
  });

  test('clicking the active status button clears the filter', async function (assert) {
    assert.expect(1);
    this.onFilterChange = (status: string | null) => {
      assert.strictEqual(status, null);
    };
    await render(
      hbs`<RfcFilter @activeStatus="proposed" @onFilterChange={{this.onFilterChange}} />`,
    );
    await click('[data-test-filter-button="proposed"]');
  });
});
