# G2AS Research and Validation Runbook

**Status:** Local synthetic validation contract; it does not authorize a remote operation.

**Fixture:** Jira `G2AS-1`, Git commit `d0971f75c526250f9ee65b8b3b044a4788b31a46`, paths `docs/fixtures/G2AS-1.md` and `docs/fixtures/G2AS-1.json`, and the labelled Confluence projection recorded in the Gate 2 evidence.

**Decision boundary:** Gate 2 is `remediate and repeat`. This runbook proves only local context handling and source-native evidence discipline. It does not prove Atlassian connector isolation, OAuth behavior, tenant permissions, latency, cost, Cursor behavior, Claude Code behavior, or Rovo safety.

## Operating sequence

```text
read → validate → propose → approve → write → read back
```

This runbook executes only the `read` and `validate` portions against the recorded synthetic fixture. The proposal and write sections define gates but are not executed by this local procedure.

## 1. Research input contract

A valid research request must include every field below:

| Field | Required value or meaning |
| --- | --- |
| Jira ID | Exact accepted issue key, here `G2AS-1`. |
| Accepted summary | `[G2AS pilot] Show a synthetic health-status badge`. |
| Acceptance criteria | All four accepted criteria: render `Healthy`, `Degraded`, and `Unavailable`; deterministic state-to-label mapping covered by tests; accessible label; repository artifact and test result linked before `Review`. |
| Immutable Git revision | Exact SHA `d0971f75c526250f9ee65b8b3b044a4788b31a46`; do not substitute branch head. |
| Fixture paths | `docs/fixtures/G2AS-1.md` and `docs/fixtures/G2AS-1.json`. |
| Projection reference | The labelled G2AS-1 Confluence projection recorded in the Gate 2 evidence; Confluence is a projection, not lifecycle truth. |
| Actor role | Named role such as human QA/read-only verifier, BA, DEV, PO/PM, or source owner; never a credential or token in the context packet. |
| Target boundary | PTE Atlassian site, Jira project `G2AS`, synthetic data only, and the specific requested read or proposal operation. |

If any required field is missing, malformed, stale, conflicting, inaccessible, or target-mismatched, reject the request before source access or any write-capable operation.

## 2. Research procedure

1. Resolve the exact Jira ID and read the accepted human-readable context through Jira or recorded source-native evidence.
2. Resolve the immutable Git SHA and confirm both fixture paths at that revision.
3. Resolve the labelled Confluence projection and verify that it identifies itself as a projection while Jira remains lifecycle truth.
4. Record the current Jira status and the evidence timestamp when available.
5. Reconcile the Jira ID, accepted summary, four criteria, Git SHA, fixture paths, and projection reference.
6. Record every unavailable or unmeasured dimension as `UNKNOWN` rather than estimating it.
7. Produce a bounded proposal only after validation passes; the proposal must reference the evidence packet and cannot mutate source state.

## 3. Validation classifications

Use only the classifications below. A classification is an evidence result, not a recovery instruction.

| Classification | Meaning | Required evidence | Next action |
| --- | --- | --- | --- |
| `MALFORMED_CONTEXT` | The supplied machine-readable context cannot be parsed or violates its known structure. | Preserve the sanitized validation error and the input category; do not include secrets or full sensitive payloads. | Stop before source access; request a corrected accepted artifact. |
| `STALE_CONTEXT` | The supplied revision does not match the authoritative immutable revision. | Record supplied revision category and authoritative SHA; do not replace it with branch head. | Stop; reacquire the accepted revision through the source owner. |
| `SCOPE_VIOLATION_STOP` | A result, target, cloud, project, source, or requested operation falls outside the approved boundary. | Record sanitized scope-violation fact, target boundary, time, and stop action; do not retain unrelated content. | Stop immediately; no retry, alternate identity, or permission expansion. |
| `BLOCKED / NOT EXECUTED` | The approved path could not be run because its required identity, client, permission, host, or runtime was unavailable. | Record the blocker and prove that no source response or success was inferred. | Keep the evidence gap open; do not substitute another path as equivalent. |
| `PASS` | All required context and boundary checks passed for the named local/source-native observation. | Record exact IDs, accepted content references, immutable revision, paths, status, source surface, and timestamp. | Permit only the next phase allowed by a separate approval. |
| `UNKNOWN` | The event was not measured or the evidence is insufficient to classify it as pass/fail. | Record missing numerator/denominator, duration, audit, cost, or host evidence. | Do not claim comparison, improvement, or promotion. |

Never silently fall back to a branch head, another cloud, another project, another identity, transcript memory, an agent summary, or a successful tool response from a different host.

## 4. No-write baseline procedure

The local baseline is valid only when all checks below are recorded:

- Jira `G2AS-1` resolves to the accepted synthetic Story and current status is recorded.
- The accepted summary and all four acceptance criteria match the recorded Gate 2 evidence.
- Git SHA `d0971f75c526250f9ee65b8b3b044a4788b31a46` is used exactly, with both fixture paths present.
- The Confluence page is identified as the labelled projection and is not treated as lifecycle state.
- Malformed and stale local fixtures are rejected before any source operation.
- Connector, OAuth, host, latency, cost, or tenant claims are not inferred from the manual baseline.
- No Jira transition/edit/comment/link, Confluence publication, Git commit/push, identity change, permission change, Rovo action, or recovery write is performed by the baseline.

The recorded Gate 2 manual baseline is a context-fidelity observation, not evidence of autonomous completion, implementation correctness, test/review success, sync freshness, or cross-host parity.

## 5. Proposal gate

Before a proposal is treated as actionable, it must include:

- the exact accepted Jira ID and immutable revision;
- the requested outcome and the source-of-truth boundary;
- evidence links and all unresolved `UNKNOWN`/blocked fields;
- the intended actor role and minimum permission scope;
- the exact proposed target/action, expected impact, duplicate rule, post-read, audit reference, and recovery path;
- the human approval role required for publication or consequential state change.

The proposal is not an approval. It cannot transition Jira, publish Confluence, push Git, authenticate OAuth, call Rovo Write, or authorize another agent/sub-agent to do so.

## 6. Write gate, defined but not executed here

Any future sandbox write requires fresh approval immediately before execution that names:

1. exact source, target, field/link/page/repository, and actor role;
2. permission and credential boundary without exposing the credential;
3. accepted source revision and exact intended impact;
4. exact-URL/field duplicate rule and pre-read result;
5. one write only, with no blind retry;
6. post-read, source-native history/audit reference, and current-state comparison;
7. visible correction or recovery path requiring a separate approval if the result is partial or ambiguous.

This local runbook does not authorize a new Jira, Confluence, GitHub, OAuth, or Rovo write. In particular, it does not authorize a Rovo retry, target-isolation change, Confluence permission change, OAuth scope expansion, or a second Jira link.

## 7. Evidence handoff

The durable handoff must link:

- this runbook;
- `docs/operations/agent-operating-model.md`;
- `docs/gate-2/g2ai-pilot-evidence.md`;
- `docs/gate-2/gate-2-results-and-next-steps.md`;
- the Gate 2 plan/spec and the task brief/report ledger where available.

The handoff must preserve the current decision: retain the manual source-native path; narrow/remediate direct REST; reject the current Rovo route until target isolation is proven; and keep the Task 8 web-link write as a bounded one-off contract.
