// Shared types used across resources
// DO NOT EDIT MANUALLY

export type ListParams = {
  page?: number;
  size?: number;
};

export type ActivityListParams = {
  name?: string;
  visible?: boolean;
  customer?: number;
};

export type CustomerListParams = {
  name?: string;
  visible?: boolean;
  customer?: number;
};

export type ProjectListParams = {
  name?: string;
  visible?: boolean;
  customer?: number;
  activity?: number;
};

export type TimesheetListParams = {
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
};

export type UserListParams = {
  role?: string;
  team?: number;
};

export type InvoiceListParams = {
  page?: number;
  size?: number;
  customer?: number;
};

export type TeamListParams = {
  name?: string;
};
