import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import type Rfc from 'rfc-embers/models/rfc';
import type { RfcStatus } from 'rfc-embers/models/rfc';

export default class RfcsController extends Controller {
  declare model: Rfc[];

  @tracked activeStatus: RfcStatus | null = null;

  get filteredRfcs(): Rfc[] {
    if (!this.activeStatus) return this.model;
    return this.model.filter((rfc) => rfc.status === this.activeStatus);
  }

  @action setActiveStatus(status: RfcStatus | null): void {
    this.activeStatus = status;
  }
}
