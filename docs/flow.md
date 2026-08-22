# Flow contract

Flow is AI Booster Kit's only executable verifier. It is a pure local kernel
with two public functions and two matching CLI commands.

| Interface | Input | Result |
| --- | --- | --- |
| `composeFlow(value)` / `compose-flow --input <path>` | one module request or the explicit `default-change` request | a recommendation-only module/Flow package |
| `assessFlow(value)` / `assess-flow --input <path>` | a request plus stage/checkpoint receipts | the next runnable stage, blocker, or terminal handoff |

## Composition

Independent modules are `plan`, `implement`, `test`, and `review`. The
`default-change` Flow orders all four and inserts one mandatory
`USER_ACCEPTS_PLAN` checkpoint between planning and implementation.

Runnable examples:

- [default Flow request](../examples/flow/default-change.json)
- [independent module requests](../examples/modules/plan.json)
- [initial assessment](../examples/flow/assess-default-change.json)
- [waiting for plan acceptance](../examples/flow/assess-after-plan.json)
- [accepted plan](../examples/flow/assess-after-plan-accepted.json)
- [complete handoff](../examples/flow/assess-complete.json)
- [foreign receipt rejection](../examples/flow/assess-foreign-receipt.json)

## Assurance

An assessment has `assessmentVersion: "1.0"`, the original `request`, and a
`receipts` array. Stage receipts bind the package ID, stage, module, outcome,
artifacts, evidence, read-back, and next action. Checkpoint receipts bind the
human decision to the exact plan receipt.

Flow rejects malformed, duplicate, foreign, out-of-order, stale, incomplete,
or unverified receipts. Successful stage claims require the declared artifact
sections, evidence requirements, and verified read-back. Unknown and stopped
receipts remain visible and reviewable.

Assurance statuses are `READY`, `WAITING_FOR_APPROVAL`, `COMPLETE`,
`COMPLETE_WITH_LIMIT`, `STOPPED`, and `UNKNOWN`.

## CLI exit contract

| Exit | Meaning |
| --- | --- |
| `0` | help, `READY`, `COMPLETE`, or `COMPLETE_WITH_LIMIT` |
| `2` | a valid reviewable non-ready result, including waiting, stopped, or unknown |
| `3` | malformed JSON or rejected Flow/receipt content |
| `4` | invalid command arguments, unsupported format, or unreadable input path |
| `1` | unexpected internal failure |

Expected Flow and configuration errors are JSON on standard output. Assessment
output defaults to JSON; `--format markdown` emits a deterministic,
redaction-aware informational summary.

## Hard boundary

Every package and report declares `RECOMMENDATION_ONLY` and
`executionPerformed: false`. Flow performs no agent invocation, dispatch,
persistence, network access, approval inference, Git operation, or external
write.
