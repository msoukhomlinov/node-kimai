// Generated types for team resource
// DO NOT EDIT MANUALLY

import type { Customer } from './customer';
import type { Project } from './project';
import type { Activity } from './activity';
import type { User } from './user';

export interface Team {
  "color-safe"?: string;
  id?: number;
  name: string;
  customers?: Customer[];
  projects?: Project[];
  activities?: Activity[];
  members?: TeamMember[];
  color?: string;
}

export interface TeamMember {
  user?: User;
}

export interface TeamMembership {
  team?: Team;
}

export interface TeamEditForm {
  name: string;
  color?: string;
}
