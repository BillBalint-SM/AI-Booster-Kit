# Flow Assurance

## Outcome

Flow Assurance turns a canonical Module or Flow request plus declared receipts
into one deterministic answer: which stage may be invoked next, whether a human
decision is required, or whether the work has reached a reviewable terminal
Handoff. It never invokes the stage itself.

The public seam is the pure `assessFlow(value)` function in
[`src/flow/assurance.ts`](../../src/flow/assurance.ts). The `assess-flow` CLI
calls that same function; canonical normalized contracts remain owned by the
Flow module rather than caller configuration.

```text
request + immutable receipts
  → canonical composeFlow package
    → request-and-package SHA-256 identity
      → receipt and dependency validation
        → next safe stage or terminal Handoff
```

There is no database, transcript, Agent dispatch, retry loop, host call, file
write, connector call, or external action in this module.

## Assessment input

The top-level JSON object has exactly three fields:

| Field | Contract |
| --- | --- |
| `assessmentVersion` | Literal `1.0`. |
| `request` | The complete [`composeFlow` request](module-flow-reference.md#request-contract). |
| `receipts` | A list of Stage or Checkpoint receipts. Order does not carry authority; stage dependencies do. |

The assessor first calls `composeFlow` itself. It does not accept a caller-made
`FlowPackage`, so a caller cannot weaken a recipe, omit the plan gate, or widen
authority through the assessment input.

## Package identity

`packageId` is `sha256:<64 lowercase hex characters>`. The digest covers both:

1. the complete validated request, including actual scope, constraints, inputs,
   and unknowns; and
2. the complete canonical `FlowPackage`, including recipe versions, bindings,
   evidence requirements, checkpoints, and authority boundary.

Object keys are recursively sorted before hashing; array order is preserved.
Reordering JSON fields therefore keeps the identity, while changing an input or
contract changes it. Every receipt must name this exact `packageId`.

The identity is an integrity correlation key, not a digital signature. It does
not authenticate a person, prove that referenced bytes exist, or grant
authority.

## Stage receipt contract

A Stage receipt has exactly these fields:

| Field | Contract |
| --- | --- |
| `receiptVersion` | Literal `1.0`. |
| `receiptKind` | Literal `STAGE`. |
| `packageId` | Exact assessment package identity. |
| `stageId`, `module` | Must match one declared package stage. |
| `outcome` | `COMPLETE`, `COMPLETE_WITH_LIMIT`, `STOPPED`, or `UNKNOWN`. |
| `artifacts` | Typed references mapped to the stage's declared output sections. |
| `evidence` | Typed references mapped to the stage's declared evidence requirements. |
| `decisions`, `unknowns`, `limits`, `stopReasons` | Unique, non-empty string lists; their permitted combination depends on `outcome`. |
| `nextAction` | Non-empty bounded continuation or recovery action. |
| `readback` | Fresh observation record: `state`, `revision`, and `observedAt`. |

Each artifact is `{ section, reference, sha256 }`; each evidence item is
`{ requirement, reference, sha256 }`. Digests are 64 lowercase hexadecimal
characters. A successful receipt must cover every declared output section and
every evidence requirement exactly once. Undeclared or duplicate entries fail
closed.

The four outcome contracts are:

| Outcome | Required facts |
| --- | --- |
| `COMPLETE` | Complete artifacts and evidence; verified readback; no unknown, limit, or stop reason. |
| `COMPLETE_WITH_LIMIT` | Same success evidence plus at least one visible limit; no unknown or stop reason. |
| `STOPPED` | At least one evidence reference and stop reason; verified readback; no unknown. |
| `UNKNOWN` | At least one explicit unknown and no stop reason. Readback may be `VERIFIED` or freshly observed as `UNAVAILABLE`. |

`readback.state: VERIFIED` requires a non-empty revision.
`readback.state: UNAVAILABLE` requires `revision: null` and is accepted only for
an `UNKNOWN` result. `observedAt` records the observation; Flow Assurance does
not apply a wall-clock expiry policy.

The report computes a `receiptId` over the complete normalized Stage receipt.
That identity changes if its evidence, artifacts, result, next action, or
readback changes.

## Human checkpoint receipt

The default Flow requires `USER_ACCEPTS_PLAN` between `plan-1` and
`implement-2`. The Checkpoint receipt contains:

```json
{
  "receiptVersion": "1.0",
  "receiptKind": "CHECKPOINT",
  "packageId": "sha256:<package identity>",
  "checkpoint": "USER_ACCEPTS_PLAN",
  "afterStage": "plan-1",
  "beforeStage": "implement-2",
  "subjectReceiptId": "sha256:<current plan receipt identity>",
  "decision": "ACCEPTED",
  "decisionReference": "decision://reviewed-plan-acceptance",
  "decidedAt": "2026-08-20T12:05:00.000Z"
}
```

The assessor publishes `subjectReceiptId` only after the plan receipt is valid.
The checkpoint must bind that exact value. An acceptance for an older or
different plan cannot unlock implementation, and `decidedAt` cannot precede
the bound plan readback. `REJECTED` is a valid, reviewable `STOPPED` outcome
with `REVISE_PLAN_OR_END_FLOW` as the next action.

The decision reference is an evidence pointer, not proof of signer identity.
A host that needs authenticated approvals must verify them outside this pure
module and issue only a reference to the verified record.

## State projection

For the default Flow, the normal projection is:

```text
READY: plan-1
  → plan receipt COMPLETE
WAITING_FOR_APPROVAL: USER_ACCEPTS_PLAN
  → matching checkpoint ACCEPTED
READY: implement-2
  → implementation receipt COMPLETE(_WITH_LIMIT)
READY: test-3
  → test receipt COMPLETE(_WITH_LIMIT)
READY: review-4
  → review receipt COMPLETE(_WITH_LIMIT)
COMPLETE or COMPLETE_WITH_LIMIT: Handoff ready
```

A receipt for a stage whose predecessor or checkpoint is incomplete becomes
`RECEIPT_OUT_OF_ORDER`; it never skips the dependency. A declared `STOPPED` or
`UNKNOWN` stage is terminal and is never upgraded to success. A rejected
checkpoint is also terminal. Independent Module packages have no implicit
checkpoint and can complete after their single valid Stage receipt.

## Report contract

The report contains:

- the canonical package and `packageId`;
- overall `status`;
- each stage's state and computed receipt identity;
- checkpoint state and bound subject identity;
- `runnableStages`, containing concrete package stage IDs such as
  `implement-2` (a recommendation, not dispatch);
- stable blockers and a bounded `nextAction`;
- an aggregated Handoff projection;
- `authority: RECOMMENDATION_ONLY` and `executionPerformed: false`.

Possible status values are:

| Status | Meaning |
| --- | --- |
| `READY` | Exactly the declared next stage may be invoked by the User or host. |
| `WAITING_FOR_APPROVAL` | A valid plan exists; the human checkpoint is still absent. |
| `COMPLETE` | Every stage is complete with full evidence. |
| `COMPLETE_WITH_LIMIT` | Every stage is complete and at least one limit remains visible. |
| `STOPPED` | A confirmed terminal result, rejected checkpoint, package stop, or invalid receipt prevents continuation. |
| `UNKNOWN` | The package or a valid Stage receipt preserves unresolved evidence. |

The Handoff is `ready` for evidenced `COMPLETE`, `COMPLETE_WITH_LIMIT`,
`STOPPED`, and `UNKNOWN` Stage outcomes, and for a bound human rejection. It is
not ready for malformed, foreign, incomplete, or out-of-order receipts. A
composition-time stop/unknown also lacks receipt readback, so it remains a
preparation result rather than a receipt-backed Handoff.

## Blockers and recovery

Malformed JSON shapes and versions raise `FLOW_ASSURANCE_INPUT_INVALID` or
`FLOW_ASSURANCE_RECEIPT_INVALID`. Parsed but unsafe progress returns a visible
`STOPPED` report. Stable blocker families are:

| Family | Examples | Recovery |
| --- | --- | --- |
| Package binding | `RECEIPT_PACKAGE_MISMATCH` | Reassess and issue receipts for the returned package identity. |
| Stage identity/order | `RECEIPT_STAGE_UNKNOWN`, `RECEIPT_DUPLICATE`, `RECEIPT_OUT_OF_ORDER` | Correct the stage identity or supply successful predecessors first. |
| Evidence contract | `RECEIPT_ARTIFACT_INCOMPLETE`, `RECEIPT_EVIDENCE_INCOMPLETE`, `RECEIPT_READBACK_UNVERIFIED` | Correct the named Stage receipt; do not infer missing proof. |
| Checkpoint | `CHECKPOINT_OUT_OF_ORDER`, `CHECKPOINT_SUBJECT_MISMATCH`, `CHECKPOINT_DECISION_STALE`, `CHECKPOINT_REJECTED` | Complete the plan, bind a decision made after the current plan readback, or revise/end the Flow. |
| Composition | `PACKAGE_STOPPED`, `PACKAGE_UNKNOWN` | Correct or resolve the original request input. |

## Operator flow

Start with the runnable example:

```powershell
npm run build
node dist/cli.js assess-flow --input examples/flow/assess-default-change.json
```

The result is `READY`, names `plan-1`, and publishes the package identity. Run
the plan independently through the selected host, read back its outputs, then
construct its Stage receipt. The fixture
[`examples/flow/assess-after-plan.json`](../../examples/flow/assess-after-plan.json)
shows the exact shape; its `example://` references and repeated digest are test
data, not real evidence:

```powershell
node dist/cli.js assess-flow --input examples/flow/assess-after-plan.json
```

The result is `WAITING_FOR_APPROVAL` and publishes the plan `receiptId`. Copy
that ID into a separately recorded Checkpoint receipt, retain the plan receipt,
and append the checkpoint to the same `receipts` list. The next fixture shows
that exact accepted state:

```powershell
node dist/cli.js assess-flow --input examples/flow/assess-after-plan-accepted.json
```

Only the matching `ACCEPTED` decision makes concrete stage `implement-2`
runnable. `runnableStages` always names concrete package stage IDs; `nextAction`
uses the stable module-category instruction `RUN_MODULE:implement` so an
operator can route without parsing the generated ordinal. Repeat the append-only
receipt pattern for implementation, test, and review. The terminal fixture
demonstrates the complete contract:

```powershell
node dist/cli.js assess-flow --input examples/flow/assess-complete.json
```

That result is `COMPLETE`, has no runnable stage, and exposes
`handoff.ready: true` with `PRESENT_HANDOFF_FOR_USER_ACCEPTANCE`.

At every step, keep the complete original request unchanged and append the new
validated receipt to the retained receipt set. An input change creates a new
package identity and intentionally invalidates old receipts.

CLI exit codes:

| Result | Exit code |
| --- | ---: |
| `READY`, `COMPLETE`, `COMPLETE_WITH_LIMIT` | `0` |
| `WAITING_FOR_APPROVAL`, `STOPPED`, `UNKNOWN` | `2` |
| Malformed assessment, receipt, or canonical request | `3` |
| Invalid command arguments or unreadable input path | `4` |

## Evidence and security boundary

Flow Assurance proves deterministic contract evaluation over supplied data. It
does not read artifact bytes, recompute the supplied artifact/evidence digests,
authenticate human identity, prove host security, enforce timestamp freshness,
or persist an audit log. A caller must verify the referenced material and store
receipts according to its own approved policy.

Never put raw prompts, hidden reasoning, credentials, tokens, cookies, personal
absolute paths, or secret data in references or decision fields. Prefer stable
artifact IDs, repository-relative references, content digests, and separately
controlled decision records.

The external design sources and clean-room adaptation decision are recorded in
[`research/2026-08-20-agent-workflow-product-patterns.md`](../../research/2026-08-20-agent-workflow-product-patterns.md).
No vendor runtime or vendor source code was imported.

## Verification seam

Tests cross the same pure `assessFlow` seam used by the CLI. The focused suite
in [`test/flow-assurance.test.ts`](../../test/flow-assurance.test.ts) covers
identity binding, complete progression, plan approval, rejection,
`COMPLETE_WITH_LIMIT`, evidence failure, foreign/out-of-order receipts, and
reviewable `STOPPED`/`UNKNOWN`. Built CLI behavior is covered in
[`test/flow-cli.test.ts`](../../test/flow-cli.test.ts).
