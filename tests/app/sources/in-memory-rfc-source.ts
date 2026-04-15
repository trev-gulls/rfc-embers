import type RfcGateway from 'rfc-embers/gateways/rfc-gateway';
import type {
  JsonApiDocument,
  JsonApiResource,
} from 'rfc-embers/gateways/rfc-gateway';

const FIXTURES: JsonApiDocument = {
  data: [
    {
      id: '724',
      type: 'rfc',
      attributes: {
        title: 'Native TypeScript Types',
        number: 724,
        status: 'released',
        summary: 'Ship native TypeScript types with Ember packages.',
      },
      relationships: {
        author: { data: { id: 'gitKrystan', type: 'author' } },
      },
    },
    {
      id: '883',
      type: 'rfc',
      attributes: {
        title: 'Ember Polaris',
        number: 883,
        status: 'accepted',
        summary: 'The next major edition of Ember.',
      },
      relationships: {
        author: { data: { id: 'wycats', type: 'author' } },
      },
    },
    {
      id: '900',
      type: 'rfc',
      attributes: {
        title: 'Resource API',
        number: 900,
        status: 'proposed',
        summary: 'A unified Resource API for reactive state management.',
      },
      relationships: {
        author: { data: { id: 'NullVoxPopuli', type: 'author' } },
      },
    },
  ],
  included: [
    {
      id: 'gitKrystan',
      type: 'author',
      attributes: { name: 'Krystan HuffMenne', 'github-handle': 'gitKrystan' },
    },
    {
      id: 'wycats',
      type: 'author',
      attributes: { name: 'Yehuda Katz', 'github-handle': 'wycats' },
    },
    {
      id: 'NullVoxPopuli',
      type: 'author',
      attributes: { name: 'Preston Sego', 'github-handle': 'NullVoxPopuli' },
    },
  ],
};

export default class InMemoryRfcSource implements RfcGateway {
  async fetchAll(): Promise<JsonApiDocument> {
    return FIXTURES;
  }

  async fetchOne(id: string): Promise<JsonApiDocument> {
    const items = FIXTURES.data as JsonApiResource[];
    const item = items.find((r) => r.id === id);
    if (!item) {
      throw new Error(`RFC with id ${id} not found`);
    }
    return { data: item, included: FIXTURES.included };
  }
}
