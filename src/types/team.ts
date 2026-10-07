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



// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — teams helper shapes.
// ---------------------------------------------------------------------------

/**
 * The compact projection of a team record (policy §9). Kept: identity, name and
 * colour. Dropped: the four sub-resource collections (`members`, `customers`,
 * `projects`, `activities`) — the `expand: true` escape hatch returns the full
 * record.
 */
export interface TeamSummary {
  id?: number;
  name: string;
  color?: string;
  'color-safe'?: string;
}

/**
 * The identifier kinds `teams.resolve` documents (policy §6): `{ id }` (or a
 * bare number) is a direct fetch; `{ name }` (or a bare non-numeric string) is
 * the vendor's `name` filter with an exact compare afterwards.
 */
export type TeamIdentifier =
  | { id: number }
  | { name: string }
  | number
  | string;
