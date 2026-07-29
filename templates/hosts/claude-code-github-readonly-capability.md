---
capabilityId: github-readonly-evidence-v1
capabilityVersion: 1
targetHost: claude-code
scopeFingerprint: 695a5559f89ecb1856e699e6a9f3ba182af4ec8d6b7b0c724e7e071bd8741eb7
---
# Native GitHub read-only capability

Intended instruction surface: CLAUDE.md. This is a declarative host projection, not executable configuration.

## Approved read operations
- repository.read
- branch.read
- commit.read
- path.read

## Prohibited operations
- write
- merge
- issue
- pull_request
- permission
- configuration
- credential

## Normalized evidence
Report only the capability ID, version, host, scope fingerprint, and verified or unknown state.

## Required Confluence link
The GitHub reference kind must be smart_link.

## Stop protocol
Stop when the target, scope, capability evidence, or native link is absent, unknown, drifting, or mismatched. Preserve local evidence and choose Stop; never broaden scope.
