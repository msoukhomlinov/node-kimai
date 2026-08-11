// Generated types for invoice resource
// DO NOT EDIT MANUALLY

import type { Customer } from './customer';
import type { User } from './user';

export interface Invoice {
  id?: number;
  customer?: Customer;
  user?: User;
  number?: string;
  year?: number;
  month?: number;
  begin?: string;
  end?: string;
  currency?: string;
  sum?: number;
  sumWithTax?: number;
  tax?: number;
  template?: string;
  customFields?: InvoiceMeta[];
}

export interface InvoiceMeta {
  name: string;
  value?: string;
}
