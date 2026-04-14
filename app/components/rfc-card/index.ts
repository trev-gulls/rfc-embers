import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import type Rfc from 'rfc-embers/models/rfc';

interface Signature {
  Args: {
    rfc: Rfc;
  };
}

export default class RfcCardComponent extends Component<Signature> {
  @tracked isExpanded = false;

  @action toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }
}
