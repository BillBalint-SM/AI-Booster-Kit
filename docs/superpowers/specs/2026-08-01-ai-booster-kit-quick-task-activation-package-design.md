# AI Booster Kit Quick Task Activation Package Design

**Status:** Implemented bounded local package slice; written-spec review remains the source-of-truth check.

**Goal:** Add an explicit local command that turns a freshly validated Quick Task `ACTIVATION_INTENT` into a host-agnostic, ephemeral Agent Activation Package without writing files, persisting session state, or claiming that a host has started an Agent.

## Scope and boundaries

The slice extends only the existing `quick-task-clarifier-validator` Controller recipe. It adds an explicit `activate-quick-task` CLI command and pure package-building domain logic. It supports one light, single-Agent role at a time and does not add multi-Agent orchestration, tool routing, host adapters, filesystem output, persistent storage, package saving, automatic execution, event watching, external reads/writes, OAuth, connectors, or retries.

The command itself is the explicit activation request. It never trusts a previously emitted Intent as sufficient input: it receives the original local request and User choice, re-loads the canonical recipe, re-evaluates, and resolves the choice again before it can issue a package.

## Architecture

```text
request + choice + explicit profile
  -> fresh canonical recipe load
  -> deterministic Quick Task evaluation
  -> checkpoint resolution
  -> require ACTIVATION_INTENT
  -> pure package builder
  -> one Activation Package JSON object on stdout
```

The command accepts exactly these explicit inputs:

```text
npm run cli -- activate-quick-task --input <request.json> --choice <choice.json> --profile <profile>
```

It reuses the closed request parser, recipe loader, checkpoint choice parser, evaluator, and resolver. If the current result is not `ACTIVATION_INTENT`, no package is built. `REQUEST_ALTERNATIVE`, `CONTINUE_WITHOUT_AGENT`, stale signatures, incompatible recipes, malformed input, and missing required acknowledgement return safe `STOPPED` output.

## Activation profile contract

The profile is required; there is no default and no inferred profile. Exactly one profile is selected per package:

| Profile | Purpose | Required output contract |
| --- | --- | --- |
| `clarify` | Turn a bounded idea into a compact Quick Task contract. | DoR, DoD, Acceptance Criteria, evidence requirements, relations, dependencies, and closure. |
| `research` | Explore a knowledge gap without pretending it is already specified work. | Research question, known facts and UNKNOWNs, hypotheses, source/evidence plan, findings, and residual unknowns. |
| `planning` | Shape an implementation or refinement direction without prematurely committing scope. | Goal framing, options, dependencies, steps, risks, decision points, and residual unknowns. |
| `validation` | Check a stated claim or proposed contract against explicit evidence. | Claims to validate, acceptance conditions, evidence plan, findings, differences, and residual unknowns. |

The package carries only the validated request declarations: goal, outcome owner, value state, context state/reference, relations, dependencies, recipe identity, and fingerprints. A profile must preserve missing information as `UNKNOWN`; it cannot manufacture DoR, DoD, AC, evidence, facts, or a target before the Agent produces them as output.

## Package contract

Each successful command prints one deterministic JSON object with this semantic shape:

```json
{
  "activationVersion": "1.0",
  "state": "EPHEMERAL_PACKAGE_ISSUED",
  "retention": "EPHEMERAL",
  "profile": "planning",
  "recipe": {
    "recipeId": "quick-task-clarifier-validator",
    "recipeVersion": "0.1.0",
    "status": "READY_WITH_LIMIT"
  },
  "intent": {
    "state": "ACTIVATION_INTENT",
    "requestFingerprint": "<sha256>",
    "recipeSignature": "<sha256>"
  },
  "agent": {
    "role": "quick-task-clarifier-validator",
    "mode": "assist",
    "input": {},
    "outputContract": {},
    "instructions": [],
    "stopConditions": [],
    "executionBoundary": "LOCAL_ONLY"
  },
  "operations": {
    "packageIssued": true,
    "hostActivationPerformed": false,
    "artifactGenerationPerformed": false,
    "persistencePerformed": false
  }
}
```

`agent.input`, `agent.outputContract`, `agent.instructions`, and `agent.stopConditions` are profile-specific but deterministic. The profile outputs are operational contracts, not pre-filled results. The only active session-level event in this version is the package issuance itself. The package is ready for a compatible host or User to use, but no host runtime has been activated.

## Safety and error contract

The builder is pure: no filesystem, clock, random identifier, environment, network, connector, or host dependency. Equal request, canonical recipe, choice, and profile produce deep-equal package output.

The CLI writes exactly one JSON object to stdout. A valid package exits 0. Invalid command shape or unreadable explicit files use configuration failure; all validation, stale-signature, invalid-profile, non-activation-intent, and risk-acknowledgement failures return `STOPPED` with a non-zero exit and a safe, actionable code. Errors do not echo input content, raw context, credentials, or arbitrary values.

There is no fallback profile, implicit alternative recipe, blind retry, output directory, session persistence, or save action. A later, separately designed save capability may store a validated package in a Personal or Team library only after an explicit User request and operation-specific approval.

## Verification and acceptance criteria

Synthetic, secret-free tests prove:

- a compatible accepted Quick Task yields one ephemeral package for each of the four profiles;
- each package has the selected profile's input/output/instruction/stop contract and no invented result data;
- identical validated inputs produce equal package JSON;
- invalid or missing profile, stale request or recipe signature, alternative/no-Agent choice, non-recommendation, missing acknowledgement, malformed JSON, unreadable explicit file, and extra CLI arguments stop safely;
- built CLI output is one JSON object with no created session, artifact, or output file;
- no existing `quick-task` or `resolve-checkpoint` behavior changes.

The slice is complete only when these focused tests, `npm run lint`, `npm run check:docs`, `npm test`, and `git diff --check` pass on Node 22. It remains `READY_WITH_LIMIT`: host activation, generated artifacts, persistence, saving, multi-Agent support, and connector behavior remain outside scope.
