# Architecture

## Product shape

AI Booster Kit is an agent-agnostic Delivery Kit, not one Agent runtime. Its
product layer can orient a new or in-progress Delivery Session through Booster
Mode, route an independent Skill through declared contracts, and optionally use
the stricter Flow package/receipt kernel for exact progression.

```text
Existing Codex or Claude Code Agent + selected Model
                         │
                 explicit Booster activation
                         │
request + Skill Registry ───► projectDeliveryCompass
                         │          │
                         │   narrated recommendation
                         │          │ User invokes separately
                         ▼          ▼
              independent Skills and artifacts
                         │
                         ├── optional composeFlow package
                         └── optional assessFlow receipt projection
```

The arrows are dependency direction. Host adapters depend on the product
interfaces; the pure product interfaces do not depend on Codex, an LLM SDK, a
connector, a database, or a host session.

## Architectural layers

| Layer | Owner | Responsibility | Explicitly does not own |
| --- | --- | --- | --- |
| Product contracts | `VISION.md`, `DOMAIN.md`, `CONTEXT.md` | Scope, invariants, vocabulary, non-goals. | Runtime proof or permission. |
| Booster contracts | `contract/booster/skill-registry.json`, plugin assets | Skill inputs/outputs, state-aware gates, host invocations, stops, and request schema. | Agent/Model selection or execution. |
| Delivery Compass | `src/booster/compass.ts` | Strict request/Registry parsing, session/stage projection, gate evaluation, routing, deterministic identity. | Skill invocation, persistence, authentication, or external action. |
| Delivery Skills | `plugins/ai-booster-kit/skills/`, generated `claude-skills/` | Explicit user procedures for planning, team alignment, implementation, test, review, and Handoff. | Hidden chaining or global authority. |
| Plugin distribution | `.agents/plugins/`, `.claude-plugin/`, `plugins/ai-booster-kit/` | Self-contained dual-host discovery, metadata, scripts, Registry, and assets. | Installation side effects or host-security proof. |
| Recipe contracts | `contract/agent-library/` | Required input, output, evidence, recovery, local authority. | Dispatch or storage. |
| Controller loaders | `src/controller/formation-recipe.ts` | Parse and validate canonical recipe documents. | Product-flow progression. |
| Flow composition | `src/flow/compose.ts` | Build one independent Module package or explicit default Flow. | Execution and progress state. |
| Flow assurance | `src/flow/assurance.ts` | Bind request/package identity, validate receipts/checkpoints, project the next safe stage and Handoff. | I/O, persistence, authentication, or execution. |
| CLI adapter | `src/cli.ts` | Read explicit JSON, call the public seam, serialize one result and exit code. | Business-rule duplication. |
| Execution subsystem | `src/execution/` | Existing separately invoked transactional execution contracts and evidence storage. | Implicit Flow authority; Flow Assurance never calls it. |
| Tests | `test/flow-*.test.ts` | Exercise the same public seams and built CLI used by callers. | Hidden test-only control paths. |

## Deep modules and interfaces

### `projectDeliveryCompass`

`projectDeliveryCompass(request, registry): DeliveryCompass` hides strict
untrusted-input parsing, session inference, method-graph traversal,
state/binding-aware human gates, independent Skill selection, observed-stage
recovery, deterministic SHA-256 identity, and status/narrative construction
behind one pure call.

`READY` means only that a Skill's declared inputs and gates are satisfied for a
recommendation. The Skill reopens material artifacts before acting. The output
always denies execution and persistence.

### `composeFlow`

`composeFlow(request): FlowPackage` owns the canonical normalized recipe
contracts and hides request normalization, input binding, default stage
ordering, missing/unknown classification, and the human plan checkpoint behind
one pure call. Callers cannot inject, weaken, or widen those contracts.

Its output is a recommendation package. `READY` means its input contract is
ready; it does not mean an Agent has run.

### `assessFlow`

`assessFlow({ assessmentVersion, request, receipts }): FlowAssuranceReport`
hides canonical identity, receipt parsing, evidence/output coverage, dependency
ordering, plan-decision binding, terminal-state precedence, and Handoff
aggregation.

It deliberately recomposes the package rather than trusting a supplied package.
This keeps the authority and recipe contract local to one interface.

### CLI Adapter

`booster`, `compose-flow`, and `assess-flow` are thin adapters. Their only extra
behavior is file read/JSON parsing, stdout rendering, and process exit codes. A
future UI, MCP server, CI step, or other host should call the same pure
interfaces rather than reimplementing their rules.

### Generated plugin runtime

`scripts/package-booster-plugin.mjs` transpiles the Compass core to one tracked
standalone ESM file and copies/generates all canonical package inputs. The
package runtime resolves its Registry through `import.meta.url`, so a host may
copy the plugin to a cache without retaining the repository. A package test
compares this output with the TypeScript core from an isolated copied directory.

Codex and Claude Code use generated host-specific Skill views because their
explicit-only metadata differs. The procedure bodies stay aligned through the
package freshness check.

## Flow and execution separation

The repository contains an explicit execution subsystem, but it is not reached
by Module/Flow composition or assurance:

