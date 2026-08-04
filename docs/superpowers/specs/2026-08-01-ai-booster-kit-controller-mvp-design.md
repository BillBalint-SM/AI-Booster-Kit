# AI Booster Kit Controller MVP Design

**Status:** Implemented bounded local recommendation-only slice; written-spec review remains the source-of-truth check.

**Goal:** Deliver the first executable Controller capability: a local, deterministic Quick Task recommendation that uses the existing `Quick Task Clarifier & Validator` recipe as its canonical source. It must produce a reviewable recommendation without activating Agents, creating artifacts, retaining a session, or accessing external systems.

## Scope and non-goals

The MVP supports one work-item type (`Quick Task`) and one light recipe (`quick-task-clarifier-validator`, version `0.1.0`). It evaluates an explicit local JSON request and an explicit local Markdown recipe, then prints exactly one JSON object.

The MVP does not implement event watching, natural-language interviewing, session persistence, file generation, activation, snapshots, rollback, multi-recipe ranking, workflow-wide recommendations, external reads or writes, OAuth, connectors, or runtime Agent execution. These remain later, independently reviewable slices.

The Controller is advisory and human-centered. It never replaces a User-selected skill or tool, never silently widens scope, and never treats `UNKNOWN` as safe.

## Approaches considered

1. **Pure decision core with a thin local CLI adapter — selected.** The evaluator is deterministic and testable without filesystem, clock, network, or random dependencies. The CLI only handles explicit local reads and JSON serialization.
2. **Persistent Controller first.** Rejected for this slice because it would introduce session retention, state migration, and recovery semantics before the recommendation contract is proven useful.
3. **Dynamic multi-recipe library first.** Rejected because it would simulate selection among recipes that do not yet have validated, machine-readable readiness contracts.

## Architecture

```text
explicit JSON request + canonical Markdown recipe
  -> CLI adapter: local reads and error boundary
  -> strict request parser + strict recipe loader
  -> pure Controller evaluator
  -> one JSON response and exit code
```

The CLI command is `npm run cli -- quick-task --input <explicit-local-file>`. It reads only the named request file and the repository's canonical Quick Task recipe. It creates no file and performs no network or connector operation.

The pure evaluator accepts a validated request and a validated recipe declaration. It does not receive paths, time, random values, environment variables, or I/O adapters. Identical inputs produce identical decisions, reasons, clarifications, and identifiers.

The existing general `parseMarkdownContract` parser is intentionally not extended for this recipe: it validates the separate canonical team-contract format. A focused Controller recipe loader will parse YAML frontmatter with its own strict allowlist. This prevents an unrelated contract format from becoming an ambiguous generic registry.

## Canonical recipe declaration

`contract/agent-library/quick-task-clarifier-validator.md` remains the sole recipe source. Its YAML frontmatter will gain a versioned `controller` declaration that contains only machine-relevant constraints:

- supported work-item type;
- eligible complexity values;
- `LOCAL_ONLY` execution boundary;
- required DoR declarations;
- recipe status and recommendation-only authority.

The loader rejects unknown, missing, malformed, or incompatible controller metadata. It will not infer requirements from prose. The prose contract remains the human-readable explanation and must remain consistent with the declaration.

## Request contract

The input is a closed JSON object with `requestVersion: "1.0"`. Unknown properties are invalid.

Required fields are:

- `workItemType: "Quick Task"`;
- non-empty `goal`;
- non-empty `outcomeOwner`;
- `complexity: "LOW" | "MEDIUM" | "HIGH"`;
- `executionBoundary: "LOCAL_ONLY"`.

Optional DoR declarations are `value`, `context`, `relations`, `dependencies`, and `preferences`. They are optional at the syntax layer so that a valid but incomplete request can receive a `PREPARE` result. Their representation distinguishes a named value or relation from explicit absence and `UNKNOWN`; the evaluator never converts absence into an invented value.

`preferences` may explicitly select `NO_AGENT` or `CUSTOM_TOOL`. An omitted preference means no explicit override; it does not authorize the Controller to activate anything.

## Decision and impact contract

`decision` and `impact` are independent:

