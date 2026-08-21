# Module and Flow Reference

## Product interface

The public composition seam is the pure `composeFlow(request)`
interface in [`src/flow/compose.ts`](../../src/flow/compose.ts). The companion
progress seam is the pure
`assessFlow({ assessmentVersion, request, receipts })` interface in
[`src/flow/assurance.ts`](../../src/flow/assurance.ts). Both CLIs are thin local
adapters: they read one JSON file, call the same interface used by tests, and
write one JSON result to standard output.

```text
JSON request
  → CLI adapter
    → composeFlow (owns canonical normalized contracts)
      → reviewable Module or Flow package

request + receipts
  → CLI adapter
    → assessFlow (re-composes through composeFlow)
      → next safe stage or receipt-backed Handoff
```

Neither interface dispatches a process, invokes a connector, mutates execution
storage, creates an artifact file, or performs an external action. This keeps
the implementation inside the [Vision Contract](../../VISION.md) non-goals
while making module selection, composition, and safe continuation usable.

## Canonical mapping

| User module | Purpose | Canonical recipe | Output |
| --- | --- | --- | --- |
| `plan` | Resolve scope, acceptance, and decisions. | `bounded-refinement` | `refined-scope`, `acceptance-criteria`, `decision-record` |
| `implement` | Produce a bounded local change from an accepted plan. | `bounded-implementation` | `reviewable-diff`, `test-evidence`, `residual-risk-record` |
| `test` | Verify observable behavior. | `bounded-validation` | `validation-result`, `evidence-map`, `explicit-stop-or-pass` |
| `review` | Independently check scope, evidence, limits, and handoff readiness. | `bounded-validation` | `validation-result`, `evidence-map`, `explicit-stop-or-pass` |

`test` and `review` are distinct user selections with different purposes and
continuations. In v1 they adapt the same deep validation recipe because their
input, evidence, terminal-state, and recovery contract is identical. A new
recipe seam should be introduced only when their observable contracts truly
diverge.

The authoritative recipe sources are:

- [`bounded-refinement`](../../contract/agent-library/bounded-refinement.md)
- [`bounded-implementation`](../../contract/agent-library/bounded-implementation.md)
- [`bounded-validation`](../../contract/agent-library/bounded-validation.md)

## Request contract

Every request has exactly these top-level fields:

| Field | Contract |
| --- | --- |
| `requestVersion` | Literal `1.0`. |
| `selection` | `{ "kind": "module", "module": "plan|implement|test|review" }` or `{ "kind": "flow", "flow": "default-change" }`. |
| `objective` | Non-empty human-owned outcome. It supplies the recipe `goal` where required. |
| `inputs` | Only the selected module or Flow's declared external inputs. Unknown fields are rejected. |
| `unknowns` | Unique declared input names that are unresolved. A field cannot be both supplied and unknown. |

String inputs must be non-empty. Collection inputs are arrays of unique,
non-empty strings; an empty array is an explicit known-empty value.

### Independent module inputs

| Module | Required `inputs` fields |
| --- | --- |
| `plan` | `current-scope`, `constraints`, `open-questions` |
| `implement` | `repository`, `repository-state` (`VERIFIED`), `acceptance-criteria`, `test-strategy`, `accepted-plan` (`ACCEPTED`), `rollback-boundary` |
| `test` | `claim`, `acceptance-criteria`, `evidence-sources`, `known-limits` |
| `review` | `claim`, `acceptance-criteria`, `evidence-sources`, `known-limits` |

### Default Flow inputs

`default-change` requires `current-scope`, `constraints`, `open-questions`,
`repository`, `repository-state`, `test-strategy`, `rollback-boundary`, and
`known-limits`. Its supplied `repository-state` must be `VERIFIED`; the Flow's
`accepted-plan` is supplied only by the `USER_ACCEPTS_PLAN` checkpoint.

The composer binds outputs instead of requiring future artifacts up front:

| Consumer input | Binding |
| --- | --- |
| Implementation `acceptance-criteria` | Plan output |
| Implementation `accepted-plan` | `USER_ACCEPTS_PLAN` checkpoint |
| Test `claim` and `evidence-sources` | Implementation outputs |
| Review `claim` | Implementation output |
| Review `evidence-sources` | Test validation result |

## Package contract

Every package states its kind, selection, objective, status, modules, human
checkpoints, handoff contract, unknowns, stop reasons, and next action. Both the
package and every module packet state:

- `executionBoundary: LOCAL_ONLY`;
- `authority: RECOMMENDATION_ONLY`;
- `executionPerformed: false`.

Each module packet copies the canonical recipe's required input, expected
output, acceptance criteria, evidence requirements, unknown policy, and stop
conditions. `inputBindings` identify the request, objective, predecessor
artifact, or checkpoint that supplies each input without copying arbitrary
input values into the package.

The public interface owns the normalized recipe contracts, including required
input, outputs, evidence, recovery, local authority, and unknown policy. A
caller cannot supply a weakened, widened, or foreign recipe. The verification
suite loads the authoritative recipe documents and compares every projected
contract field with the module-owned values, so drift fails visibly.

The package declares that a terminal Handoff must contain objective/status,
artifacts/evidence, decisions/unknowns, and limits/next action. It permits
`COMPLETE`, `COMPLETE_WITH_LIMIT`, `STOPPED`, and `UNKNOWN`, and requires a
fresh readback. `assessFlow` validates Stage and Checkpoint receipts against
that declaration and produces the actual Handoff projection; see
[Flow Assurance](flow-assurance.md).

## Optional continuation

The recommendation at the end of each independent module is:

| Completed module | Suggested continuation |
| --- | --- |
| `plan` | `implement` |
| `implement` | `test` or `review` |
| `test` | `review` or `handoff` |
| `review` | `handoff` |

These are recommendations, not a mandatory chain. The User may choose another
module or stop.

## Verification seam

Caller and test behavior crosses the same `composeFlow` and `assessFlow`
interfaces. Focused coverage lives in
[`test/flow-compose.test.ts`](../../test/flow-compose.test.ts),
[`test/flow-assurance.test.ts`](../../test/flow-assurance.test.ts), and the
built-CLI adapter coverage in
[`test/flow-cli.test.ts`](../../test/flow-cli.test.ts). The tests prove all four
independent selections, explicit-only default composition, bound human
checkpoint, deterministic request/package identity, receipt evidence and
ordering, visible terminal states, strict field handling, stdout-only CLI
output, and exit-code behavior.