```text
compose-flow ──► composeFlow ──► package
assess-flow  ──► assessFlow  ──► report

prepare-execution / ... ──► explicit execution contracts and store
```

There is no arrow from `assessFlow` to `src/execution/`. This is a binding
product boundary:

- a runnable stage is a recommendation;
- a receipt is an observation record, not a dispatch request;
- the User or host chooses and invokes a Module separately;
- external actions need their own exact authority;
- an execution-store record cannot silently manufacture a Flow checkpoint;
- a Flow report cannot silently mutate an execution run.

Shared concepts such as SHA-256 identity, evidence, `STOPPED`, and `UNKNOWN`
have aligned meaning, but their implementations remain local until a concrete
cross-module seam is accepted. This avoids a runtime refactor hidden inside
productization.

## Data ownership

| Data | Owner and lifetime |
| --- | --- |
| Flow request | Caller-owned immutable input for one assessment identity. |
| Booster request | Caller-owned declared Delivery Session snapshot for one Compass identity. |
| Skill Registry | Repository-owned canonical method graph; the plugin copy is generated. |
| `DeliveryCompass` | Pure derived projection; never stored by the core or standalone helper. |
| Skill artifacts | User/workspace/host-owned references. A Compass declaration does not authenticate bytes or signer identity. |
| `FlowPackage` | Pure derived value; not stored by the Flow module. |
| Stage/Checkpoint receipts | Caller-owned immutable records; storage policy belongs to the caller/host. |
| `FlowAssuranceReport` | Pure derived projection; safe to regenerate from the same request and receipts. |
| Recipe documents | Repository-owned canonical contracts; a test compares every Flow-owned projected field with these documents. |
| Execution database | Owned only by the explicit execution subsystem and its commands. |
| Context/identity state | Owned by their named storage modules, not Flow Assurance. |

The Flow modules perform no hidden local write. If an operator redirects CLI
stdout to a file, that file is operator-created, not module-managed state.

## Invariants

1. The User owns objective, scope, authority, plan acceptance, and final
   acceptance.
2. Canonical recipes remain `LOCAL_ONLY` and `RECOMMENDATION_ONLY`.
3. An input change produces a different package identity.
4. A stage cannot become runnable until all stage predecessors and declared
   checkpoints are satisfied.
5. Success requires exact output/evidence coverage and verified readback.
6. `STOPPED` and `UNKNOWN` remain distinct and are never coerced into success.
7. A checkpoint binds the current plan receipt, not merely the stage name.
8. Caller and tests cross the same declared interface.
9. Host capability never grants authority by itself.
10. No Flow interface performs dispatch, persistence, or external action.
11. Installing the plugin does not activate Booster Mode or select an Agent or Model.
12. One explicit Skill never starts another explicit Skill automatically.
13. `accepted-plan` must be `ACCEPTED` and bind the exact current `plan-handoff`; repository state must be `VERIFIED` before implementation is recommended.
14. Generated package files must match canonical sources and pass both host schemas.

## Extension rules

Add a new Module only when its observable purpose, required input, output,
evidence, and recovery contract are accepted in the domain. Add a new Flow only
as an explicit selection; never turn it into a global mandatory loop.

Add a new Skill through the [Skill Registry extension
contract](skill-registry.md). Keep its Codex source concise and explicit-only,
generate its Claude adapter, and test behavior through the Compass public seam.

Add an Adapter when a second host needs translation. Keep host SDK types,
credentials, raw transcripts, and side effects outside `src/flow/`. An Adapter
may produce a declared receipt only after it verifies the referenced artifact;
the core assessor will validate the receipt contract but will not trust the
Adapter with more authority.

Persistence, effect intent, retries, distributed replay, signed approvals, and
automatic chaining are later architectural decisions. They must not be smuggled
into `assessFlow`; each would change the Vision/runtime boundary and needs its
own contract and acceptance evidence.

## Verification map

| Claim | Executable evidence |
| --- | --- |
| All Modules and explicit default Flow compose | `test/flow-compose.test.ts` |
| Flow-owned contracts match the canonical documents and cannot be caller-widened | `test/flow-compose.test.ts` |
| Request/package identity and receipt progression are deterministic | `test/flow-assurance.test.ts` |
| Plan acceptance cannot be skipped or reused for another plan | `test/flow-assurance.test.ts` |
| Evidence gaps and foreign/out-of-order receipts fail closed | `test/flow-assurance.test.ts` |
| Built CLI uses the same interface and exit semantics | `test/flow-cli.test.ts` |
| Booster start/attach/resume/team/direct/stop/complete routing | `test/booster-compass.test.ts`, `test/booster-examples.test.ts` |
| Draft, stale, or incorrectly bound gates fail closed | `test/booster-compass.test.ts` |
| Root and standalone plugin CLIs match the public core | `test/booster-cli.test.ts`, `test/booster-plugin-package.test.ts` |
| Generated plugin is self-contained and fresh | `test/booster-plugin-package.test.ts`, `npm run check:booster-package` |

See [Flow Assurance](flow-assurance.md) for the complete receipt and report
contracts, and [Verification and Handoff](verification-and-handoff.md) for the
release-ready evidence procedure.
