# G2AS Sandbox Readiness Certificate Design

**Status:** User-approved design; awaiting written-spec review before implementation planning

**Design date:** 2026-07-29

## Goal

Produce one reproducible, read-only readiness decision for the approved synthetic
sandbox chain:

- Jira Cloud: `https://pte-politechnika.atlassian.net`, project key `G2AS`;
- Confluence: the `G2AS` space on the same tenant;
- GitHub: `BillBalint-SM/ultimate-longshot-gate2-sandbox`.

The deliverable is a timestamped Markdown certificate plus an equivalent JSON
record. Its only terminal states are `READY`, `NOT READY`, and `STOPPED`. It
does not activate sync, correct external state, authenticate interactively,
expand scope, retry broadly, or write to any external system.

## Scope

### In scope

- An explicit, secret-free target manifest for the one G2AS sandbox chain.
- Read-only discovery of Jira, Confluence, and GitHub stable identity evidence.
- Verification of the frozen synthetic traceability chain:
  - Jira work item `G2AS-1`;
  - Git commit `d0971f75c526250f9ee65b8b3b044a4788b31a46`;
  - repository fixtures `docs/fixtures/G2AS-1.md` and
    `docs/fixtures/G2AS-1.json`;
  - Confluence projection page ID `31752193`.
- Deterministic evidence normalization, redaction, readiness evaluation, and
  Markdown/JSON certificate rendering.
- Local fixture tests for `READY`, `NOT READY`, and `STOPPED`.
- One separately approved real, read-only G2AS execution after the local test
  suite passes.

### Out of scope

- Jira, Confluence, GitHub, Rovo, REST, MCP, browser, or OAuth write actions.
- Force-login, interactive OAuth setup, credential persistence, permission
  changes, workflow changes, deletion, correction, or sync activation.
- Production targets, real business data, broad tenant searches, and raw
  transcript collection.
- Treating a normal host or connector response as proof of target isolation.

## Architecture

The certificate generator is a small, domain-specific layer above the existing
contract-first orchestrator. It reuses target identity validation, evidence
redaction, stop semantics, and host capability declarations, but it has no
projection or mutation path.

```text
G2AS target manifest
        |
        v
Read-only source adapters (Jira, Confluence, GitHub)
        |
        v
Normalized evidence records with fingerprints
        |
        v
Readiness evaluator
        |
        +--> certificate.json
        +--> certificate.md
```

The source adapters are independent. Each reports a normalized observation,
the exact target identity it observed, the read path used, a capability state,
and safe evidence references. They never receive a generic search query or a
write-capable operation.

## Target manifest

The checked-in manifest contains no credentials, session values, personal data,
or unbounded selectors. It names only the allowed target and frozen evidence:

| Area | Required assertion |
| --- | --- |
| Jira | HTTPS tenant origin, project key `G2AS`, discovered stable project ID, one exact work-item key `G2AS-1`, and expected `To Do` Board status. |
| Confluence | HTTPS tenant origin, space key `G2AS`, discovered stable space ID, exact projection page ID `31752193`, and references to `G2AS-1` plus the exact Git commit. |
| GitHub | Full repository name, discovered repository ID, branch `main`, exact full Git SHA, and exactly the two named fixture paths. |
| Traceability | Exact native Jira-to-Git web-link and Confluence-to-Jira/Git references for the same identities. |

The first successful read records discovered stable IDs into the certificate;
it does not silently rewrite the target manifest. A different, missing, or
ambiguous identity is evidence of `NOT READY` or `STOPPED`.

## Read-only execution policy

For each source, the runtime selects only a declared read-only path:

1. tenant-bound MCP read, when it can prove the exact target;
2. the existing tenant-aware Chrome read fallback for only the missing
   read-only evidence;
3. otherwise an `unknown` observation.

