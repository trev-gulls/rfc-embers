import Component from '@glimmer/component';
import { action } from '@ember/object';
import type { RfcStatus } from '../../models/rfc';

type FilterStatus = RfcStatus | null;

interface Signature {
  Args: {
    activeStatus: FilterStatus;
    onFilterChange: (status: FilterStatus) => void;
  };
}

export const ALL_STATUSES: RfcStatus[] = ['proposed', 'accepted', 'released', 'closed'];

export default class RfcFilterComponent extends Component<Signature> {
  get statuses(): RfcStatus[] {
    return ALL_STATUSES;
  }

  @action selectStatus(status: FilterStatus): void {
    // Clicking the already-active filter clears it
    const next = this.args.activeStatus === status ? null : status;
    this.args.onFilterChange(next);
  }
}
