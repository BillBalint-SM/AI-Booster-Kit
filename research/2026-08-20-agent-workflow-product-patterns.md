# Agent-workflow product patterns: a local trust layer

**Status:** research and interface proposal; not an implementation or an approval to add a dependency.
**Scope:** durable, host-agnostic patterns for turning a bounded request into a review-ready result or visible `STOPPED`/`UNKNOWN`.
**Evidence boundary:** only the first-party documents, specifications, and repositories linked below, read 2026-08-20. Product claims are recommendations, not source facts.
**Stop condition:** this report intentionally does not select a runtime, copy code, or change the Vision Contract.

## Decision-grade findings

| Source and provenance | Verified claim | Safe adaptation | Code/provenance decision |
| --- | --- | --- | --- |
| [OpenAI Agents SDK guardrails](https://openai.github.io/openai-agents-python/guardrails/) and [OpenAI's practical guide](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/) | Guardrails are layered; a tripwire can stop a run, and human intervention is appropriate for failure thresholds or high-risk actions. | Separate deterministic admission checks from an explicit human Approval gate; return the failed check as Evidence. | Adapt behaviour only. SDK code is [MIT](https://github.com/openai/openai-agents-python/blob/main/LICENSE), but this product needs no copied SDK code and must remain provider-neutral. |
| [Temporal Workflow Definition](https://docs.temporal.io/workflow-definition) and [official TypeScript SDK](https://github.com/temporalio/sdk-typescript) | Replay requires deterministic orchestration; external/LLM/database work belongs outside the replay path. Mismatched historical commands yield a nondeterminism error. | Treat the Flow declaration plus accepted transition record as immutable per execution; isolate host/tool calls behind an Adapter and persist their result as Evidence. | Adapt behaviour only. The SDK is MIT, but importing it would add a server/runtime and violates the smallest-sufficient local dependency strategy. |
| [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence), [durable-execution guidance](https://docs.langchain.com/oss/python/langgraph/thinking-in-langgraph), and [license](https://github.com/langchain-ai/langgraph/blob/main/LICENSE) | Checkpointing supports resume, inspection, and human interruption; checkpoint placement is an implementation trade-off to evaluate locally. | Make state transitions explicit and inspectable, but do not model every prompt step as a node. One Module invocation is the useful checkpoint. | Adapt behaviour only. LangGraph is MIT, but its graph/runtime is a competing implementation shape and should not be ported. |
| [GitHub Actions job dependencies](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs) and [artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts) | `needs` gates dependent jobs; failed/skipped prerequisites skip dependents by default. Artifacts persist produced files and pass them between jobs. | A transition names its prerequisite Evidence and refuses to run when it is absent, failed, or stale; each result gets a stable artifact reference. | Adapt behaviour only. Documentation prose/examples are not a source for copying; GitHub-specific YAML is not a host-agnostic product contract. |
| [OpenTelemetry Context specification](https://opentelemetry.io/docs/specs/otel/context/) and [specification repository license](https://github.com/open-telemetry/opentelemetry-specification/blob/main/LICENSE) | Execution-scoped Context crosses API boundaries; it is immutable, and mutation produces a new Context. | Carry an immutable `executionId`/`parentEvidenceId` context record through Module calls. Do not let a child silently mutate authority or scope. | Behaviour and data-model inspiration only. Apache-2.0 reuse requires preserving applicable license, copyright, attribution/NOTICE material, modification notices, and patent-license terms; no source import is needed here. |
| [MCP Tools specification](https://modelcontextprotocol.io/specification/draft/server/tools) and [MCP security policy](https://github.com/modelcontextprotocol/modelcontextprotocol/security) | Tools have a name and schemas; tool metadata is untrusted unless the server is trusted. The spec recommends a human able to deny invocations; local servers hold the execution environment's access. | A host/tool Adapter declares input/output, authority class, and provenance. Tool descriptions never grant authority; consequential calls need user Approval. | Implement a small product-owned adapter contract. No protocol/server code is needed. MCP materials have mixed repositories/releases; treat license of any exact source separately before copying. |
| [Anthropic tool definition documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) | Tools are described with names, descriptions, and JSON-schema input definitions. | Accept a host-neutral Tool Contract that can be translated by a host Adapter, without making one vendor's prompt or tool format canonical. | Behaviour only; no source-code reuse assessed or needed. |

## Rejected or deferred material

- **Copyleft, unclear, or unreviewed provenance:** reject copying it into this repository. This includes snippets taken from articles, generated answers, marketplace examples, or a repository without a checked license. Record the exact commit and license before any future code import.
- **Vendor graph or workflow engines:** reject as an initial dependency. They expose more interface and operational surface than a local trust layer requires; the product's differentiation is portable evidence and authority gates, not durable distributed scheduling.
- **OpenAI/LangGraph/Temporal code porting:** even where permissive licensing exists, reject it here. A clean-room implementation preserves locality, avoids importing third-party code and its associated notice/attribution obligations, reduces supply-chain surface, and prevents host lock-in. Any future copied or derived fragment must retain the applicable license, notices, and provenance; do not disguise its origin.
- **Automatic chaining and autonomous retries:** incompatible with `DOMAIN.md`: no hidden external action, no silent scope expansion, and the User remains outcome owner.

## Design it twice — Option A: `trust` as one deep Module

### Product position

Make **Trust Layer** a single, local Module with three entry points: `open`, `advance`, and `inspect`. It is a deep Module: callers learn an explicit request and a small result union; the Implementation hides validation, immutable history, dependency checking, approval matching, evidence attachment, host adaptation, and handoff construction. The external Seam is useful now because the existing Modules and any future host Adapter must share one authority/evidence rule; internal storage and telemetry remain replaceable internal seams.

This differs from an agent framework: it does not choose an Agent, execute a prompt, or own a workflow engine. It makes every existing `plan`, `implement`, `test`, and `review` Module independently invocable while making their optional Flow transitions verifiable. The Leverage is one uniform trust decision across hosts; the Locality is one place to reason about scope, evidence, and `STOPPED`/`UNKNOWN`.

### Interface and types

```ts
type TrustStatus = "READY" | "WAITING_FOR_APPROVAL" | "STOPPED" | "UNKNOWN" | "COMPLETED";
type Authority = "READ_ONLY" | "LOCAL_REVERSIBLE" | "EXTERNAL" | "IRREVERSIBLE";

type EvidenceRef = Readonly<{
  id: string;
  kind: "input" | "plan" | "verification" | "review" | "artifact";
  uri: string;
  digest?: string;
  observedAt: string;
}>;

type TrustRequest = Readonly<{
  outcome: string;
  scope: string;
  authority: Authority;
  requiredEvidence: readonly EvidenceRef[];
  nextModule?: "plan" | "implement" | "test" | "review";
}>;

type TrustResult = Readonly<{
  executionId: string;
  status: TrustStatus;
  evidence: readonly EvidenceRef[];
  allowedNext?: TrustRequest["nextModule"];
  handoff: { facts: string[]; unknowns: string[]; nextBoundedAction?: string };
  error?: TrustError;
}>;

type TrustError =
  | { code: "EVIDENCE_MISSING" | "EVIDENCE_STALE" | "DEPENDENCY_UNMET"; message: string }
  | { code: "APPROVAL_REQUIRED" | "APPROVAL_MISMATCH"; message: string }
  | { code: "SCOPE_CONFLICT" | "UNKNOWN_STATE"; message: string };

interface TrustLayer {
  open(request: TrustRequest): TrustResult;
  advance(executionId: string, request: TrustRequest, approval?: Approval): TrustResult;
  inspect(executionId: string): TrustResult;
}
```

`Approval` is a signed/recorded user decision over the exact `scope`, `authority`, and proposed next Module; it expires rather than broadening. The type is intentionally omitted from the public entry-point count because it is data, not a new operation.

### Invariants

1. An execution record and its Evidence are append-only; a later transition creates a new state record rather than changing past facts.
2. `advance` accepts only evidence required by the declared next Module. Missing, stale, conflicting, or unverifiable evidence yields `UNKNOWN` or `STOPPED`, never `READY`.
3. A Module invocation has one declared scope and authority. An Adapter cannot expand either from tool metadata, model output, or host capability.
4. `EXTERNAL` and `IRREVERSIBLE` transitions require a matching Approval. `LOCAL_REVERSIBLE` can be configured by the User's operating policy, never inferred from tool availability.
5. `COMPLETED` requires proportionate verification Evidence and a Handoff. `STOPPED` and `UNKNOWN` are terminal until a new bounded request or new Evidence is supplied.
6. `inspect` is read-only and stable: a reviewer can reproduce the decision without the originating Agent's transcript.

### Usage

```ts
const opened = trust.open({
  outcome: "Review-ready local change",
  scope: "src/flow only",
  authority: "LOCAL_REVERSIBLE",
  requiredEvidence: [requestEvidence],
  nextModule: "plan",
});

// The caller invokes plan independently, then attaches its declared artifact.
const ready = trust.advance(opened.executionId, {
  outcome: "Review-ready local change",
  scope: "src/flow only",
  authority: "LOCAL_REVERSIBLE",
  requiredEvidence: [requestEvidence, acceptedPlanEvidence],
  nextModule: "implement",
});
```

The caller remains responsible for invoking the recommended next Module. `allowedNext` is a recommendation, never auto-dispatch.

### Hidden Implementation

- A local append-only execution ledger with content digests and parent links; SQLite is plausible because the repository already depends on it, but storage is behind an internal seam.
- A pure transition validator that evaluates prerequisite evidence, scope/authority equality, freshness policy, and Approval matching. It returns data, performs no host/tool call.
- Adapters convert Codex, MCP, CI, or future host records into `EvidenceRef`; the core retains no host SDK dependency.
- An optional trace exporter maps `executionId` to OpenTelemetry trace context. This is an observation Adapter, not the source of truth.

### Dependency strategy and trade-offs

Start with no new runtime dependencies. Reuse existing TypeScript, Ajv (schema checks), and local SQLite only if persistence is implemented. Depend on OpenTelemetry/MCP/Temporal only at an Adapter seam if a concrete second Adapter proves the need.

This option gives maximum Depth and Leverage for a small Interface, and forces useful Locality around the core trust rule. It deliberately does not provide distributed scheduling, arbitrary graph construction, automatic retries, or cross-machine durability. Those are later replaceable Adapter/runtimes after measured demand. The trade-off is less out-of-box orchestration, in exchange for a product claim users can audit: **any host can produce the same review-ready Handoff, but no host can manufacture authority or evidence.**

## Interface alternatives and decision

- **A — stateful `TrustLayer.open/advance/inspect`:** the smallest service-style API, but an internal ledger and execution identity would begin to resemble a new workflow runtime.
- **B — event-sourced `FlowAssurance` kernel:** the strongest long-term model for replay, effect intent, idempotency, and adapters, but its persistence and mutation surface exceeds the current Vision Contract.
- **C — one `booster flow` prepare-or-resume command:** the clearest common-case UX, but automatic workspace discovery and durable resume also require stateful runtime behavior.

The selected first slice is a **stateless hybrid**: one pure
`assessFlow({ assessmentVersion, request, receipts }, recipes)` interface. It
re-composes the canonical package, binds its identity to the full request and
package, validates immutable Stage and Checkpoint receipts, and projects the
next safe Module or a reviewable terminal Handoff. Storage, dispatch, retries,
host calls, and external effects remain outside the interface.

This choice keeps the Depth and auditability of A/B and the one-command clarity
of C without creating a runtime capability. The implementation and executable
acceptance evidence live in [`src/flow/assurance.ts`](../src/flow/assurance.ts)
and [`test/flow-assurance.test.ts`](../test/flow-assurance.test.ts).
