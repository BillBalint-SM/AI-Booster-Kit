# Owner Identity v1

Owner Identity is a host-independent, non-authoritative display-alias capability. It supplies an attribution snapshot for new events; it is not authentication, authorization, professional ownership, or evidence of an external identity.

## Trigger and continuation

The canonical v1 trigger is the first actual platform start. In this baseline that means exactly `recommend-formation --input <path>`. Help, version, malformed commands, and the explicit `owner-identity setup` and `owner-identity reconfigure` commands do not trigger the pre-session prompt. Installer-triggered setup is not implemented.

The pre-session gate never hard-stops the normal session. A missing, cancelled, empty, invalid, conflicting, or unavailable identity continues with the reserved actor marker `Alias empty`. Missing or empty input is not persisted, so a later platform start may prompt again. A valid stored profile is reused without prompting.

## Storage path and schema

Windows v1 stores the profile at exactly `%LOCALAPPDATA%\AI Booster Kit\owner-identity.json`. The environment and host platform are explicit resolver inputs. macOS and Linux are future hosts and return `UNAVAILABLE`; there is no repository fallback or silent migration.

The UTF-8 JSON document contains exactly these fields:

```json
{
  "version": 1,
  "ownerAlias": "display alias"
}
```

Only version `1` is accepted. Malformed JSON, extra or missing fields, an invalid stored alias, and unknown versions are preserved and reported with logical non-echoing reason codes. A later valid setup may replace an invalid profile.

The storage factory receives both the resolved target and the explicit user-local root, and rejects every target other than that root's exact `AI Booster Kit/owner-identity.json` path. Persistence creates only this resolved user-local parent path, rejects traversal and directory, symlink, or non-regular targets, writes and flushes a temporary file in the same directory, and atomically renames it into place. A failed replacement preserves the original profile. A bounded same-directory filesystem lock coordinates concurrent processes: lock contention reports `UNAVAILABLE`; once acquired, same-content writes reuse the stored profile and different-content setup writes return `CONFLICT`.

## Alias validation and privacy

Validation trims leading and trailing whitespace and preserves Unicode, case, accents, internal spaces, hyphens, and underscores. The trimmed alias must contain 1 to 64 Unicode code points. Controls, newlines, tabs, path separators, obvious email, IP, path, credential, or token patterns, and the reserved `Alias empty` marker are rejected.

Rejected raw values and absolute user-local paths never appear in errors, logs, telemetry, or status output. A validated alias exists only in the persisted profile and the current in-memory attribution snapshot; rejected prompt input remains transient. The profile does not store provider, subscription, machine, repository, email, IP, token, credential, or other sensitive identifiers.

## Status and command contract

- `SET` maps to exit `0`.
- `EMPTY` maps to exit `2`.
- `INVALID`, `CONFLICT`, and `UNAVAILABLE` map to exit `3`.
- Malformed command arguments map to exit `4`.
- The normal pre-session command continues after every identity status.

CLI output may expose only logical status and next action. Explicit setup and reconfigure accept interactive input only; `--alias` and environment-variable alias input are forbidden. Valid input saves immediately. Reconfigure changes future snapshots only, and a failed reconfigure preserves the prior profile and current actor snapshot.

## Non-goals

Owner Identity does not change `src/controller/identity.ts`, rewrite historical events, grant authority, configure credentials, identify a machine or repository, provide macOS/Linux storage paths, or implement installer integration. The host-independent core remains independent of process stdin and CLI dispatch; the baseline CLI provides that runtime adapter.