- `decision`: `RECOMMEND`, `PREPARE`, `NO_AGENT`, `NO_FIT`, or `STOPPED`;
- `impact`: `COMPATIBLE`, `DEGRADED`, `BREAKING`, or `UNKNOWN`;
- `requiresAcknowledgement`: `true` when the proposed continuation is degraded, breaking, or unknown.

Evaluation rules for this single recipe are explicit:

- a structurally valid request with incomplete DoR yields `PREPARE` and `requiredClarifications` entries containing field path, rationale, severity, and decision impact;
- `HIGH` complexity yields `NO_FIT`; any execution boundary other than `LOCAL_ONLY` violates the input contract and yields `STOPPED`;
- a complete low- or medium-complexity local Quick Task yields `RECOMMEND` with `COMPATIBLE` impact;
- an explicit no-Agent choice yields `NO_AGENT`; a custom-tool choice has priority and is `UNKNOWN` unless compatible evidence is supplied;
- a malformed request, invalid recipe declaration, incompatible recipe status, or violated safety boundary yields `STOPPED` with no partial recommendation.

The Controller does not guess whether a custom tool is compatible. `UNKNOWN` remains visible and requires acknowledgement before an affected continuation may proceed.

## Response and identifiers

Every invocation writes one JSON object to standard output. A successful recommendation response contains the decision, impact, acknowledgement requirement, concise reasons, optional clarifications, recipe identity, and identifiers.

The MVP emits two SHA-256-derived correlation values:

- `requestFingerprint` is derived from a canonical serialization of the complete normalized request. It supports local reproducibility but is not stored by the MVP.
- `patternId` is derived only from non-sensitive structural attributes: work-item type, recipe identity and version, decision, impact, complexity, and relation/dependency categories. It supports future search and aggregation without including raw goal or context text.

The response also includes a recipe signature derived from the recipe identity, version, and controller declaration. A run outcome signature is deliberately deferred because the MVP does not execute or close a session.

No raw request, transcript, credential, token, arbitrary payload, or persistent index is written by the Controller.

## Error and exit-code contract

The command is fail-closed and does not write a partial recommendation. Its JSON error body contains a stable error code, a safe actionable message, and a field path when relevant; it never contains an exception stack or sensitive input.

| Condition | Decision | Exit code |
| --- | --- | --- |
| `RECOMMEND` or `NO_AGENT` | Valid completed evaluation | `0` |
| `PREPARE` or `NO_FIT` | Valid evaluation, no direct recommendation to run | `2` |
| `STOPPED` | Invalid request/recipe or safety boundary | `3` |
| Invalid command syntax or unreadable explicit input path | `STOPPED` configuration error | `4` |

Standard error is reserved for process-level diagnostics only; the machine-readable result remains the one JSON object on standard output.

## Verification

Tests use synthetic, secret-free fixtures and establish behavior rather than static wording:

- the same normalized request and recipe yield identical decision, identifiers, and clarification order;
- a complete eligible Quick Task yields `RECOMMEND`;
- each incomplete DoR declaration yields a targeted `PREPARE` clarification;
- high complexity yields `NO_FIT`, while a non-local execution boundary fails closed as `STOPPED`;
- no-Agent and custom-tool preferences preserve user choice, surface `UNKNOWN` where evidence is absent, and require acknowledgement where appropriate;
- malformed JSON, blank required fields, unknown request properties, unsupported enum values, and malformed or unknown recipe metadata fail closed as `STOPPED`;
- CLI smoke tests prove one JSON output, expected exit code, and no generated session/output artifact.

After the narrow tests pass, the implementation must run `npm run lint`, `npm run build`, `npm run check:docs`, `npm test`, and `git diff --check`. External capability, Agent activation, and durable pattern indexing remain `NOT EXECUTED`.

## Acceptance criteria

- A developer can call one explicit local command with one valid input file and obtain a deterministic, reviewable recommendation JSON.
- The recipe declaration is the only machine-readable source of recipe eligibility; no duplicate registry is introduced.
- `PREPARE`, `NO_FIT`, `NO_AGENT`, `STOPPED`, and `UNKNOWN` remain distinct and machine-readable.
- A custom tool is never displaced, and unsafe or unknown continuation requires clear acknowledgement.
- The command has no external side effect, session retention, activation, or generated artifact.
- Positive, negative, malformed-input, malformed-recipe, and CLI-boundary behavior are independently tested.
