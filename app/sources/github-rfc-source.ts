import type RfcGateway from '../gateways/rfc-gateway';
import type { JsonApiDocument } from '../gateways/rfc-gateway';

export default class GitHubRfcSource implements RfcGateway {
  async fetchAll(_params?: Record<string, unknown>): Promise<JsonApiDocument> {
    throw new Error('GitHubRfcSource: not yet implemented');
  }

  async fetchOne(_id: string): Promise<JsonApiDocument> {
    throw new Error('GitHubRfcSource: not yet implemented');
  }
}
