// Generated types for user resource
// DO NOT EDIT MANUALLY

import type { Team } from './team';
import type { TeamMembership } from './team';

export interface User {
  alias?: string;
  title?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  teams?: Team[];
  locale?: string;
  timezone?: string;
}

export interface UserEntity {
  alias?: string;
  title?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  teams?: Team[];
  teamMemberships?: TeamMembership[];
  locale?: string;
  timezone?: string;
}

export interface UserEditForm {
  alias?: string;
  title?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  teams?: number[];
  locale?: string;
  timezone?: string;
}

export interface UserCreateForm {
  username: string;
  email: string;
  teams?: number[];
}

export interface UserPreference {
  name: string;
  value?: string;
}
