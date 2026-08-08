# Execution Kernel standards and source catalog

Date checked: **2026-08-08**
Status: **preparatory research; no architecture, implementation plan, or technology selection**
Local baseline: Git revision `492d44158869cde4e94e9a0bcc1396616e908bb1`

## Exact objective

The target is a **Codex-native, agent-agnostic Multi-Agent Execution Kernel**
that can take an already approved immutable work graph and execute it with one
controller and one or more specialized workers without an external LLM, model
API, workflow service, or remote execution engine.

A successful kernel must make the following claims locally verifiable rather
than merely plausible:

1. every command, dispatch, worker result, transition, and final claim belongs
   to the exact intended run, graph, node, task, repository, worktree, source
   revision, and host session;
2. all permitted outcomes and transitions are closed, deterministic, and
   fail-closed, including `STOPPED`, `UNKNOWN`, rejection, cancellation, and
   partial failure;
3. dispatch, parallelism, time, repair, and retry budgets are enforced before
   the corresponding effect, not reconstructed afterwards;
4. cancellation and interruption are evidenced per active worker; an
   unconfirmed stop is never reported as confirmed;
5. state and evidence survive process failure without split-brain writers,
   partial multi-file commits, silent recovery, or duplicate external effects;
6. final handoff claims are derived only from resolved, source-bound local
   evidence; and
7. the host adapter proves the Codex behavior it relies on, while any
   undocumented or unobservable behavior remains explicitly `UNKNOWN`.

The immediate need is therefore not another scenario name. It is a bounded,
source-backed decision basis for the execution contract and for the future
Codex-native conformance run.

## Research boundary

This catalog answers four questions only:

- What requirement families are exposed by the current 61-class contingency
  audit?
- Which current standards or authoritative original-project sources define
  useful semantics for each family?
- Which local technologies are credible candidates under the Codex-only,
  no-external-model constraint?
- Which host guarantees cannot be established from documentation and therefore
  require a controlled empirical probe?

It does **not** choose an architecture, freeze a storage engine, define a schema,
write an implementation plan, change dependencies, or authorize a real run.
External orchestrators such as Temporal are included only as reference models;
they are not proposed runtime dependencies.

## Evidence classification

| Label | Meaning |
| --- | --- |
| **Standard** | Published standards-body specification or normative protocol. |
| **Final guidance** | Current final guidance from a recognized authority. |
| **Official host fact** | Behavior explicitly documented by OpenAI for Codex. |
| **Original-project reference** | Documentation maintained by the technology's own project. |
| **Candidate technology** | A possible local component; not selected and not a guarantee. |
| **Reference pattern** | Useful semantics from another system without adopting that system. |
| **Draft / pre-stable** | Not a final standard or stable runtime surface; must not be presented as one. |
| **Unknown** | No authoritative documentation presently proves the required host fact. |

## Requirement coverage map

