import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';

export default class RfcRoute extends Route {
  @service declare store: Store;

  async model(params: { rfc_id: string }) {
    return this.store.findRecord('rfc', params.rfc_id, { reload: true });
  }
}
