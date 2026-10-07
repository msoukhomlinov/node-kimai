import type { Customer } from './customer';
import type { InvoiceListParams } from './common';
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


// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — invoice helper shapes.
// ---------------------------------------------------------------------------

/**
 * The compact projection of an invoice record (policy §9). Kept: identity,
 * state and money (`id`, `invoiceNumber`, `createdAt`, `status`, `total`,
 * `tax`, `vat`, `currency`, `dueDays`, `paymentDate`, `overdue`,
 * `invoiceFilename`, `comment`) and the referenced record ids (`customerId`,
 * `userId`). Dropped: the embedded `customer`/`user` objects and the
 * `metaFields` collection — the `expand: true` escape hatch returns the full
 * record.
 */
export interface InvoiceSummary {
  id?: number;
  invoiceNumber: string;
  createdAt: string;
  status?: string;
  customerId?: number;
  userId?: number;
  currency: string;
  total?: number;
  tax?: number;
  vat?: number;
  dueDays?: number;
  paymentDate?: string;
  overdue?: boolean;
  invoiceFilename: string;
  comment?: string;
}

/**
 * The identifier kinds `invoices.resolve` documents (policy §6): `{ id }` (or
 * a bare number/numeric string) is a direct fetch. Invoices have no vendor
 * filter for a business key (invoice number), so no name/number resolution is
 * offered; text that is not an id is rejected.
 */
export type InvoiceIdentifier = { id: number } | number | string;

/**
 * The server-driven filters of `invoices.search` — exactly the filters the
 * spec declares on `GET /api/invoices` (`begin`/`end`/`customers[]`/
 * `status[]`); paging is the helper's `limit` option, never a param.
 */
export type InvoiceSearchParams = InvoiceListParams;
