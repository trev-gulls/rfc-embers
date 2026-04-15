import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';

export default class RfcsRoute extends Route {
  @service declare store: Store;

  async model() {
    return this.store.query('rfc', {});
  }
}
