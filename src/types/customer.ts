import type { CommentSummary, CustomerListParams, RateSummary } from './common';
import type { Team } from './team';
import type { User } from './user';

// Generated types for customer resource
// DO NOT EDIT MANUALLY

export interface Customer {
  "color-safe"?: string;
  id?: number;
  name: string;
  number?: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  company?: string;
  country: string;
  language?: string;
  currency?: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  homepage?: string;
  timezone: string;
  metaFields?: CustomerMeta[];
  color?: string;
}


export interface CustomerEntity {
  "color-safe"?: string;
  id?: number;
  name: string;
  number?: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  company?: string;
  vatId?: string;
  contact?: string;
  address?: string;
  country: string;
  language?: string;
  currency?: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  email?: string;
  homepage?: string;
  timezone: string;
  metaFields?: CustomerMeta[];
  teams?: Team[];
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  postCode?: string;
  city?: string;
  invoiceEmail?: string;
  buyerReference?: string;
  budget?: number;
  timeBudget?: number;
  budgetType?: string;
  color?: string;
}


export interface CustomerEditForm {
  name: string;
  number?: string;
  comment?: string;
  company?: string;
  vatId?: string;
  contact?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  postCode?: string;
  city?: string;
  country: string;
  language: "ar" | "bg" | "ca" | "cs" | "da" | "de" | "de_CH" | "el" | "en" | "eo" | "es" | "eu" | "fa" | "fi" | "fo" | "fr" | "he" | "hr" | "hu" | "id" | "it" | "ja" | "ko" | "nb_NO" | "nl" | "pa" | "pl" | "pt" | "pt_BR" | "ro" | "ru" | "sk" | "sl" | "sv" | "ta" | "tr" | "uk" | "vi" | "zh_CN" | "zh_Hant" | "zh_Hant_TW";
  currency: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  email?: string;
  homepage?: string;
  timezone: string;
  invoiceText?: string;
  invoiceTemplate?: string;
  invoiceEmail?: string;
  buyerReference?: string;
  teams?: number[];
  color?: string;
  budget?: unknown;
  timeBudget?: string;
  budgetType?: "month";
  visible?: boolean;
  billable?: boolean;
}


export interface CustomerMeta {
  name: string;
  value?: string;
}


export interface CustomerRate {
  id?: number;
  user?: User;
  rate?: number;
  internalRate?: number;
  isFixed?: boolean;
}


export interface CustomerRateForm {
  user?: number;
  rate: number;
  internalRate?: number;
  isFixed?: boolean;
}


export interface Comment {
  id?: number;
  message: string;
  createdBy: User;
  createdAt: string;
  pinned?: boolean;
}


export interface CommentForm {
  pinned?: boolean;
  message: string;
}


// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — customer helper shapes.
// ---------------------------------------------------------------------------

/**
 * The compact projection of a customer record (policy §9). Kept: identity and
 * state (`id`, `name`, `number`, `company`, `country`, `currency`, `timezone`,
 * `visible`, `billable`, `color`). Dropped: `"color-safe"`, `comment`,
 * `language`, the contact/invoice detail fields (`phone`, `fax`, `mobile`,
 * `email`, `homepage`, `vatId`, `contact`, `addressLine1-3`, `postCode`,
 * `city`, `invoiceText`, `invoiceTemplate`, `invoiceEmail`,
 * `buyerReference`), the budget fields and the child collections
 * (`metaFields`, `teams`) — the `expand: true` escape hatch returns the full
 * record.
 */
export interface CustomerSummary {
  id?: number;
  name: string;
  number?: string;
  company?: string;
  country: string;
  currency?: string;
  timezone: string;
  visible?: boolean;
  billable?: boolean;
  color?: string;
}

/**
 * The identifier kinds `customers.resolve` documents (policy §6): `{ id }`
 * (or a bare number) is a direct fetch; `{ name }` (or a bare string) is a
 * server-side `name` filter compared exactly. Customers have no other
 * business key.
 */
export type CustomerIdentifier = { id: number } | { name: string } | number | string;

/**
 * The server-driven filters of `customers.search` — exactly the filters the
 * spec declares on `GET /api/customers` (`name`/`visible`/`customer`); paging
 * is the helper's `limit` option, never a param.
 */
export type CustomerSearchParams = CustomerListParams;

/**
 * `customers.getContext` — the customer plus the records an agent must reason
 * about, fetched with a small bounded pool. Compact by default (the customer
 * is a `CustomerSummary`, the children are `RateSummary`/`CommentSummary`);
 * `expand: true` returns the full child records. `meta` is the record's own
 * `metaFields` (no extra wire call).
 */
export interface CustomerContext {
  customer: CustomerSummary;
  rates: RateSummary[];
  comments: CommentSummary[];
  meta: CustomerMeta[];
}

/** `getContext` with `expand: true`: the full customer and child records. */
export interface CustomerContextExpanded {
  customer: Customer;
  rates: CustomerRate[];
  comments: Comment[];
  meta: CustomerMeta[];
}
