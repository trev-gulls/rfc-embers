import Model, { attr } from '@ember-data/model';

export default class Author extends Model {
  @attr('string') declare name: string;
  @attr('string') declare githubHandle: string;
}

declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    author: Author;
  }
}
