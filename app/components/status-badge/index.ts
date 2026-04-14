import Component from '@glimmer/component';
import type { RfcStatus } from '../../models/rfc';

interface Signature {
  Args: {
    status: RfcStatus;
  };
}

export default class StatusBadgeComponent extends Component<Signature> {}
