import templateOnly from '@ember/component/template-only';
import type { RfcStatus } from '../../models/rfc';

interface Signature {
  Args: {
    status: RfcStatus;
  };
}

export default templateOnly<Signature>();
