import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';

export default class RfcRoute extends Route {
  @service declare store: Store;

  async model(params: { rfc_id: string }) {
    if (!/^\d+$/.test(params.rfc_id)) {
      throw new Error(
        `Invalid RFC id: "${params.rfc_id}". RFC ids must be numeric.`,
      );
    }
    return this.store.findRecord('rfc', params.rfc_id, { reload: true });
  }
}
