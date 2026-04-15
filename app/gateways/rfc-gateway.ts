export interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data: { id: string; type: string } | null }>;
}

export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
}

export default interface RfcGateway {
  fetchAll(params?: Record<string, unknown>): Promise<JsonApiDocument>;
  fetchOne(id: string): Promise<JsonApiDocument>;
}
