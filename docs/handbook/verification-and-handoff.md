# Verification and Handoff

## Definition of review-ready

A result is review-ready when a fresh reviewer can determine its objective,
scope, artifacts, evidence, decisions, unknowns, limits, status, and next
bounded action without trusting a hidden transcript. Review-ready is not the
same as published, accepted, deployed, or externally authorized.

For Module/Flow work, use the public interfaces as the primary evidence:

- `projectDeliveryCompass` proves strict delivery-state routing and
  state/binding-aware Skill gates without execution;
- `composeFlow` proves canonical selection and declared contracts;
- `assessFlow` proves receipt binding, dependency gates, terminal semantics,
  and Handoff completeness;
- the built CLI proves the local file/JSON adapter and exit behavior.

## Local verification sequence

From the repository root:

```powershell
npm run build
node --test dist/test/booster-compass.test.js dist/test/booster-cli.test.js dist/test/booster-examples.test.js dist/test/booster-plugin-package.test.js
node --test dist/test/flow-compose.test.js dist/test/flow-assurance.test.js dist/test/flow-cli.test.js
npm run check:booster-package
npm run lint
npm test
npm run check:docs
git diff --check
```

## Manual product smoke test

```powershell
node dist/cli.js booster --input examples/booster/start.json
node dist/cli.js booster --input examples/booster/attach-in-progress.json
node dist/cli.js booster --input examples/booster/resume-accepted-plan.json
node dist/cli.js booster --input examples/booster/team-after-plan.json
node dist/cli.js booster --input examples/booster/standalone-test.json
node dist/cli.js booster --input examples/booster/stopped.json
node dist/cli.js booster --input examples/booster/complete.json
node dist/cli.js compose-flow --input examples/flow/default-change.json
node dist/cli.js assess-flow --input examples/flow/assess-default-change.json
node dist/cli.js assess-flow --input examples/flow/assess-after-plan.json
node dist/cli.js assess-flow --input examples/flow/assess-after-plan-accepted.json
node dist/cli.js assess-flow --input examples/flow/assess-complete.json
```

Expected observations:

1. Booster examples cover `NEW`, `ATTACH`, `RESUME`, `TEAM`, independent Skill,
   `STOPPED`, and `COMPLETE`, always with execution/persistence false;
2. a draft or incorrectly bound plan decision and non-verified repository never
   make implementation ready;
3. composition is `READY`, but `executionPerformed` is `false`;
4. the empty assessment makes only `plan-1` runnable;
5. the after-plan assessment is `WAITING_FOR_APPROVAL` and publishes the exact
   plan `receiptId` needed by the human checkpoint;
6. the accepted-checkpoint assessment is `READY` and makes only `implement-2`
   runnable;
7. the terminal assessment is `COMPLETE`, has no runnable stage, and exposes
   `handoff.ready: true` plus `PRESENT_HANDOFF_FOR_USER_ACCEPTANCE`;
8. no command creates an execution database, invokes an Agent, or performs an
   external action.

Plugin release validation also requires the Codex plugin validator, all seven
Codex Skill validators, and `claude plugin validate .`. These checks validate
manifest/Skill shape; they do not install or activate the plugin.

The example receipt references and hashes are fixtures. They prove contract
shape only, not real artifact content.

## Handoff content

Every project handoff should name:

| Section | Required content |
| --- | --- |
| Objective and status | Bounded outcome and exact terminal/current state. |
| Artifacts | Changed files, generated packages, or stable artifact references. |
| Evidence | Commands/checks and their actual results; receipt evidence where applicable. |
| Decisions | Accepted design, rejected alternatives, and human checkpoints. |
| Unknowns and limits | Anything not proven, stale evidence, unsupported hosts, or deferred scope. |
| Safety boundary | Whether execution, persistence, external writes, Git publication, or credentials were involved. |
| Next action | One bounded action and its acceptance criteria. |

For a receipt-backed Flow terminal, `handoff.ready: true` means the supplied
receipt set satisfies the Flow contract. It does not independently verify the
referenced bytes or authenticate a decision signer. Report this distinction.

## Status-specific handoff rules

| Status | Handoff rule |
| --- | --- |
| `COMPLETE` | All declared outputs/evidence and verified readback exist; present for User acceptance. |
| `COMPLETE_WITH_LIMIT` | Same as complete, but preserve every limit in the Handoff. |
| `STOPPED` | Name the confirmed reason, supporting evidence or bound rejection, and one safe recovery/end action. |
| `UNKNOWN` | Name exactly what could not be established, the fresh unavailable/ambiguous observation, and how to reacquire evidence or stop. |
| `READY` | Not terminal; name only the recommended runnable stage. |
| `WAITING_FOR_APPROVAL` | Not terminal; present the exact plan receipt identity for the User decision. |

Never relabel `STOPPED` or `UNKNOWN` as success to make a delivery appear
complete. Never call a recommendation package executed.

## Change review checklist

Before User handoff:

1. Reopen `VISION.md`, `DOMAIN.md`, and the changed interfaces.
2. Confirm no hidden runtime, automatic chaining, external write, or authority
   widening was introduced.
3. Review the working tree and preserve unrelated/user-owned files.
4. Run focused tests first, then the full suite and documentation link check.
5. Ask an independent reviewer to inspect the actual diff and contract claims.
6. Fix actionable findings and rerun the affected checks.
7. Report checks exactly, including skipped checks and known non-ready evidence.

Commit, push, pull request, merge, release, deletion, archive migration, plugin
installation, and external publication remain separate exact decisions. A
review-ready local Handoff does not authorize them.

## Recovery

When verification fails, keep the failing output and classify it:

- source or type failure: fix the smallest relevant implementation;
- public-interface regression: add/keep the failing test before the fix;
- receipt/contract mismatch: return the stable blocker and correct the input;
- flaky or unavailable evidence: preserve `UNKNOWN` and reacquire evidence;
- unrelated dirty work: stop touching that surface and report the conflict.

After recovery, rerun the failed check and all checks that depend on the changed
surface. Do not claim the full suite passed from a focused rerun.
