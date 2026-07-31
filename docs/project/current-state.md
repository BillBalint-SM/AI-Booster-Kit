## Branch and pull request

`main` is at merge commit `b806ee8`; PR #8, `Preserve Codex preflight diagnostics`, is merged. The current review branch `codex/preflight-diagnostics-hardening` is based on that merge and contains the host-side Codex MCP preflight runner hardening on top of the explicit transport-source contract, raw payload normalizer, MCP read mapper and adapter contracts, composite Confluence page read, read-only tool-caller binding, evidence-ingestion boundary, and their tests.

## Completed deliverable

The contract-first V1 runtime, local G2AS readiness certificate, native GitHub MCP read-only capability standard, explicit Codex MCP transport-source contract, raw Codex MCP payload normalizer, MCP read mapper/adapter contracts, composite Confluence page read, read-only Codex MCP tool-caller binding, Codex-only read-only evidence-ingestion boundary, and host-side preflight runner are implemented and validated. The preflight runner accepts an injected exact read-only caller, performs the nine fixed reads, passes source results through normalization and evidence ingestion, and writes only the two safe certificate files. It has no MCP discovery or activation, retry, connector write, OAuth, or raw-payload persistence path. A fresh direct Codex MCP composite read for the fixed G2AS target passed through the mapper and boundary as `READY`, with all four checks verified, zero external writes, and Jira/Confluence/GitHub unchanged. One approved Confluence update changed page `31752193` from version `1` to `2`, replacing the text-only GitHub commit reference with a native Smart Link to commit `d0971f75c526250f9ee65b8b3b044a4788b31a46`.

## Validation

`npm run lint`, `npm run check:docs`, `npm test` (168/168), `npm run cli -- validate --contract contract/team-contract.md`, and `npm run cli -- conformance` pass locally. `npm run check:mappers` remains `MAPPER_FRESHNESS=NOT_READY` because the checked-in graph metadata source commit predates later repository source changes. The lower-level composite live read audit is `READY`; the host-side runner is covered by synthetic exact-caller tests, including safe source-specific failure diagnostics, explicit timeout classification, generic scope failures, and invalid capability evidence. No Jira, Confluence, or GitHub write occurred.

## Known limit

The raw normalizer, mapper, transport contract, and tool-caller binding were validated against source-derived live MCP results; the host-side preflight runner and atomic certificate publication are validated with synthetic exact-caller tests. The runner emits `READY` after a fully verified read and a safe `STOPPED` certificate with a source-specific diagnostic when the read boundary rejects a result. Untyped caller failures are classified as `SCOPE_UNVERIFIED`; only an explicitly typed timeout is classified as `TIMEOUT_UNKNOWN`. Invalid capability evidence is replaced in the STOPPED certificate by a redacted unknown placeholder. `NOT READY` remains supported by the normalized-observation CLI; the runner does not synthesize it from an incomplete raw MCP payload. The composite page reader is explicit for this Codex MCP shape; no automatic MCP tool discovery/activation or generic external synchronization is implemented. The local V1 CLI does not activate live connectors, and connector activation and host configuration remain outside the supported runtime boundary.

## Open stop

No further external write is authorized by default. Any new Jira, Confluence, or GitHub operation requires a fresh exact target, operation, approval, and source-native read-back. Do not infer generic connector readiness from this one successful sandbox operation.

## Next bounded action

Review the hardening diff for the host-side preflight runner, then commit and publish it only after explicit approval. Any broader tenant or synchronization work requires a new exact target, grant, and read-back. Keep writes, OAuth, connector installation, host configuration, lifecycle transitions, and generic synchronization disabled.
