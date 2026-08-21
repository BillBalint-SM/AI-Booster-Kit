# CLI Reference

## Invocation

Build first, then invoke the compiled entry point directly:

```powershell
npm run build
node dist/cli.js --help
node dist/cli.js <command> [...arguments]
```

Use the direct Node form in automation. It avoids npm argument-forwarding
differences and is the form covered by built-CLI tests. The CLI writes machine
results to stdout as JSON except for top-level `--help`; expected validation
outcomes do not require stderr parsing.

## Primary product commands

### `booster`

```powershell
node dist/cli.js booster --input <request.json>
```

Loads the canonical Skill Registry and calls the pure
`projectDeliveryCompass` interface. Use it to start, attach, resume, select an
independent Skill, or refresh a declared Delivery Session. It performs no Skill
invocation or persistence.

Examples:

```powershell
node dist/cli.js booster --input examples/booster/start.json
node dist/cli.js booster --input examples/booster/attach-in-progress.json
node dist/cli.js booster --input examples/booster/resume-accepted-plan.json
node dist/cli.js booster --input examples/booster/team-after-plan.json
node dist/cli.js booster --input examples/booster/standalone-test.json
node dist/cli.js booster --input examples/booster/complete.json
```

See [Booster Mode](booster-mode.md) for the request, artifact state/binding,
status, and recommendation contracts.

### `compose-flow`

```powershell
node dist/cli.js compose-flow --input <request.json>
```

Calls `composeFlow`, which owns its canonical normalized contracts. Use it for
an independent `plan`, `implement`, `test`, or `review` Module, or the
explicitly selected `default-change` Flow. It creates no file and invokes no
Agent.

Examples:

```powershell
node dist/cli.js compose-flow --input examples/modules/plan.json
node dist/cli.js compose-flow --input examples/modules/implement.json
node dist/cli.js compose-flow --input examples/modules/test.json
node dist/cli.js compose-flow --input examples/modules/review.json
node dist/cli.js compose-flow --input examples/flow/default-change.json
```

### `assess-flow`

```powershell
node dist/cli.js assess-flow --input <assessment.json>
```

Calls `assessFlow`. It recomposes the package, binds the complete
request/package identity, validates supplied receipts, and returns the next
safe Module, required checkpoint, blocker, or Handoff. It is stateless and
performs no dispatch.

Examples:

```powershell
node dist/cli.js assess-flow --input examples/flow/assess-default-change.json
node dist/cli.js assess-flow --input examples/flow/assess-after-plan.json
node dist/cli.js assess-flow --input examples/flow/assess-after-plan-accepted.json
node dist/cli.js assess-flow --input examples/flow/assess-complete.json
```

The four fixtures demonstrate initial Plan readiness, the human checkpoint,
accepted Implement readiness, and a terminal receipt-backed Handoff. See
[Flow Assurance](flow-assurance.md) for receipt fields and progression.

## Flow exit codes

| Exit | Meaning |
| ---: | --- |
| `0` | Valid ready or successful result: `READY`, `COMPLETE`, or `COMPLETE_WITH_LIMIT`. |
| `2` | Valid but not runnable/successful: `WAITING_FOR_APPROVAL`, `STOPPED`, or `UNKNOWN`. |
| `3` | Malformed JSON contract, receipt, or request. |
| `4` | Invalid arguments or unreadable explicit input path. |

`booster` also exits `0` for `READY`/`COMPLETE`, `2` for a valid
`WAITING_FOR_DECISION`, `NEEDS_INPUT`, `STOPPED`, or `UNKNOWN` projection, `3`
for malformed request/Registry data, and `4` for command/path configuration.

The exit code is a routing signal; the JSON body is the authoritative reason
and next action.

## Command index

The following index maps the current compiled entry points. Availability does
not grant authority, and several commands belong to older or advanced product
surfaces rather than the primary Module/Flow path.

| Area | Commands | Role |
| --- | --- | --- |
| Contracts and sync | `validate`, `finalize`, `sync`, `conformance` | Validate canonical Markdown/event contracts and bounded sync/conformance results. |
| Sandbox readiness | `readiness` | Generate a local G2AS Sandbox Readiness Certificate; see the [readiness runbook](../runbooks/g2as-sandbox-readiness-certificate.md). |
| Booster Mode | `booster` | Project the narrated, recommendation-only Delivery Compass from the canonical Skill Registry. |
| Module and Flow | `compose-flow`, `assess-flow` | Prepare canonical packages and evaluate immutable receipt progress. |
| Quick Task Controller | `quick-task`, `recommend-formation`, `resolve-checkpoint`, `activate-quick-task` | Recommend a bounded recipe/formation, resolve its human choice, and issue an ephemeral activation package. |
| Agent inventory | `list-agent-profiles`, `inspect-agent-library` | Read-only catalog and Agent/Role/Formation projection. |
| Owner identity | `owner-identity setup`, `owner-identity reconfigure` | Configure local attribution identity; this writes only through its explicit storage contract. |
| Activation | `prepare-activation`, `save-activation`, `execute-activation` | Prepare/save explicit activation packages and invoke the separately bounded local Codex read-only activation path. |
| Host diagnostics | `codex-windows-conformance` | Diagnose native Windows Codex process behavior without treating it as general host proof. |
| Context/session | `validate-context`, `save-context`, `save-session`, `resume-session` | Validate, store, or inspect explicit compact work context/session state. |
| Execution contracts | `prepare-execution`, `prepare-execution-node`, `create-execution-host-receipt`, `inspect-execution-dispatch-readiness`, `record-execution-dispatch`, `accept-execution-result`, `reject-execution-result`, `propose-execution-repair`, `stop-execution`, `check-execution-resume`, `finalize-execution`, `compare-execution-runs` | Operate the separate explicit execution contract/store. These commands are not invoked by Flow Assurance. |

`record-execution-dispatch` and `stop-execution` intentionally reject the
unsupported single-phase operations named in top-level help; their presence is
not a claim that unsafe mutation is enabled.

## Input and output rules

- Paths are explicit arguments; commands do not search for a likely input.
- JSON inputs use exact fields. Unknown fields and versions fail closed.
- A successful parser may still return `STOPPED` or `UNKNOWN`; inspect the body.
- `READY` never implies external-write authority.
- `executionPerformed: false` is literal for composition and Flow Assurance.
- `executionPerformed: false` and `persistencePerformed: false` are literal for the Delivery Compass.
- Redirecting stdout is an operator action; the Flow commands themselves do not
  create output files.

## Safe discovery

Use only:

```powershell
node dist/cli.js --help
```

There is no implicit interactive prompt or fuzzy subcommand selection. An
unknown command, extra argument, or missing explicit path returns a
configuration failure rather than guessing intent.
