declare module '@ember-data/legacy-compat/builders' {
  export function query(type: string, params: Record<string, unknown>): unknown;
  export function findRecord(
    type: string,
    id: string,
    options?: Record<string, unknown>,
  ): unknown;
}
