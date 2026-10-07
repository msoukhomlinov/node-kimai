import type { Team, TeamMembership } from './team';
import type { UserListParams } from './common';

// Generated types for user resource
// DO NOT EDIT MANUALLY

export interface User {
  apiToken?: boolean;
  locale?: string;
  timezone?: string;
  language?: string;
  initials?: string;
  "color-safe"?: string;
  id?: number;
  alias?: string;
  title?: string;
  avatar?: string;
  username: string;
  email: string;
  accountNumber?: string;
  enabled?: boolean;
  systemAccount?: boolean;
  color?: string;
}


export interface UserEntity {
  apiToken?: boolean;
  preferences?: UserPreference[];
  locale?: string;
  timezone?: string;
  language?: string;
  teams?: Team[];
  initials?: string;
  "color-safe"?: string;
  id?: number;
  alias?: string;
  title?: string;
  avatar?: string;
  memberships: TeamMembership[];
  username: string;
  email: string;
  accountNumber?: string;
  enabled?: boolean;
  roles?: string[];
  systemAccount?: boolean;
  supervisor?: User;
  color?: string;
}


export interface UserEditForm {
  alias?: string;
  title?: string;
  accountNumber?: string;
  color?: string;
  email: string;
  language: "ar" | "bg" | "ca" | "cs" | "da" | "de" | "de_CH" | "el" | "en" | "eo" | "es" | "eu" | "fa" | "fi" | "fo" | "fr" | "he" | "hr" | "hu" | "id" | "it" | "ja" | "ko" | "nb_NO" | "nl" | "pa" | "pl" | "pt" | "pt_BR" | "ro" | "ru" | "sk" | "sl" | "sv" | "ta" | "tr" | "uk" | "vi" | "zh_CN" | "zh_Hant" | "zh_Hant_TW";
  locale: "ar" | "bg" | "ca" | "cs" | "cs_CZ" | "da" | "da_DK" | "da_GL" | "de" | "de_AT" | "de_BE" | "de_CH" | "de_DE" | "de_IT" | "de_LI" | "de_LU" | "el" | "el_CY" | "el_GR" | "en" | "en_AE" | "en_AG" | "en_AI" | "en_AS" | "en_AT" | "en_AU" | "en_BB" | "en_BE" | "en_BI" | "en_BM" | "en_BS" | "en_BW" | "en_BZ" | "en_CA" | "en_CC" | "en_CH" | "en_CK" | "en_CM" | "en_CX" | "en_CY" | "en_CZ" | "en_DE" | "en_DK" | "en_DM" | "en_EE" | "en_ER" | "en_ES" | "en_FI" | "en_FJ" | "en_FK" | "en_FM" | "en_FR" | "en_GB" | "en_GD" | "en_GE" | "en_GG" | "en_GH" | "en_GI" | "en_GM" | "en_GS" | "en_GU" | "en_GY" | "en_HK" | "en_HU" | "en_ID" | "en_IE" | "en_IL" | "en_IM" | "en_IN" | "en_IO" | "en_IT" | "en_JE" | "en_JM" | "en_JP" | "en_KE" | "en_KI" | "en_KN" | "en_KY" | "en_LC" | "en_LR" | "en_LS" | "en_LT" | "en_LV" | "en_MG" | "en_MH" | "en_MO" | "en_MP" | "en_MS" | "en_MT" | "en_MU" | "en_MV" | "en_MW" | "en_MY" | "en_NA" | "en_NF" | "en_NG" | "en_NL" | "en_NO" | "en_NR" | "en_NU" | "en_NZ" | "en_PG" | "en_PH" | "en_PK" | "en_PL" | "en_PN" | "en_PR" | "en_PT" | "en_PW" | "en_RO" | "en_RW" | "en_SB" | "en_SC" | "en_SD" | "en_SE" | "en_SG" | "en_SH" | "en_SI" | "en_SK" | "en_SL" | "en_SS" | "en_SX" | "en_SZ" | "en_TC" | "en_TK" | "en_TO" | "en_TT" | "en_TV" | "en_TZ" | "en_UA" | "en_UG" | "en_UM" | "en_US" | "en_VC" | "en_VG" | "en_VI" | "en_VU" | "en_WS" | "en_ZA" | "en_ZM" | "en_ZW" | "eo" | "es" | "es_AR" | "es_BO" | "es_BR" | "es_BZ" | "es_CL" | "es_CO" | "es_CR" | "es_CU" | "es_DO" | "es_EC" | "es_ES" | "es_GQ" | "es_GT" | "es_HN" | "es_MX" | "es_NI" | "es_PA" | "es_PE" | "es_PH" | "es_PR" | "es_PY" | "es_SV" | "es_US" | "es_UY" | "es_VE" | "eu" | "eu_ES" | "fa" | "fa_AF" | "fa_IR" | "fi" | "fi_FI" | "fo" | "fo_DK" | "fo_FO" | "fr" | "fr_BE" | "fr_BF" | "fr_BI" | "fr_BJ" | "fr_BL" | "fr_CA" | "fr_CD" | "fr_CF" | "fr_CG" | "fr_CH" | "fr_CI" | "fr_CM" | "fr_DJ" | "fr_DZ" | "fr_FR" | "fr_GA" | "fr_GF" | "fr_GN" | "fr_GP" | "fr_GQ" | "fr_HT" | "fr_KM" | "fr_LU" | "fr_MA" | "fr_MC" | "fr_MF" | "fr_MG" | "fr_ML" | "fr_MQ" | "fr_MR" | "fr_MU" | "fr_NC" | "fr_NE" | "fr_PF" | "fr_PM" | "fr_RE" | "fr_RW" | "fr_SC" | "fr_SN" | "fr_SY" | "fr_TD" | "fr_TG" | "fr_TN" | "fr_VU" | "fr_WF" | "fr_YT" | "he" | "he_IL" | "hr" | "hr_BA" | "hr_HR" | "hu" | "hu_HU" | "id" | "it" | "it_CH" | "it_IT" | "it_SM" | "it_VA" | "ja" | "ja_JP" | "ko" | "ko_CN" | "ko_KP" | "ko_KR" | "nb_NO" | "nl" | "nl_AW" | "nl_BE" | "nl_BQ" | "nl_CW" | "nl_NL" | "nl_SR" | "nl_SX" | "pa" | "pl" | "pl_PL" | "pt" | "pt_AO" | "pt_BR" | "pt_CH" | "pt_CV" | "pt_GQ" | "pt_GW" | "pt_LU" | "pt_MO" | "pt_MZ" | "pt_PT" | "pt_ST" | "pt_TL" | "ro" | "ro_MD" | "ro_RO" | "ru" | "ru_BY" | "ru_KG" | "ru_KZ" | "ru_MD" | "ru_RU" | "ru_UA" | "sk" | "sk_SK" | "sl" | "sv" | "sv_AX" | "sv_FI" | "sv_SE" | "ta" | "tr" | "tr_CY" | "tr_TR" | "uk" | "uk_UA" | "vi" | "vi_VN" | "zh_CN" | "zh_Hant" | "zh_Hant_TW";
  timezone: string;
  supervisor?: number;
  roles?: "ROLE_TEAMLEAD" | "ROLE_ADMIN" | "ROLE_SUPER_ADMIN"[];
  enabled?: boolean;
  systemAccount?: boolean;
  requiresPasswordReset?: boolean;
}


