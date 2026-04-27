import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { getOwner } from '@ember/application';
import type RfcGateway from '../gateways/rfc-gateway';

export default class RfcAdapter extends JSONAPIAdapter {
  private get gateway(): RfcGateway {
    const source = getOwner(this)?.lookup('source:rfc');
    if (
      !source ||
      typeof (source as RfcGateway).fetchAll !== 'function' ||
      typeof (source as RfcGateway).fetchOne !== 'function'
    ) {
      throw new Error(
        "RfcAdapter: 'source:rfc' is not registered or does not implement RfcGateway. " +
          "Call owner.register('source:rfc', YourSource, { instantiate: false }) in your route or test setup.",
      );
    }
    return source as RfcGateway;
  }

  // @ts-expect-error: EmberData's adapter chain returns RSVP.Promise which carries a 'new'
  // constructor signature; native async returns platform Promise which lacks it. Runtime is
  // correct — remove this suppression if EmberData drops RSVP from its type definitions.
  async query(_store: unknown, _type: unknown, _params: Record<string, unknown>) {
    return this.gateway.fetchAll();
  }

  // @ts-expect-error: same RSVP.Promise vs native Promise incompatibility as query above.
  async findRecord(_store: unknown, _type: unknown, id: string) {
    return this.gateway.fetchOne(id);
  }
}
