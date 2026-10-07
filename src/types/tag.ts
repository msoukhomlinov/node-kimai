// Generated types for tag resource
// DO NOT EDIT MANUALLY

export interface TagEntity {
  "color-safe"?: string;
  id?: number;
  name: string;
  visible?: boolean;
  color?: string;
}


export interface TagEditForm {
  name: string;
  color?: string;
  visible?: boolean;
}



// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — tags helper shapes.
// ---------------------------------------------------------------------------

/**
 * The compact projection of a tag record (policy §9). Kept: identity, name,
 * visibility and colour. Dropped: the vendor-derived `color-safe` fallback —
 * the `expand: true` escape hatch returns the full record.
 */
export interface TagSummary {
  id?: number;
  name: string;
  visible?: boolean;
  color?: string;
}

/**
 * The identifier kinds `tags.resolve` documents (policy §6). Both a bare number
 * and a bare non-numeric string resolve through the vendor's tag list
 * (`GET /api/tags/find`), because the vendor exposes no
 * `GET /api/tags/{id}` read.
 */
export type TagIdentifier =
  | { id: number }
  | { name: string }
  | number
  | string;

/** The filters of `tags.search` — the vendor's `name` search term. */
export interface TagSearchParams {
  /** Search term to filter the tag list. */
  name?: string;
}