export interface UserCreateForm {
  username: string;
  alias?: string;
  title?: string;
  accountNumber?: string;
  color?: string;
  email: string;
  language: "ar" | "bg" | "ca" | "cs" | "da" | "de" | "de_CH" | "el" | "en" | "eo" | "es" | "eu" | "fa" | "fi" | "fo" | "fr" | "he" | "hr" | "hu" | "id" | "it" | "ja" | "ko" | "nb_NO" | "nl" | "pa" | "pl" | "pt" | "pt_BR" | "ro" | "ru" | "sk" | "sl" | "sv" | "ta" | "tr" | "uk" | "vi" | "zh_CN" | "zh_Hant" | "zh_Hant_TW";
  locale: "ar" | "bg" | "ca" | "cs" | "cs_CZ" | "da" | "da_DK" | "da_GL" | "de" | "de_AT" | "de_BE" | "de_CH" | "de_DE" | "de_IT" | "de_LI" | "de_LU" | "el" | "el_CY" | "el_GR" | "en" | "en_AE" | "en_AG" | "en_AI" | "en_AS" | "en_AT" | "en_AU" | "en_BB" | "en_BE" | "en_BI" | "en_BM" | "en_BS" | "en_BW" | "en_BZ" | "en_CA" | "en_CC" | "en_CH" | "en_CK" | "en_CM" | "en_CX" | "en_CY" | "en_CZ" | "en_DE" | "en_DK" | "en_DM" | "en_EE" | "en_ER" | "en_ES" | "en_FI" | "en_FJ" | "en_FK" | "en_FM" | "en_FR" | "en_GB" | "en_GD" | "en_GE" | "en_GG" | "en_GH" | "en_GI" | "en_GM" | "en_GS" | "en_GU" | "en_GY" | "en_HK" | "en_HU" | "en_ID" | "en_IE" | "en_IL" | "en_IM" | "en_IN" | "en_IO" | "en_IT" | "en_JE" | "en_JM" | "en_JP" | "en_KE" | "en_KI" | "en_KN" | "en_KY" | "en_LC" | "en_LR" | "en_LS" | "en_LT" | "en_LV" | "en_MG" | "en_MH" | "en_MO" | "en_MP" | "en_MS" | "en_MT" | "en_MU" | "en_MV" | "en_MW" | "en_MY" | "en_NA" | "en_NF" | "en_NG" | "en_NL" | "en_NO" | "en_NR" | "en_NU" | "en_NZ" | "en_PG" | "en_PH" | "en_PK" | "en_PL" | "en_PN" | "en_PR" | "en_PT" | "en_PW" | "en_RO" | "en_RW" | "en_SB" | "en_SC" | "en_SD" | "en_SE" | "en_SG" | "en_SH" | "en_SI" | "en_SK" | "en_SL" | "en_SS" | "en_SX" | "en_SZ" | "en_TC" | "en_TK" | "en_TO" | "en_TT" | "en_TV" | "en_TZ" | "en_UA" | "en_UG" | "en_UM" | "en_US" | "en_VC" | "en_VG" | "en_VI" | "en_VU" | "en_WS" | "en_ZA" | "en_ZM" | "en_ZW" | "eo" | "es" | "es_AR" | "es_BO" | "es_BR" | "es_BZ" | "es_CL" | "es_CO" | "es_CR" | "es_CU" | "es_DO" | "es_EC" | "es_ES" | "es_GQ" | "es_GT" | "es_HN" | "es_MX" | "es_NI" | "es_PA" | "es_PE" | "es_PH" | "es_PR" | "es_PY" | "es_SV" | "es_US" | "es_UY" | "es_VE" | "eu" | "eu_ES" | "fa" | "fa_AF" | "fa_IR" | "fi" | "fi_FI" | "fo" | "fo_DK" | "fo_FO" | "fr" | "fr_BE" | "fr_BF" | "fr_BI" | "fr_BJ" | "fr_BL" | "fr_CA" | "fr_CD" | "fr_CF" | "fr_CG" | "fr_CH" | "fr_CI" | "fr_CM" | "fr_DJ" | "fr_DZ" | "fr_FR" | "fr_GA" | "fr_GF" | "fr_GN" | "fr_GP" | "fr_GQ" | "fr_HT" | "fr_KM" | "fr_LU" | "fr_MA" | "fr_MC" | "fr_MF" | "fr_MG" | "fr_ML" | "fr_MQ" | "fr_MR" | "fr_MU" | "fr_NC" | "fr_NE" | "fr_PF" | "fr_PM" | "fr_RE" | "fr_RW" | "fr_SC" | "fr_SN" | "fr_SY" | "fr_TD" | "fr_TG" | "fr_TN" | "fr_VU" | "fr_WF" | "fr_YT" | "he" | "he_IL" | "hr" | "hr_BA" | "hr_HR" | "hu" | "hu_HU" | "id" | "it" | "it_CH" | "it_IT" | "it_SM" | "it_VA" | "ja" | "ja_JP" | "ko" | "ko_CN" | "ko_KP" | "ko_KR" | "nb_NO" | "nl" | "nl_AW" | "nl_BE" | "nl_BQ" | "nl_CW" | "nl_NL" | "nl_SR" | "nl_SX" | "pa" | "pl" | "pl_PL" | "pt" | "pt_AO" | "pt_BR" | "pt_CH" | "pt_CV" | "pt_GQ" | "pt_GW" | "pt_LU" | "pt_MO" | "pt_MZ" | "pt_PT" | "pt_ST" | "pt_TL" | "ro" | "ro_MD" | "ro_RO" | "ru" | "ru_BY" | "ru_KG" | "ru_KZ" | "ru_MD" | "ru_RU" | "ru_UA" | "sk" | "sk_SK" | "sl" | "sv" | "sv_AX" | "sv_FI" | "sv_SE" | "ta" | "tr" | "tr_CY" | "tr_TR" | "uk" | "uk_UA" | "vi" | "vi_VN" | "zh_CN" | "zh_Hant" | "zh_Hant_TW";
  timezone: string;
  supervisor?: number;
  roles?: "ROLE_TEAMLEAD" | "ROLE_ADMIN" | "ROLE_SUPER_ADMIN"[];
  plainPassword: string;
  plainApiToken?: string;
  enabled?: boolean;
  systemAccount?: boolean;
  requiresPasswordReset?: boolean;
}


