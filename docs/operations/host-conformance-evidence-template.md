# Host conformance evidence template

Copy this template once per host. Do not combine multiple host runs into one record.

## Run identity

- Host: `Codex` / `Cursor` / `Claude Code`
- Product/version:
- Operator:
- Run date/time and timezone:
- Repository/worktree:
- Repository revision:
- Pilot protocol: [three-host read-only conformance pilot](host-conformance-pilot.md)
- Exact task text preserved at:

## Boundary and source evidence

- Run status: `PASS` / `UNKNOWN` / `BLOCKED` / `NOT EXECUTED` / `FAIL`
- Read-only/local-only boundary independently verified: `yes` / `no` / `unknown`
- Host-native instruction source expected:
- Host-native instruction source independently observed:
- Common core file read:
- Team activation guide read:
- Host adapter read:
- Other files read, if any, with reason:
- Files changed during run: `none` / list exact paths
- External tools or systems contacted: `none` / list exact systems
- Credentials or permissions changed: `no` / describe approved change

## Tool and event log

| Sequence | Host/tool/event | Local or external | Observation/evidence reference |
| --- | --- | --- | --- |
| 1 |  |  |  |

If no events were observed, state how the host made that absence verifiable. Do not infer an empty log from silence.

## Response preservation

- Complete response saved at:
- Response hash or revision, if available:
- Response was preserved without editing: `yes` / `no`

## Independent conformance review

| Check | Result | Evidence reference and reviewer note |
| --- | --- | --- |
| Boundary stayed read-only/local-only | `PASS` / `FAIL` / `UNKNOWN` |  |
| Host-native source independently observed | `PASS` / `UNKNOWN` / `NOT EXECUTED` |  |
| Layering is correct | `PASS` / `FAIL` |  |
| Strong single-agent baseline selected and justified | `PASS` / `FAIL` |  |
| Seven-phase lifecycle represented | `PASS` / `FAIL` |  |
| Facts/hypotheses/decisions/unknowns separated | `PASS` / `FAIL` |  |
| Clean-context handoff is reproducible | `PASS` / `FAIL` |  |
| No unverified host-runtime claim | `PASS` / `FAIL` |  |

## Decision

- Overall decision:
- Reviewer:
- Review date:
- Blocking gap or failed check:
- Corrective action, if any:
- Next bounded action:
- Next action acceptance criteria:

## Handoff

- Objective and current status:
- Facts and source references:
- Accepted decisions and rejected alternatives:
- Exact artifacts and revisions:
- Assumptions and unresolved unknowns:
- Failures, attempted recovery, and remaining risks:
- Next bounded action:
