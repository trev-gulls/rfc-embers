import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { getOwner } from '@ember/application';
import type RfcGateway from '../gateways/rfc-gateway';

export default class RfcAdapter extends JSONAPIAdapter {
  private get gateway(): RfcGateway {
    return getOwner(this)!.lookup('source:rfc') as RfcGateway;
  }

  override async query(
    _store: unknown,
    _type: unknown,
    params: Record<string, unknown>
  ): Promise<unknown> {
    return this.gateway.fetchAll(params);
  }

  override async findRecord(
    _store: unknown,
    _type: unknown,
    id: string
  ): Promise<unknown> {
    return this.gateway.fetchOne(id);
  }
}
