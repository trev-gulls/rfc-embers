import Component from '@glimmer/component';
import { action } from '@ember/object';
import { RFC_STATUSES } from '../../models/rfc';
import type { RfcStatus } from '../../models/rfc';

type FilterStatus = RfcStatus | null;

interface Signature {
  Args: {
    activeStatus: FilterStatus;
    onFilterChange: (status: FilterStatus) => void;
  };
}

export default class RfcFilterComponent extends Component<Signature> {
  get statuses(): readonly RfcStatus[] {
    return RFC_STATUSES;
  }

  @action selectStatus(status: FilterStatus): void {
    const next = this.args.activeStatus === status ? null : status;
    this.args.onFilterChange(next);
  }
}