export interface UserPreference {
  name: string;
  value?: string;
}



// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — users helper shapes.
// ---------------------------------------------------------------------------

/**
 * The compact projection of a user record (policy §9). Kept: identity and
 * contact fields, locale settings and account state. Dropped: the deprecated
 * credential-shaped `apiToken` marker — the `expand: true` escape hatch returns
 * the full record.
 */
export interface UserSummary {
  id?: number;
  username: string;
  alias?: string;
  title?: string;
  email: string;
  avatar?: string;
  initials?: string;
  language?: string;
  locale?: string;
  timezone?: string;
  accountNumber?: string;
  enabled?: boolean;
  systemAccount?: boolean;
  color?: string;
}

/**
 * The identifier kinds `users.resolve` documents (policy §6): `{ id }` (or a
 * bare number) is a direct fetch; `{ username }` (or a bare non-numeric string)
 * is an exact match over a bounded client scan of the user list.
 */
export type UserIdentifier =
  | { id: number }
  | { username: string }
  | number
  | string;

/**
 * The server-driven filters of `users.search`: the filters the SDK types
 * already declare (`role`/`team`) plus the ones the spec declares on
 * `GET /api/users` (`visible`, `orderBy`, `order`, `term`, `full`). The
 * vendor's user collection takes no `page`/`size`, so `search`'s `limit` is
 * applied to the returned rows, not sent on the wire.
 */
export interface UserSearchParams extends UserListParams {
  /** Visibility status: 1=visible, 2=hidden, 3=all. */
  visible?: string | number;
  /** Sort field: id | username | alias | email. */
  orderBy?: string;
  /** Sort direction: ASC | DESC. */
  order?: string;
  /** Free search term (the spec's `term` filter). */
  term?: string;
  /** Include the full expanded records (the spec's `full` flag). */
  full?: boolean;
}
