---
document_type: design_specification
status: APPROVED_PENDING_WRITTEN_REVIEW
language_version: 1.0.0
source_revision: b9f185e825a5c942d0a48a417629b6b8c3e31ac4
---

# Platform Language Unification Design

## Purpose

Establish one stable, English-only language standard for AI Booster Kit. The
standard must make active documentation, contracts, runtime types, generated
documents, and tests use the same concepts without silent aliases or
untracked terminology drift.

## Authority and retention

`docs/project/platform-language.md` is the single canonical language source.
It contains a small machine-readable YAML frontmatter and concise human
definitions. It is not a migration ledger, runtime specification, or working
table.

The Platform Language frontmatter contains the terminology policy consumed by
the consistency gate: the canonical terms, deprecated active terms, declared
status axes, and the explicit native-Jira mapping boundary. The human sections
below it remain the sole complete definitions; the policy does not duplicate
their prose.

`NOTES.md` and `docs/project/terminology-normalization-table.md` are removed
after their accepted content is transferred. Active sources link directly to
the Platform Language source. History preserves the terminology and factual
claims valid at the time of its record; only structural links may be repaired.

## Metadata standard

Every canonical, generated, or machine-checked Markdown document uses YAML
frontmatter. The common fields are:

```yaml
document_type: <declared type>
status: <declared lifecycle or evidence state>
language_version: 1.0.0
```

Generated documents additionally declare `generated_from`, `source_revision`,
and `generated_at`. Short human navigation documents use frontmatter only when
a generator or CI rule consumes it. Historical evidence is not retrofitted
solely for metadata conformity.

## Canonical delivery language

The delivery hierarchy is:

```text
Vision -> Roadmap -> Milestone -> Epic -> Work Item
```

A Work Item is exactly a Story, Task, or Bug. A Feature is an Epic's
realizable functional value, not a hierarchy level. Every Epic has exactly one
primary Feature. Additional Features are exceptional and require an explicit
reason.

## Work Artifact and Handoff language

Work Artifact is a broad group term for documentation, findings, and
Platform-managed elements belonging to a hierarchy element, a plan, or the
Platform. Plans, specifications, and Handoffs are Work Artifact kinds.

Handoff is the common term for the following versioned, stable-ID
Specifications:

```text
Milestone_Specification
Epic_Specification
Feature_Specification
Story_Specification
Task_Specification
Bug_Specification
```

The former `CanonicalWorkArtifact` is replaced by
`Milestone_Specification`. The former separate `HandoffPacket` name is
retired.

## Status model

Each status has one named axis and may not be used as an unqualified generic
`status` value.

| Axis | Allowed values | Meaning |
| --- | --- | --- |
| `platform_delivery_status` | `NOT_STARTED`, `IN_PROGRESS`, `UNDER_SPECIFICATION`, `DONE` | Internal delivery lifecycle. |
| `platform_session_status` | `NEW`, `RESUMABLE`, `DONE`, `STOPPED` | Session lifecycle. |
| `session_resolution` | `UNKNOWN`, `CONFLICT`, `SCOPE_CHANGED` | Evaluated session result or condition. |
| `readiness_status` | `PROPOSED`, `CONFIRMED`, `READY_WITH_LIMIT`, `READY_FOR_FAN_IN` | Decision and fan-in readiness. |
| `execution_status` | `NOT_EXECUTED`, `PARTIAL`, `COMPLETE_WITH_LIMIT` | Actual execution state and limit. |
| `observed_behavior` | `PASS`, `FAIL`, `UNKNOWN` | Observed verification result. |
| `revision_status` | `DRAFT`, `ACCEPTED`, `STALE`, `SUPERSEDED` | Versioned record validity. |
| `jira_board_status` | Project-profile mapped native value | Optional external Jira projection only. |

`SCOPE_CHANGED` is set only after an explicit scope-change decision exists. It
records a completed change; it is not a request to change scope. The prior
record remains preserved and the new scope and acceptance boundary require
evaluation.

## Runtime behaviour

The runtime models the concrete types that have behaviour; it does not create
one mandatory polymorphic Work Artifact object merely because Work Artifact is
a group term.

An Epic without a primary Feature, or with an additional Feature without a
reason, produces a required Feature refinement session. The runtime must not
invent a Feature or reason. If the Epic has not started, it remains
`NOT_STARTED`; if it has started but lacks a successful, current
Specification, it is `UNDER_SPECIFICATION`.

`IN_PROGRESS` means work is actively proceeding. `DONE` requires an accepted
Specification, confirmed Features, accepted Work Items, acceptance evidence,
and final acceptance.

Jira is not part of the Platform core lifecycle. A Project Profile may map a
canonical Platform delivery status to a project-native Jira value, for example
`DONE` to `Done`. Missing or incomplete mappings fail closed. No part of this
work performs external Jira, GitHub, or other writes.

## Drift prevention

A terminology consistency gate reads the metadata and policy in
`platform-language.md`. It validates required metadata, language versions,
deprecated active terminology, invalid status values, and missing direct
references. Historical content is excluded from wording checks.

The gate rejects new active use of bare internal `Done`, `BoardStatus`,
`CanonicalWorkArtifact`, `HandoffPacket`, and `SCOPE_CHANGE` after the runtime
migration. A native Jira label such as `Done` is permitted only as a declared
`jira_board_status` mapping. Before the runtime migration is complete,
explicitly named, test-covered legacy exceptions are temporary and visible.

A language change is valid only when the Platform Language source, every
active use, and the gate/test rule change together in one reviewed delivery
slice.

## Migration slices

### Slice 1: Language Foundation

Create the Platform Language source and terminology gate; normalize active
human-facing documentation, contracts, Scenario Contracts, operations,
runbooks, marketing, and website copy; update active direct references; and
remove `NOTES.md` and the working terminology table after transfer. Keep
legacy runtime terms only through bounded, explicit gate exceptions.

### Slice 2: Runtime Terminology

Replace affected runtime types, schemas, validators, CLI paths, fixtures, and
tests with the Specification, Feature refinement, status-axis, and optional
Jira-projection model. Remove the Slice 1 legacy exceptions.

## Acceptance and stop conditions

Completion requires one active language source, no deprecated active terms,
valid generated-document provenance, positive and negative validation tests,
and passing lint, test, documentation, and terminology gates.

Stop before a change that would alter historical facts, invent a Feature or
scope decision, use an incomplete Jira mapping, or perform an external write.
