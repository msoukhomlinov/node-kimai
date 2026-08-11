// Shared types used across resources
// DO NOT EDIT MANUALLY

export interface ListParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
  page?: number;
  size?: number;
}

export interface ActivityListParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
  name?: string;
  visible?: boolean;
  customer?: number;
}

export interface CustomerListParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
  name?: string;
  visible?: boolean;
}

export interface ProjectListParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
  name?: string;
  visible?: boolean;
  customer?: number;
  activity?: number;
}

export interface TimesheetListParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
  page?: number;
  size?: number;
  user?: string | number;
  users?: number[];
  begin?: string;
  end?: string;
  activity?: number;
  project?: number;
  customer?: number;
  tag?: string;
  exported?: boolean;
}

export interface UserListParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
  role?: string;
  team?: number;
}

export interface InvoiceListParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
  page?: number;
  size?: number;
  customer?: number;
}

export interface TeamListParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
  name?: string;
}
