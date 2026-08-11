// Generated types for customer resource
// DO NOT EDIT MANUALLY

import type { Team } from './team';
import type { User } from './user';

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
  user?: User;
  date: string;
  body: string;
  pinned?: boolean;
}

export interface CommentForm {
  body: string;
}
