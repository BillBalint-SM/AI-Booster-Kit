## Branch and pull request

`main` is at merge commit `45ad7e6`; PR #6, `Versioned mapper snapshots`, is merged. The current review state contains the explicit Codex MCP transport-source contract, raw payload normalizer, MCP read mapper and adapter contracts, the composite Confluence page read, the read-only Codex MCP tool-caller binding, the evidence-ingestion boundary, their tests, the two CRLF/LF portability test changes, and this routing update.

## Completed deliverable

The contract-first V1 runtime, local G2AS readiness certificate, native GitHub MCP read-only capability standard, explicit Codex MCP transport-source contract, raw Codex MCP payload normalizer, MCP read mapper/adapter contracts, composite Confluence page read, read-only Codex MCP tool-caller binding, and Codex-only read-only evidence-ingestion boundary are implemented and validated. The transport contract creates a frozen exact request with `mcp`/`read`/`readOnly` scope, fixed target identity, and four allowlisted read operations; extra or write-shaped source fields fail closed. The tool-caller binding exposes only the named read methods and performs the exact target-bound reads without retry or write path. The normalizer handles the actual MCP `structuredContent` and `content[0].text` envelopes, Confluence ADF plus exact page-ARI metadata/version, exact target identifiers, fixture revisions, Jira remote links, and Confluence native Smart Links; the resulting record passes through the existing readiness/evidence interfaces. A fresh direct Codex MCP composite read for the fixed G2AS target passed through the mapper and boundary as `READY`, with all four checks verified, zero external writes, and Jira/Confluence/GitHub unchanged. One approved Confluence update changed page `31752193` from version `1` to `2`, replacing the text-only GitHub commit reference with a native Smart Link to commit `d0971f75c526250f9ee65b8b3b044a4788b31a46`.

## Validation

`npm run lint`, `npm run check:docs`, `npm test` (162/162), `npm run cli -- validate --contract contract/team-contract.md`, and `npm run cli -- conformance` pass locally. The composite live read audit is `READY`; all four checks are verified, the Confluence page ARI/version and ADF Smart Links agree, and no Jira, Confluence, or GitHub write occurred.

## Known limit

The raw normalizer, mapper, transport contract, and tool-caller binding were validated against source-derived live MCP results and synthetic exact caller results. The composite page reader is explicit for this Codex MCP shape; no automatic MCP tool discovery/activation or generic external synchronization is implemented. The local V1 CLI does not activate live connectors, and connector activation and host configuration remain outside the supported runtime boundary.

## Open stop

No further external write is authorized by default. Any new Jira, Confluence, or GitHub operation requires a fresh exact target, operation, approval, and source-native read-back. Do not infer generic connector readiness from this one successful sandbox operation.

## Next bounded action

Preserve the composite contract as the bounded Codex MCP integration seam; any broader tenant or synchronization work requires a new exact target, grant, and read-back. Keep writes, OAuth, connector installation, host configuration, lifecycle transitions, and generic synchronization disabled.
