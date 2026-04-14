import Model, { attr, belongsTo } from '@ember-data/model';
import type Author from './author';

export type RfcStatus = 'proposed' | 'accepted' | 'released' | 'closed';

export default class Rfc extends Model {
  @attr('string') declare title: string;
  @attr('number') declare number: number;
  @attr('string') declare status: RfcStatus;
  @attr('string') declare summary: string;

  @belongsTo('author', { async: false, inverse: null })
  declare author: Author;
}

declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    rfc: Rfc;
  }
}
