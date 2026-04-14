import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import { findRecord } from '@ember-data/json-api/request';

export default class RfcRoute extends Route {
  @service declare store: Store;

  async model(params: { rfc_id: string }) {
    const { content } = await this.store.request(findRecord('rfc', params.rfc_id));
    return content.data;
  }
}
