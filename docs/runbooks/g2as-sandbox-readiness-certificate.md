# G2AS Sandbox Readiness Certificate

## Purpose and boundary

The certificate is a local, read-only assessment of one synthetic evidence
bundle for the fixed G2AS sandbox target. It evaluates the target manifest and
normalized Jira, Confluence, GitHub, and cross-system traceability observations.
It performs zero external writes and does not configure a connector, OAuth,
browser, or continuous synchronization.

Review `contract/readiness/g2as-sandbox-target.json` before every run. It is
the literal target record for the credential-free tenant origin, Jira project
and issue, Confluence space and page, GitHub repository, branch, frozen commit,
and fixture paths. Stop for remediation if an intended target differs from that
manifest; do not adjust the manifest to make collected evidence fit.

## Approved evidence boundary

The input is an approved, normalized observation bundle only. Each observation
must declare one of these read paths:

- `mcp` for host-collected read-only connector evidence.
- `tenant_aware_chrome` for the tenant-resolved, read-only browser fallback.

The certificate generator never performs either path itself. It rejects raw
payloads, transcripts, credentials, authorization data, cookies, arbitrary
URLs, and unrecognized fields. It also does not retry unknown external results
or offer a bypass for a hard stop.

The native GitHub MCP read-only capability standard is declared in
`contract/mcp-capabilities/github-readonly.json`. Its Codex, Claude Code, and
Cursor Markdown templates are generated projections under `templates/hosts/`.
They describe the exact read-only evidence boundary; they do not install or
configure an MCP server, request OAuth, or authorize a connector. A valid
certificate requires capability evidence matching the manifest and a native
GitHub Smart Link in the Confluence traceability observation. A text-only Git
reference is a hard stop.

## Local command

Choose one explicit local output directory. The command creates only the
Markdown and JSON certificate files in that directory:

```powershell
npm run cli -- readiness --manifest contract/readiness/g2as-sandbox-target.json --capability contract/mcp-capabilities/github-readonly.json --observations <approved-normalized-observations.json> --output-dir <certificate-output-directory>
```

The output declares `externalWriteCount: 0`; local output files are the only
permitted write performed by this command.

## Local verification record

The following local-only verification ran on 2026-07-29. It used no Jira,
Confluence, GitHub, MCP, browser, OAuth, credential, or network operation.

| Check | Input or command | Result |
| --- | --- | --- |
| Static analysis | `npm run lint` | Passed |
| Build | `npm run build` | Passed |
| Full local suite | `npm test` | 144 passed, 0 failed |
| CLI ready fixture | `test/fixtures/readiness/ready.json` | `READY`, exit `0`, exactly two local certificate files, `externalWriteCount: 0` |
| CLI capability-stop fixture | `test/fixtures/readiness/not-ready.json` | `STOPPED`, exit `3`, exactly two local certificate files, `externalWriteCount: 0` |
| CLI target-stop fixture | `test/fixtures/readiness/stopped.json` | `STOPPED`, exit `3`, exactly two local certificate files, `externalWriteCount: 0` |
| CLI completed non-verification | `test/readiness-cli.test.ts` | `NOT READY`, exit `2`; the test constructs the allowed local observation bundle and invokes the built CLI |
| Secret and transport scan | `src/readiness` and the three rendered output directories | 0 credential/header/transcript leakage matches; 0 HTTP/OAuth/WebSocket call matches |

`not-ready.json` is deliberately a hard-stop fixture: its unknown capability
is unsafe to continue with, so its terminal decision is `STOPPED`, not `NOT
READY`. The separate completed non-verification test covers the safe
incomplete-evidence decision and its exit code.

## Decision interpretation

- `READY` means all four normalized checks match the fixed manifest and have
  verified capability evidence. It does not authorize any external write.
- `NOT READY` means evidence is safely incomplete or mismatched without a hard
  stop. Correct the declared evidence, target preparation, or dependency, then
  collect a new normalized bundle.
- `STOPPED` means target identity, scope, capability, read path, traceability,
  or external completion is unsafe, ambiguous, or unverifiable. Preserve the
  safe certificate and use the described remediation; do not continue.

Remediation is limited to reviewing the manifest, correcting the normalized
evidence source or target mapping, and collecting a fresh allowed read-only
bundle after the problem is resolved. It never includes deletion, permission
change, workflow rollback, connector broadening, or an external write.

## Separate live-read approval gate

This runbook does not authorize a real G2AS read. A reviewed local certificate,
including `READY`, is not approval to use an external tool.

Before any live tool use, the user must separately and explicitly approve all
of the following: the literal target in the manifest, the selected read-only
path (`mcp` or `tenant_aware_chrome`), collection of the four named source
observations, normalized local-bundle generation, and local certificate
rendering. The approval must remain read-only. It never authorizes a write,
OAuth change, connector installation, permission change, or continuous
synchronization.
