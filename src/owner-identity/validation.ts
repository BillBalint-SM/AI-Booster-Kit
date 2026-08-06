import { EMPTY_OWNER_ACTOR } from "./types.js";
import type { OwnerAliasInvalidReason, OwnerAliasValidationResult } from "./types.js";

const credentialPattern = /^(?:gh[pousr]_|github_pat_|glpat-|sk-(?:proj-)?|xox[baprs]-|AKIA)[A-Za-z0-9_-]+$/iu;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/u;
const ipv6Pattern = /^(?=.*:)[0-9A-F:]+$/iu;
const pathPattern = /^(?:[A-Za-z]:|\.{1,2}(?:$|[\\/])|~(?:$|[\\/]))/u;

export function validateOwnerAlias(input: string): OwnerAliasValidationResult {
  const ownerAlias = input.trim();
  const reason = invalidReason(ownerAlias);
  if (reason !== null) return { status: "INVALID", reason };
  return { status: "VALID", ownerAlias };
}

function invalidReason(ownerAlias: string): OwnerAliasInvalidReason | null {
  if (ownerAlias === "") return "OWNER_ALIAS_EMPTY";
  if (ownerAlias.localeCompare(EMPTY_OWNER_ACTOR, undefined, { sensitivity: "accent" }) === 0) return "OWNER_ALIAS_RESERVED";
  if ([...ownerAlias].length > 64) return "OWNER_ALIAS_TOO_LONG";
  if (/[\p{Cc}\p{Zl}\p{Zp}]/u.test(ownerAlias)) return "OWNER_ALIAS_CONTROL_CHARACTER";
  if (/[\\/]/u.test(ownerAlias)) return "OWNER_ALIAS_PATH_SEPARATOR";
  if (emailPattern.test(ownerAlias)) return "OWNER_ALIAS_EMAIL_LIKE";
  if (ipv4Pattern.test(ownerAlias) || ipv6Pattern.test(ownerAlias)) return "OWNER_ALIAS_IP_LIKE";
  if (pathPattern.test(ownerAlias)) return "OWNER_ALIAS_PATH_LIKE";
  if (credentialPattern.test(ownerAlias)) return "OWNER_ALIAS_CREDENTIAL_LIKE";
  return null;
}
