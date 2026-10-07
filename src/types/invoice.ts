import type { Customer } from './customer';
import type { User } from './user';

// Generated types for invoice resource
// DO NOT EDIT MANUALLY

export interface Invoice {
  createdAt: string;
  overdue?: boolean;
  id?: number;
  invoiceNumber: string;
  comment?: string;
  customer: Customer;
  user: User;
  total?: number;
  tax?: number;
  currency: string;
  dueDays?: number;
  vat?: number;
  status?: string;
  invoiceFilename: string;
  paymentDate?: string;
  metaFields?: InvoiceMeta[];
}


export interface InvoiceMeta {
  name: string;
  value?: string;
}

