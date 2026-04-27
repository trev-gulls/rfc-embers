export interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data: { id: string; type: string } | null }>;
}

export interface JsonApiSingularDocument {
  data: JsonApiResource;
  included?: JsonApiResource[];
}

export interface JsonApiCollectionDocument {
  data: JsonApiResource[];
  included?: JsonApiResource[];
}

export default interface RfcGateway {
  fetchAll(): Promise<JsonApiCollectionDocument>;
  fetchOne(id: string): Promise<JsonApiSingularDocument>;
}
