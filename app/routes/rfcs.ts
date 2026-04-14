import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import { query } from '@ember-data/json-api/request';

export default class RfcsRoute extends Route {
  @service declare store: Store;

  async model() {
    const { content } = await this.store.request(query('rfc', {}));
    return content.data;
  }
}
