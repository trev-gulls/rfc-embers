import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { query } from '@ember-data/legacy-compat/builders';
import type Store from '@ember-data/store';

export default class RfcsRoute extends Route {
  @service declare store: Store;

  async model() {
    const { content } = await (this.store as any).request(query('rfc', {}));
    return content;
  }
}