The complete individual cases and present implementation evidence are in the
[contingency contract audit](./2026-08-08-execution-kernel-contingency-contract-audit.md#contingency-coverage-matrix).
The grouping below covers all 61 audited classes; it is a research index, not a
redesign of their required behavior.

| Requirement family | Audit cases covered | What must eventually be fixed or evidenced | Principal source families |
| --- | --- | --- | --- |
| Input, command, schema, version admission | `P01-P05` | Bounded parsing, rejection without mutation, exact schema/runtime compatibility | JSON Schema, Ajv, SemVer, Node release policy |
| Source and worktree identity | `S01-S04` | Controller-observed repo/worktree/revision/dirty-state attestation immediately before dispatch | Git porcelain, SLSA, in-toto |
| Host capability and instruction boundary | `H01-H03` | Profile preflight, effective-policy evidence, immutable packet identity, no self-attestation | Codex official docs, OWASP, NIST |
| Spawn, routing, and topology | `A01-A04` | Dispatch intent, confirmed/ambiguous spawn result, exact agent identity, unauthorized-delegation handling | Codex subagents, CloudEvents/in-toto vocabulary, host probes |
| Dispatch and concurrency control | `D01-D06` | Atomic budget reservation, real active-worker limit, two-phase dispatch, idempotency and reconciliation | RFC 9110, gRPC patterns, transactional storage |
| Worker result handling | `R01-R08` | Status-aware total transitions, atomic receive/accept, duplicate/conflict/late-result rules | SCXML, JSON Schema, JCS, problem/status vocabularies |
| Evidence resolution and provenance | `E01-E05` | Dereference and hash local evidence, bind it to observed source, distinguish existence from semantic proof | Git, JCS, SLSA, in-toto, W3C PROV |
| Time, wait, and liveness | `T01-T03` | Monotonic budgets, deadline semantics, timeout as observation, missing-thread handling | Node clocks/abort, gRPC deadline/cancel patterns |
| User cancellation and interrupt | `C01-C03` | Phase-specific cancel, per-worker interrupt receipt, unknown outcome on ambiguity | AbortController, gRPC cancellation, Codex host probes |
| Repair, fan-in, and graph budgets | `B01-B03` | Atomic repair reservation, scope checks, no success fan-in from stopped/unknown input | SCXML, property/model testing |
| Concurrent writer and crash consistency | `X01-X06` | Single writer, transactional commit, journal recovery, corruption/path boundary handling | SQLite transaction/atomicity/WAL/testing docs |
| Resume and session continuity | `U01-U03` | Canonical replay, freshness-bound host observations, explicit cross-session limits | Durable-execution patterns, Codex host probes |
| Finalization and comparison | `F01-F04` | One terminal commit/receipt, post-terminal mutation guard, complete ledger/artifact agreement | Transactional storage, JCS, provenance models |
| Sensitive data and authority | `Q01-Q02` | Pre-persistence filtering, least authority, no automatic recovery-scope expansion | OWASP, NIST AC-6, Zero Trust, SSDF |
| Operator protocol and clock validity | `O01-O02` | Total command/state gate, exact next actions, monotonic and wall-clock separation | SCXML, RFC 3339, Node monotonic clock |

## Source register

### 1. State, outcome, and contract structure

1. **W3C State Chart XML (SCXML) 1.0** — **Standard**, W3C
   Recommendation, 2015-09-01. Defines event-driven state machines with
   hierarchical and parallel states and explicit transitions. It is useful for
   a total transition contract and event ordering. It does not define agen
   identity, persistence, or a failure taxonomy.
   Source: [W3C SCXML](https://www.w3.org/TR/scxml/)

2. **JSON Schema Draft 2020-12** — latest published JSON Schema dialect,
   published 2022-06-16, but the core document is an **expired IETF
   Internet-Draft, not an RFC**. It provides versioned structural and validation
   vocabularies for command, event, state, and result envelopes. It does no
   define canonical bytes or business transitions.
   Sources: [2020-12 landing page](https://json-schema.org/draft/2020-12),
   [core specification](https://json-schema.org/draft/2020-12/json-schema-core)

3. **Ajv 8.20.0** — **candidate technology** already present in the repository.
   The original project supports JSON Schema 2020-12 through its dedicated
   `Ajv2020` class, strict validation, secure-schema guidance, and standalone
   validator generation. Strict mode must be configured deliberately, and
   schema validation cannot replace transition or authorization checks.
   Sources: [Ajv releases](https://github.com/ajv-validator/ajv/releases),
   [JSON Schema support](https://ajv.js.org/json-schema.html),
   [strict mode](https://ajv.js.org/strict-mode.html),
   [security considerations](https://ajv.js.org/security.html)

4. **gRPC status-code vocabulary** — **reference pattern**, not a kernel
   protocol. Its fixed set of numbered outcomes demonstrates the value of a
   small closed transport taxonomy, while domain reasons remain separately
   typed. It is RPC-specific and deliberately contains a coarse `UNKNOWN`.
   Source: [gRPC status codes](https://grpc.io/docs/guides/status-codes/)

5. **RFC 9457 Problem Details for HTTP APIs** — **Standard**, November 2023.
   Useful as an error-envelope reference separating machine type, status,
   instance, and extensions. It is HTTP-specific and does not prescribe kernel
   state transitions.
   Source: [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)

6. **CloudEvents 1.0.2** — **original-project interoperability
   specification**. Its required event identity/source/type fields are useful
   vocabulary for controller events. It is not an audit ledger, state machine,
   delivery guarantee, or evidence verifier.
   Sources: [CloudEvents core](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md),
   [releases](https://github.com/cloudevents/spec/releases)

7. **CNCF Serverless Workflow 1.0.0** — **reference pattern** for declarative
   workflow structure and lifecycle concepts. It is not selected, and adopting
   its DSL would add breadth without proving Codex host behavior.
   Source: [Serverless Workflow releases](https://github.com/serverlessworkflow/specification/releases)

### 2. Canonical identity, time, and correlation

8. **RFC 8785 JSON Canonicalization Scheme (JCS)** — **Informational RFC**,
   June 2020. Produces deterministic JSON serialization for repeatable hashes
   and signatures. It assumes I-JSON/ECMAScript numeric behavior and does no
   normalize Unicode or establish authenticity by itself.
   Source: [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)

9. **FIPS 180-4 Secure Hash Standard** — current final NIST hash standard a
   the research date, although NIST has announced a revision. SHA-256 is suitable
   for content digests; a digest proves equality/integrity under the assumed
   boundary, not provenance or truth.
   Source: [NIST FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)

10. **RFC 9562 UUIDs, including UUIDv7** — **Standard**, May 2024. UUIDv7 is a
    candidate for time-ordered correlation/invocation identifiers. It does no
    provide idempotency, authentication, or global ordering.
    Source: [RFC 9562 section 5.7](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.7)

11. **RFC 3339 timestamps** — **Standard** profile for Internet date/time.
    Appropriate for recorded wall-clock observations, but elapsed-time budgets
    require a monotonic clock and a restart policy.
    Source: [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339.html)

12. **Node.js `performance.now()`** — **original-project runtime API**. It is a
    high-resolution time value relative to process start and is suitable for
    in-process monotonic elapsed budgets. It cannot alone account for a process
    restart.
    Source: [Node.js Performance hooks](https://nodejs.org/api/perf_hooks.html#performancenow)

### 3. Durable state, transactionality, and recovery

13. **SQLite transaction and isolation semantics** — **original-projec
    reference/candidate basis**. SQLite provides serializable transactions and
    permits one simultaneous writer with concurrent readers. Application policy
    must still define busy handling, lease ownership, transaction boundaries,
    and ambiguity after host failure.
    Sources: [transactions](https://www.sqlite.org/lang_transaction.html),
    [isolation](https://www.sqlite.org/isolation.html)

14. **SQLite atomic commit and recovery** — documents rollback-journal commit,
    flush, locking, and hot-journal recovery. Its guarantees depend on VFS,
    filesystem, locking, and durability assumptions that must be verified on
    the Windows host.
    Source: [Atomic Commit in SQLite](https://www.sqlite.org/atomiccommit.html)

15. **SQLite write-ahead logging (WAL)** — allows readers alongside a writer,
    but remains single-writer and same-host storage. Checkpoint and synchronous
    settings affect latency and durability. The current official page also
    documents a recently fixed WAL-reset defect, so the exact bundled SQLite
    version matters.
    Source: [SQLite WAL](https://www.sqlite.org/wal.html)

16. **Temporal workflow execution** — **reference pattern only** because an
    external workflow service is outside scope. Event history, deterministic
    replay, explicit retry policy, and cooperative cancellation are valuable
    benchmarks for what a durable local kernel must state. Temporal does no
    make arbitrary external effects exactly-once.
    Sources: [workflow execution](https://docs.temporal.io/workflow-execution),
    [retry policies](https://docs.temporal.io/encyclopedia/retry-policies),
    [TypeScript cancellation](https://docs.temporal.io/develop/typescript/cancellation)

### 4. Dispatch, idempotency, deadlines, and cancellation

17. **RFC 9110 idempotent methods** — **Internet Standard**, June 2022.
    Defines idempotency by intended effect and restricts automatic retry of
    non-idempotent requests. It does not specify an application idempotency key,
    deduplication store, or transactional effect boundary.
    Source: [RFC 9110 section 9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

18. **IETF `Idempotency-Key` header draft-07** — **expired Internet-Draft**, no
    an RFC; it expired 2026-04-18. It is useful vocabulary for unique operation
    keys and fingerprint conflicts, but cannot be cited as a final standard.
    Source: [IETF draft status](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)

19. **gRPC retry guidance** — **reference pattern** for saved-call replay,
    attempt limits, backoff, throttling, pushback, and the point after which a
    call is committed. Transport retry still cannot make a side effec
    idempotent.
    Source: [gRPC retry](https://grpc.io/docs/guides/retry/)

20. **gRPC deadlines and cancellation** — **reference patterns**. Calls have no
    deadline by default; deadlines should propagate, and application work mus
    observe cancellation. Expiry/cancellation can race with an already applied
    effect and does not imply rollback.
    Sources: [deadlines](https://grpc.io/docs/guides/deadlines/),
    [cancellation](https://grpc.io/docs/guides/cancellation/)

21. **Node.js `AbortController` and `AbortSignal`** — stable native APIs with
    abort reasons, `timeout()`, `any()`, and `throwIfAborted()`. They are credible
    local cooperative-cancellation primitives, not proof that a Codex subagen
    stopped or that an external side effect was rolled back.
    Source: [Node.js globals: AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)

22. **Go `errgroup`** — **language-specific reference pattern** for sibling
    cancellation and a bound on active tasks. It is not a Node dependency and
    task-count limits do not cover time, memory, tokens, or cost.
    Source: [Go errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)

23. **Linux cgroup v2** — authoritative **Linux-only reference** for
    parent-imposed process and resource limits. It does not establish equivalen
    Windows/Codex host enforcement and does not cover logical dispatch budgets.
    Source: [Linux cgroup v2](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)

### 5. Git identity, provenance, and evidence

24. **Git `rev-parse`** — official Git interface for resolving a repository
    top-level path and verifying an object as a commit using an unambiguous
    revision expression. It provides a local observation, not remote freshness
    or host binding by itself.
    Source: [`git rev-parse`](https://git-scm.com/docs/git-rev-parse)

25. **Git porcelain-v2 status** — stable machine-readable local branch, OID,
    upstream, index, worktree, and untracked-state output. Remote and PR facts
    can be stale or absent.
    Source: [`git status`](https://git-scm.com/docs/git-status)

26. **Git worktree porcelain** — linked worktrees share repository data bu
    have distinct `HEAD`, index, and per-worktree metadata. The path, worktree
    identity, commit, branch/detached state, and scoped status must therefore be
    treated as a tuple.
    Source: [`git worktree`](https://git-scm.com/docs/git-worktree.html)

27. **SLSA v1.2 provenance** — **Approved specification**. Builder identity,
    invocation ID, resolved dependencies, source/build provenance, and
    verification summary are useful vocabulary for source-bound execution
    evidence. SLSA targets software supply chains, not general agent runtime
    truth, so its schemas should not be copied blindly.
    Sources: [SLSA v1.2](https://slsa.dev/spec/v1.2/),
    [provenance](https://slsa.dev/spec/v1.2/provenance),
    [source requirements](https://slsa.dev/spec/v1.2/source-requirements)

28. **in-toto Attestation Framework v1.2** — **original-projec
    specification** separating statement, predicate, envelope, and bundle.
    Useful for subject-bound typed evidence. Authentication proves signer and
    integrity under a trust policy, not that the claim is true.
    Source: [in-toto Attestation Framework](https://github.com/in-toto/attestation/blob/main/spec/README.md)

29. **W3C PROV** — **W3C Recommendation family** defining entity, activity, and
    agent provenance relations. It provides a conceptual evidence model, not an
    integrity mechanism, storage transaction, or acceptance policy.
    Sources: [PROV overview](https://www.w3.org/TR/prov-overview/),
    [PROV data model](https://www.w3.org/TR/prov-dm/)

### 6. Observability and audit separation

30. **W3C Trace Context** — **W3C Recommendation** for propagating trace
    identity across boundaries. It aids correlation but is explicitly not a
    durable audit or authorization proof.
    Source: [W3C Trace Context](https://www.w3.org/TR/trace-context/)

31. **OpenTelemetry specification 1.59.0** — current original-projec
    observability specification at the research date. Trace and log models can
    correlate controller/worker actions and resources. Telemetry may be sampled,
    dropped, transformed, or exporter-dependent and must remain separate from
    the canonical ledger.
    Sources: [OpenTelemetry specifications](https://opentelemetry.io/docs/specs/otel/),
    [stable log data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/),
    [trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)

### 7. Security and authority

32. **OWASP LLM01:2025 Prompt Injection** — current community security
    guidance. Direct prompts and indirect content from files or web pages can
    alter model behavior; proposed controls include separating untrusted
    content, constraining functions, least privilege, and human approval for
    high-risk actions. OWASP states there is no foolproof prevention.
    Source: [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

33. **OWASP LLM06:2025 Excessive Agency** — guidance to minimize available
    functionality, permissions, and autonomy and to mediate actions completely.
    It is directly relevant to worker tool catalogs and recovery boundaries bu
    is not a formal conformance standard.
    Source: [OWASP LLM06](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

34. **NIST SP 800-53 Rev. 5 AC-6 Least Privilege** — **final control
    framework** requiring only the authorized access necessary for assigned
    tasks. It supplies the control objective, not a Codex-specific protocol.
    Source: [NIST SP 800-53 Rev. 5](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf)

35. **NIST SP 800-207 Zero Trust Architecture** — **final NIST publication**.
    Supports per-request verification and no implicit trust from location or
    prior membership. It is an architectural security reference, not proof tha
    Codex provides each enforcement point.
    Source: [NIST SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final)

36. **NIST SP 800-218 SSDF 1.1** — current **final** Secure Software
    Development Framework; the newer 1.2 material is still draft at the
    research date. Relevant for threat modeling, provenance, dependency review,
    and verification discipline.
    Source: [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)

37. **NIST AI 600-1 Generative AI Profile** — **final NIST AI RMF profile**.
    Provides risk-management framing for generative systems. It helps classify
    risk but does not specify execution-kernel transitions or host APIs.
    Source: [NIST AI 600-1](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)

### 8. Codex-native host facts and limits

38. **Codex subagents** — **official OpenAI host fact**. Codex can spawn
    specialized agents, run independent work concurrently, collect results, and
    apply configured concurrency limits. OpenAI warns that parallel write-heavy
    work can conflict. The page does not promise durable spawn receipts,
    immutable worktree binding, exact inherited context, cross-session liveness,
    or interrupt acknowledgement.
    Source: [OpenAI Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

39. **Codex `AGENTS.md` discovery** — **official OpenAI host fact**. Codex
    constructs an instruction chain from global and root-to-current-directory
    files, with nearer instructions overriding earlier ones within limits. A
    visible file is not proof of the exact effective instruction chain applied
    to a specific worker.
    Source: [OpenAI Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

40. **Codex sandbox and approvals** — **official OpenAI host fact**. Sandbox
    capability and approval policy are distinct controls; documented defaults
    and configuration vocabulary do not prove the effective enforcement of a
    specific run.
    Sources: [approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security),
    [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)

The following required host facts are **UNKNOWN** after this documentation
research and must remain so until a controlled Codex-native conformance probe
records controller-observed evidence:

- whether every subagent is immutably bound to the intended repository,
  worktree, and commit at each dispatch;
- whether a spawn return constitutes a durable receipt and uniquely identifies
  a worker even across timeout or response loss;
- the exact effective instruction/context chain seen by each worker;
- whether the controller can observe unauthorized child delegation completely;
- whether interrupt success is explicitly acknowledged and guarantees the
  worker no longer executes;
- how late messages and worker identity behave after cancellation;
- whether prior worker liveness/identity is observable across Codex tasks or
  application sessions; and
- whether the effective sandbox, network, tool, and approval controls can be
  attested per run rather than inferred from configuration.

These unknowns are not failures of the source search. They mark the boundary
between documented capability and empirical host behavior.

### 9. Runtime and dependency status

41. **Node.js release policy** — on 2026-08-08, the official schedule lists
    Node 26 as **Current**, Node 24 as **Active LTS**, and Node 22 as
    **Maintenance LTS**. Node recommends Active or Maintenance LTS for
    production applications. The repository currently declares `>=26 <27`, so
    it intentionally targets Current, not LTS; whether that is acceptable is a
    future support-policy decision, not a fact to conceal or auto-correct.
    Sources: [Node.js previous releases](https://nodejs.org/en/about/previous-releases),
    [Release Working Group schedule](https://github.com/nodejs/Release#release-schedule)

42. **Node.js supported platforms** — the official `BUILDING.md` matrix is
    branch/release-specific. Platform tier support must be checked at the exac
    selected Node release tag, and does not establish dependency or native-addon
    compatibility.
    Source: [Node.js BUILDING.md](https://github.com/nodejs/node/blob/main/BUILDING.md)

43. **`node:sqlite`** — Node 26 documentation marks the API **Stability 1.2,
    Release Candidate**, not stable. It is a promising no-extra-package local
    binding but cannot currently be described as a stable production surface.
    Source: [Node.js SQLite API](https://nodejs.org/api/sqlite.html)

44. **`better-sqlite3` 12.10.0** — **candidate technology**, not selected. The
    original project provides synchronous transactions and prebuilt binaries
    for supported LTS Node versions. It is a native addon, and compatibility
    with Node 26 Current, Windows, the exact SQLite library, and the project's
    distribution model must be proven before adoption.
    Sources: [better-sqlite3 repository](https://github.com/WiseLibs/better-sqlite3),
    [releases](https://github.com/WiseLibs/better-sqlite3/releases)

45. **Semantic Versioning 2.0.0 and npm `engines`** — useful for declaring a
    compatibility range, but an `engines` field is advisory unless the package
    manager/environment enforces it. Compatibility must be tested as a matrix,
    not inferred from version syntax.
    Sources: [SemVer](https://semver.org/),
    [npm package `engines`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines)

### 10. Verification and fault research

46. **fast-check 4.x model-based and race testing** — **candidate technology**.
    Command models, generated sequences, shrinking, deterministic seeds, and
    scheduled race execution are relevant to total transitions, idempotency,
    and writer races. Generation is not exhaustive and a model sharing the
    implementation's assumptions can repeat its bugs.
    Sources: [model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/),
    [race conditions](https://fast-check.dev/docs/advanced/race-conditions/),
    [fast-check repository](https://github.com/dubzzz/fast-check)

47. **TLA+ and TLC** — **optional formal-method candidate**. TLC can explore
    finite models for safety/liveness violations in transition, dispatch,
    cancellation, and recovery protocols. It is a model checker, not a test of
    the Node implementation or Codex host, and should only be introduced if the
    state-space risk justifies its cost.
    Sources: [TLA+ home](https://lamport.azurewebsites.net/tla/tla.html),
    [TLA+ tools](https://lamport.azurewebsites.net/tla/tools.html)

48. **SQLite testing methodology** — the SQLite project exercises OOM, I/O,
    crash, power-loss, fuzz, and compound failures with integrity checks. It is
    a strong reference for required crash-boundary testing, but much of its
    harness is project-specific and not reusable as-is.
    Source: [How SQLite is tested](https://www.sqlite.org/testing.html)

49. **Toxiproxy** — **candidate test tool** for deterministic TCP latency,
    timeouts, resets, bandwidth limits, connection limits, and packet loss. I
    does not cover disk faults, process crashes, clock anomalies, or Codex-native
    tool delivery.
    Source: [Shopify Toxiproxy](https://github.com/Shopify/toxiproxy)

50. **Node.js test runner** — built-in original-project test facility and the
    minimal-dependency baseline to compare with additional property/fault tools.
    Its availability does not by itself supply state-model, crash, or hos
    conformance coverage.
    Source: [Node.js test runner](https://nodejs.org/api/test.html)

## Evidence-backed candidate shortlis

This table records research fitness only. It is deliberately not a selection.

| Need | Credible local candidate or source pattern | Research verdict | Unresolved adoption gate |
| --- | --- | --- | --- |
| Envelope/schema validation | Existing Ajv + JSON Schema 2020-12 | Strong candidate | Freeze dialect, strict settings, size/depth bounds, standalone/runtime mode |
| Canonical digests | RFC 8785 JCS + SHA-256 | Strong candidate | Numeric/Unicode input policy and exact artifact boundaries |
| Durable single-writer state | SQLite transaction/journal model | Strong architectural candidate | Stable Node binding, Windows durability assumptions, schema/recovery protocol |
| Source/worktree binding | Git porcelain/rev-parse/worktree observations | Strong required basis | Exact normalized tuple, scoped dirty policy, timing and TOCTOU boundary |
| Invocation/evidence vocabulary | UUIDv7, SLSA, in-toto, W3C PROV | Useful vocabulary | Minimal schema and trust/verification policy |
| Correlated telemetry | Trace Context + OpenTelemetry | Optional observability layer | Must remain non-canonical and non-authoritative |
| Cooperative local cancellation | AbortController/AbortSignal | Strong in-process primitive | Host interrupt receipt and effect reconciliation remain separate |
| State/race properties | fast-check | Strong candidate | Independent model/oracle, deterministic replay, coverage policy |
| Formal concurrency model | TLA+/TLC | Optional | Benefit versus maintenance cost |
| Durable-workflow semantics | Temporal docs | Benchmark only | External service prohibited; translate only proven concepts |
| Codex execution adapter | Official Codex subagent operations | Only permitted execution host | Eight host facts remain empirical/unknown |

## What is needed before a successful reference run can be claimed

The research indicates nine evidence packages, without yet prescribing their
implementation:

1. a closed outcome and reason vocabulary plus a total command/node/run
   transition specification;
2. a canonical identity and digest specification for graphs, packets, results,
   events, evidence, source, worktree, host, and correlation IDs;
3. a transactional single-writer persistence and crash-recovery contract;
4. a two-phase dispatch, idempotency, retry, budget, deadline, and late-resul
   contract;
5. a cancellation contract that distinguishes intent, request, acknowledgement,
   confirmed termination, failure, and unknown outcome;
6. a controller-observed source/worktree/host attestation and evidence resolver;
7. a least-authority and untrusted-input boundary for workers, tools, recovery,
   storage, and logs;
8. contract, property, concurrency, corruption, crash, security, and negative
   tests; and
9. a Codex-native conformance probe suite for the undocumented host facts.

Only after those packages have explicit acceptance criteria and evidence can a
new real Multi-Agent Pipeline reference run test the kernel rather than merely
repeat the original uncertainty.

## Research conclusions and retained constraints

- No single standard or product supplies the complete execution kernel
  contract. The result must combine state-machine, schema, canonicalization,
  transaction, provenance, security, and host-specific evidence disciplines.
- “Exactly once” is not a defensible blanket claim. The evidence supports
  atomic local commits, idempotent command receipts, duplicate detection, and
  reconciliation of ambiguous external effects as separate mechanisms.
- Timeouts and cancellation are observations/requests until the target effec
  or worker termination is confirmed. They are not success or rollback.
- Telemetry is not the canonical audit ledger. Provenance envelopes do not make
  claims true, and hashes do not prove origin.
- The newest version is not automatically the best supported version. Current,
  Active LTS, Maintenance LTS, Release Candidate, draft, and final-standard
  status must remain visibly distinct.
- The no-external-LLM/model constraint is fully compatible with this research:
  Codex remains the only agent execution host, while local deterministic code,
  Git, schemas, hashes, transactional storage, and tests provide the control
  plane.
- The unresolved Codex host facts cannot be fixed by further web research.
  They require bounded, read-only or synthetic Codex-native conformance runs
  before they may influence an execution guarantee.

## Documentation route note

Context7 was used to check the current Ajv and fast-check documentation route.
The catalog cites direct standards bodies, OpenAI documentation, official
vendor documentation, and original project sources because they are the
authoritative publication locations for the claims above. No external model or
model API was used.
