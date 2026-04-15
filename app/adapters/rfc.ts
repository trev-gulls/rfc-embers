import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { getOwner } from '@ember/application';
import type RfcGateway from '../gateways/rfc-gateway';

export default class RfcAdapter extends JSONAPIAdapter {
  private get gateway(): RfcGateway {
    return getOwner(this)!.lookup('source:rfc') as RfcGateway;
  }

  // @ts-expect-error: DT types don't align with our gateway return shape
  async query(
    _store: unknown,
    _type: unknown,
    params: Record<string, unknown>,
  ) {
    return this.gateway.fetchAll(params);
  }

  // @ts-expect-error: DT types don't align with our gateway return shape
  async findRecord(_store: unknown, _type: unknown, id: string) {
    return this.gateway.fetchOne(id);
  }
}
