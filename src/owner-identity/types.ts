export const EMPTY_OWNER_ACTOR = "Alias empty" as const;

export interface OwnerIdentityProfile {
  version: 1;
  ownerAlias: string;
}

export type OwnerAliasInvalidReason =
  | "OWNER_ALIAS_EMPTY"
  | "OWNER_ALIAS_RESERVED"
  | "OWNER_ALIAS_TOO_LONG"
  | "OWNER_ALIAS_CONTROL_CHARACTER"
  | "OWNER_ALIAS_PATH_SEPARATOR"
  | "OWNER_ALIAS_EMAIL_LIKE"
  | "OWNER_ALIAS_IP_LIKE"
  | "OWNER_ALIAS_PATH_LIKE"
  | "OWNER_ALIAS_CREDENTIAL_LIKE";

export type OwnerIdentityInvalidReason =
  | OwnerAliasInvalidReason
  | "OWNER_IDENTITY_JSON_INVALID"
  | "OWNER_IDENTITY_SCHEMA_INVALID"
  | "OWNER_IDENTITY_VERSION_UNSUPPORTED";

export type OwnerIdentityUnavailableReason =
  | "OWNER_IDENTITY_HOST_UNSUPPORTED"
  | "OWNER_IDENTITY_LOCAL_PATH_MISSING"
  | "OWNER_IDENTITY_TARGET_INVALID"
  | "OWNER_IDENTITY_STORAGE_UNAVAILABLE"
  | "OWNER_IDENTITY_PROMPT_UNAVAILABLE";

export type OwnerAliasValidationResult =
  | { status: "VALID"; ownerAlias: string }
  | { status: "INVALID"; reason: OwnerAliasInvalidReason };

export type OwnerIdentityPathResult =
  | { status: "AVAILABLE"; path: string }
  | { status: "UNAVAILABLE"; reason: OwnerIdentityUnavailableReason };

export type OwnerIdentityReadResult =
  | { status: "MISSING" }
  | { status: "SET"; profile: OwnerIdentityProfile }
  | { status: "INVALID"; reason: OwnerIdentityInvalidReason }
  | { status: "UNAVAILABLE"; reason: OwnerIdentityUnavailableReason };

export type OwnerIdentityWriteResult =
  | { status: "SET"; profile: OwnerIdentityProfile; persistencePerformed: boolean }
  | { status: "INVALID"; reason: OwnerAliasInvalidReason; persistencePerformed?: false }
  | { status: "CONFLICT"; reason: "OWNER_IDENTITY_WRITE_CONFLICT"; persistencePerformed?: false }
  | { status: "UNAVAILABLE"; reason: OwnerIdentityUnavailableReason; persistencePerformed?: false };

export interface OwnerIdentityStorage {
  read(): Promise<OwnerIdentityReadResult>;
  save(ownerAlias: string): Promise<OwnerIdentityWriteResult>;
  replace(ownerAlias: string): Promise<OwnerIdentityWriteResult>;
}

export type OwnerIdentityState =
  | { status: "SET"; actor: string; prompted: boolean }
  | { status: "EMPTY"; actor: string; prompted: true }
  | { status: "INVALID"; actor: string; prompted: true; reason: OwnerAliasInvalidReason }
  | { status: "CONFLICT"; actor: string; prompted: true; reason: "OWNER_IDENTITY_WRITE_CONFLICT" }
  | { status: "UNAVAILABLE"; actor: string; prompted: boolean; reason: OwnerIdentityUnavailableReason };

export type OwnerIdentityPrompt = () => Promise<string | null>;
