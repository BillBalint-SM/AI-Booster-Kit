# Foundation Reset document migration record

**Status:** Completed local review state.

**Base revision:** `dda758b3c729c364126285f171a0414fc6d635c3`

## Preservation rule

This record preserves why each prior document remains, changes, or leaves
default routing. The Foundation Reset does not delete or relocate a legacy
document. A rewritten document's pre-reset content remains recoverable at the
base revision named above; an archived document stays at its current path and
is simply removed from default agent routing.

## Classification

| Path | Classification | Canonical successor or reason to retain | Default agent context after reset | Preservation evidence |
| --- | --- | --- | --- | --- |
| `AGENTS.md` | `rewrite` | Short canonical host-agnostic router | Always-loaded repository guidance | Pre-reset `AGENTS.md` at base revision |
| `CLAUDE.md` | `rewrite` | Thin Claude projection retaining the context-integrity gate | Claude-only projection | Pre-reset `CLAUDE.md` at base revision |
| `README.md` | `rewrite` | Human/GitHub entry point to canonical sources | Human entry point only | Pre-reset `README.md` at base revision |
| `docs/project/roadmap.md` | `rewrite` | Ordered v1 execution view derived from `VISION.md` | Read for ordered milestones only | Pre-reset roadmap at base revision |
| `docs/project/documentation-map.md` | `rewrite` | Canonical question-to-source navigation map | Read for source routing | Pre-reset documentation map at base revision |
| `docs/project/current-state.md` | `rewrite` | Exact current local delivery route | Read for status, handoff, milestone-dependent work, or external-target decisions | Pre-reset current state at base revision |
| `NOTES.md` | `archive` | `CONTEXT.md` is the active glossary | Never default context | Remains in place; full text at base revision |
| `docs/project/terminology-normalization-table.md` | `archive` | Historical normalization evidence; `CONTEXT.md` owns settled language | Never default context | Remains in place; full text at base revision |
| `docs/operations/agent-operating-model.md` | `retain` | Detailed common operating model referenced by `AGENTS.md` | Read before substantive work | Unchanged at base revision |
| `docs/operations/host-adapters/` | `retain` | Host-specific operational detail | Read only for relevant host work | Unchanged at base revision |
| `contract/` | `retain` | Product and capability-specific contracts | Read only when a task touches the named contract | Unchanged at base revision |
| `workflows/` | `retain` | Recurring workflow definitions | Read only for the named workflow | Unchanged at base revision |
| `docs/superpowers/specs/` and `docs/superpowers/plans/` | `retain` | Reviewed intent and execution history | Not default context; read only by referenced work | Existing records remain in place |
| `docs/history/` | `retain` | Historical evidence | Never default context | Existing archive remains in place |

## Audit result

The source-ownership audit found no active duplicate owner for the vision or
v1 gate: both occur only in `VISION.md` outside reviewed plans, historical
evidence, and marketing material. Root `DOMAIN.md` and `CONTEXT.md` are the
canonical product-boundary and glossary sources. `docs/agents/domain.md` and
`docs/operations/jira-git-confluence-adapter.md` are separately scoped
consumer and adapter documents, not competing product-domain owners.

`NOTES.md` appears in the active documentation map only to state that it is
not default context; the terminology-normalization table is likewise absent
from normal routing. Every classified row has a successor or retain reason,
a default-context decision, and base-revision preservation evidence.
