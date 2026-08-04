# AI Booster Kit Human Checkpoint and Activation Intent Design

**Status:** Implemented bounded local side-effect-free slice; written-spec review remains the source-of-truth check.

**Goal:** Add an explicit, deterministic human checkpoint after a Controller recommendation. The checkpoint records the User's choice as a side-effect-free Intent without activating an Agent, creating files, persisting a session, or accessing external systems.

## Scope and boundaries

The slice extends the local Quick Task Controller only. It introduces a checkpoint representation in a successful Controller response and one explicit local checkpoint-resolution command. It does not implement Agent activation, artifact generation, session-state retention, event watching, rollback execution, persistent pattern storage, external reads/writes, OAuth, connectors, or multi-recipe selection.

The Controller remains advisory. A User-selected skill or tool retains precedence. `UNKNOWN`, `DEGRADED`, and `BREAKING` are not safe by default and require explicit acknowledgement before a risk-affected acceptance can proceed.

## Architecture

```text
Quick Task request
  -> fresh deterministic Controller evaluation
  -> checkpoint (options, impact, signatures)
  -> explicit User choice
  -> fresh deterministic re-evaluation and signature comparison
  -> activation, alternative, or no-Agent Intent
```

The initial `quick-task` response exposes a resolvable `checkpoint` only when the current decision is `RECOMMEND`. `NO_AGENT`, `PREPARE`, `NO_FIT`, and `STOPPED` are final or clarification-required outcomes and never expose a resolvable checkpoint. The checkpoint carries the available choices, current decision/impact, acknowledgement requirement, recipe identity, `requestFingerprint`, and `recipeSignature`.

A separate local `resolve-checkpoint` command receives the original Quick Task request, an explicit User choice, and the expected request/recipe signatures. It evaluates the request and current canonical recipe again rather than trusting a prior response. Any mismatch, incompatible recipe, malformed request, or missing required acknowledgement returns `STOPPED`.

There is no clock, generated run ID, session store, filesystem write, or network dependency. Identical request, recipe, and choice yield an identical Intent.

## Choice and Intent contract

The User has exactly three mutually exclusive choices:

- `ACCEPT_RECOMMENDATION`;
- `REQUEST_ALTERNATIVE`;
- `CONTINUE_WITHOUT_AGENT`.

`REQUEST_ALTERNATIVE` requires a short rationale or target. The other two choices require no invented default. The output is one of three explicit intent states:

| User choice | Intent state | Meaning |
| --- | --- | --- |
| `ACCEPT_RECOMMENDATION` | `ACTIVATION_INTENT` | The recommendation is approved for a later explicit activation command; no activation has happened. |
| `REQUEST_ALTERNATIVE` | `ALTERNATIVE_REQUESTED` | The User asks for a different direction; no substitute recipe is silently selected. |
| `CONTINUE_WITHOUT_AGENT` | `NO_AGENT_CONTINUATION` | The User deliberately continues without Agent support. |

Each Intent includes the original decision, impact, User choice, optional rationale, recipe identity, fingerprints, and an immutable statement that no activation or file generation occurred. The intent is output only; persistence is an explicit later capability.

## Safety and acknowledgement

An `ACCEPT_RECOMMENDATION` whose current impact is `UNKNOWN`, `DEGRADED`, or `BREAKING` requires `acknowledgement: true`. Missing acknowledgement returns `STOPPED` with a safe error code and actionable explanation. `UNKNOWN` is a current Controller impact; `DEGRADED` and `BREAKING` are reserved compatible values for later Controller policies and do not claim present production detection. The resolver never assumes acknowledgement from the existence of an input file, prior response, or alternative/no-Agent selection.

Signature comparison makes the checkpoint fail closed when either the original request or canonical recipe changed. It prevents a stale or edited recommendation from being converted into an activation intent.

## CLI and error contract

The resolver is a local JSON-only command, for example:

```text
npm run cli -- resolve-checkpoint --input <request.json> --choice <choice.json>
```

It writes exactly one JSON object to standard output. `ACTIVATION_INTENT`, `ALTERNATIVE_REQUESTED`, and `NO_AGENT_CONTINUATION` exit with `0`; signature mismatch, missing acknowledgement, malformed input, or incompatible recipe return `STOPPED` with a non-zero exit code. It does not alter the existing `quick-task` command's no-write contract.

## Verification

Synthetic, secret-free fixtures prove:

- checkpoint output exposes exactly three choices;
- accepted compatible recommendation returns `ACTIVATION_INTENT` without writing an artifact;
- alternative without rationale stops, while a supplied rationale returns `ALTERNATIVE_REQUESTED`;
- no-Agent choice returns `NO_AGENT_CONTINUATION`;
- changed request or recipe signature stops resolution;
- acknowledgement is required for unknown, degraded, or breaking acceptance;
- equal validated inputs yield equal Intents;
- built CLI output is one JSON object and does not create a session or output file.

Required gates are the focused tests, `npm run lint`, `npm run check:docs`, `npm test`, and `git diff --check`, preferably on Node 22.

## Acceptance criteria

- A User choice is explicit, reviewable, and cannot cause implicit Agent activation.
- The resolver re-evaluates and rejects stale/tampered checkpoints.
- Alternative and no-Agent paths remain first-class outcomes, not errors.
- Risk acknowledgement is enforced where acceptance would otherwise treat unknown impact as safe.
- No external action, session persistence, file generation, or durable registry is introduced.
