import type { Activity } from './activity';
import type { Customer } from './customer';
import type { Project } from './project';
import type { User } from './user';

// Generated types for team resource
// DO NOT EDIT MANUALLY

export interface Team {
  "color-safe"?: string;
  id?: number;
  name: string;
  members?: TeamMember[];
  customers?: Customer[];
  projects?: Project[];
  activities?: Activity[];
  color?: string;
}


export interface TeamMember {
  user: User;
  teamlead?: boolean;
}


export interface TeamMembership {
  team: Team;
  teamlead?: boolean;
}


export interface TeamEditForm {
  name: string;
  color?: string;
  members: { user: number, teamlead: boolean }[];
}