No path may force login, open a write form, widen its tenant/project/space/
repository scope, or retry a failed request with a different target. Before
each read, the adapter validates the expected origin and identity. A timeout
allows one identical read-back attempt; a second unknown result stops that
source check.

## Evidence and certificate schema

Each normalized check contains:

- `name` and source (`jira`, `confluence`, `github`, or `traceability`);
- `state`: `verified`, `unknown`, or `mismatch`;
- expected and observed stable identity fingerprints;
- read path and host-capability state;
- safe evidence references and timestamps;
- a redacted diagnostic classification;
- the smallest safe next action.

For Jira and Confluence, the normalized identity evidence must carry the full
credential-free HTTPS `tenantOrigin`, not only a hostname. The traceability
observation must carry both the native reference IDs and their resolved
destinations: the Git SHA reached by the Jira link, the Jira key reached by
the Confluence Jira reference, and the Git SHA reached by the Confluence Git
reference. A non-empty reference ID alone is never sufficient to verify the
frozen traceability chain.

The rendered certificate contains the target manifest digest, all check rows,
the overall decision, zero external writes, correlation ID, run timestamp, and
an ordered remediation list. It must not contain credentials, authorization
headers, session identifiers, raw page bodies, raw MCP payloads, arbitrary
URLs, or private transcripts.

## Readiness decision

- `READY`: every required Jira, Confluence, GitHub, and traceability check is
  `verified`; all targets are exact and every read path is declared read-only.
- `NOT READY`: the run completed safely, but at least one required check is
  `unknown` or `mismatch`.
- `STOPPED`: a hard safety condition occurred: wrong or ambiguous target,
  unverifiable credential/scope, capability that cannot be proved, broadening
  request, forbidden path, or unknown state after the allowed identical
  read-back.

`STOPPED` is an internal safety decision, never a Jira workflow status. The
certificate must name the unchanged systems, impact, risk, recommended action,
and the bounded `Continue` or `Stop` decision options when continuation is
permitted. Hard stops expose `Stop` only.

## Acceptance criteria

1. The generator accepts only the literal G2AS target manifest and rejects an
   additional target, wildcard, credential-bearing URL, or unsupported field.
2. Local fixtures reproduce `READY`, `NOT READY`, and every hard-stop class
   without external I/O.
3. A target mismatch prevents credential resolution and any network request.
4. JSON and Markdown render the same overall state, normalized checks, and
   safe evidence fingerprints.
5. The output contains an explicit external-write counter equal to zero.
6. The live G2AS run uses only approved read paths and produces a timestamped
   certificate even when the terminal state is `NOT READY` or `STOPPED`.
7. A reviewer can identify the exact missing or mismatching evidence and the
   next smallest safe action without reading raw runtime output.

## Verification

Run the narrow fixture suite first, then the repository lint and full test
suite. Verify generated JSON against its schema, compare it with the Markdown
renderer, and inspect output for unsafe values. The separately approved live
run is read-only and must be reported as an observed result, not inferred from
fixture success. A `READY` certificate establishes sandbox-readiness evidence
only; it does not authorize a subsequent write or enable continuous sync.

## Risks and controls

| Risk | Control |
| --- | --- |
| Connector resolves the wrong Atlassian tenant | Bind every adapter to the exact origin and stable ID; stop before credential or request. |
| Missing MCP coverage encourages a broad browser search | Use the tenant-aware read adapter only for the named missing evidence. |
| A benign host response is mistaken for scope proof | Record capability as `unknown` unless exact target binding is evidenced. |
| Sensitive content leaks into the certificate | Normalize to fingerprints and approved native IDs only; test redaction paths. |
| `NOT READY` is mistaken for a failure needing auto-fix | Render explicit no-write recovery guidance and keep remediation outside this unit. |

## Implementation boundary

This specification authorizes only implementation planning. It does not
authorize a live read, OAuth configuration, connector installation, external
write, or credential change. The live certificate run requires a separate,
explicit read-only execution approval after the implementation is reviewed.
