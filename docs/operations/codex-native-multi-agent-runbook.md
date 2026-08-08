# Transactional execution and Codex-native reference run

## Purpose and current boundary

This runbook operates the local, model-free execution persistence and
source/worktree plus host-evidence binding layers. It defines the stop gate
before Codex-native dispatch and a single-agent versus multi-agent reference
run. The approved
[transactional persistence design](../superpowers/specs/2026-08-08-transactional-persistence-runtime-binding-design.md),
[implementation plan](../superpowers/plans/2026-08-08-transactional-persistence-runtime-binding.md),
[persistence policy](../../contract/execution/persistence-policy.json),
[binding design](../superpowers/specs/2026-08-08-source-worktree-host-evidence-binding-design.md),
and [binding policy](../../contract/execution/binding-policy.json) are the
canonical requirements.

The binding layer returns a digest-bound `READY`, `STOPPED`, or `UNKNOWN`
inspection result without dispatching an agent. `record-execution-dispatch`
still rejects single-phase host evidence, and `stop-execution` still rejects an
unverified stop. Two-phase Dispatch, verified cancellation, and the new
immutable-revision reference run remain later bounded work.

## Practical operating contract

Future end users do not configure SQLite, create tables, choose journal modes,
or manage schema versions. The platform creates and validates one database per
normalized workspace identity. The transitional developer CLI still requires
an explicit absolute workspace and local application-data root so that tests
and host integrations cannot guess a target:

```powershell
node dist/cli.js prepare-execution `
  --workspace <absolute-workspace> `
  --app-data-root <absolute-local-data-root> `
  --controller-id <controller-id>
```

Preparation reads the envelope and graph from stdin and returns
`workspaceId`, `databasePath`, `runId`, `controllerId`, `fencingToken`,
`runtimeReceiptId`, and the observed runtime lane. Subsequent read commands use
`--database <absolute-database> --run <run-id>`. Mutating commands add
`--controller-id <id> --fencing-token <positive-integer>`.

For the platform operator this slice introduces no database server, hosted
service, model API, or per-run vendor charge. The material obligations are
local disk capacity for databases, exports, and retained backups; CI time for
the four operating-system/runtime entries; release support for forward-only
migrations; and user support for explicit recovery or restore decisions. The
kernel provides no cloud retention, centralized monitoring, or managed backup
service.

## Runtime and storage location

Node 24 is the authoritative LTS lane from `24.18.0`. Node 26 is admitted from
`26.7.0` for conformance evidence only. A Node 26 result cannot be relabelled
authoritative. Runtime, native SQLite binding, policy, dependency lock, kernel
revision, platform, and host session are bound into an immutable receipt before
a run is created.

The application-data root must be on a local filesystem. The database is
stored below the platform-managed workspace identity directory as
`execution-workspaces/<workspaceId>/execution.sqlite`; it is never created in
the repository. UNC/network roots, symlink boundaries, relative targets, and
workspace/application-data overlap are rejected.

The database and its backups can contain plaintext accepted artifacts and
operational evidence. This contract makes no at-rest encryption claim. Do not
admit credentials, tokens, cookies, authorization headers, prompts,
transcripts, hidden reasoning, raw connector payloads, environment dumps,
arbitrary personal paths, or other unnecessary personal data. There is no Team
or cloud synchronization in this layer.

## Transactional behavior

The append-only event ledger is semantic authority. A graph/checkpoint view,
artifact, quota reservation, controller lease observation, and applicable
receipt commit in the same short SQLite transaction. The controller ID,
fencing token, runtime receipt, ledger head, and graph revision are reread in
that transaction. A stale or competing writer fails without waiting, retrying,
stealing a lock, or committing a partial representation.

The byte, event, workspace, and backup ceilings are defined only in the
[persistence policy](../../contract/execution/persistence-policy.json). An
over-limit operation fails before a durable mutation or rolls back completely;
the runbook does not duplicate those numeric limits.

## Developer CLI surface

### Read-only host and source readiness

Create a host receipt from one exact read-only run locator:

```powershell
$hostInput | node dist/cli.js create-execution-host-receipt `
  --database <database> --run <run-id>
```

`$hostInput` is one bounded JSON object containing only `hostProfileId`, the
complete capability observations, and a canonical `observedAt` timestamp. The
CLI reads the current Codex task identity directly from the allowlisted
`CODEX_THREAD_ID`, validates its UUID shape, immediately domain-hashes it, and
binds the digest to the canonical controller and stored runtime receipt. The
raw task ID is never an argument, output, receipt field, log value, or error
value. Capability input is a controller observation; it is not worker
self-attestation or proof of a sandbox/security boundary.

Inspect one prepared node with a previously created host receipt and an
explicit source scope:

```powershell
$readinessInput | node dist/cli.js inspect-execution-dispatch-readiness `
  --database <database> --run <run-id> --node <node-id>
```

`$readinessInput` has exactly `hostReceipt`, `sources`, and `observedAt`. Every
source entry has exactly `sourceId`, transient absolute `workspaceRoot`, and a
non-empty `auditedPaths` list. There is no implicit source scope. Use
`auditedPaths: ["."]` for the complete worktree; otherwise supply only
canonical slash-normalized repository-relative literal paths. The CLI derives
the expected source revision, workspace identity, task ID, envelope hash,
graph revision, controller, and runtime receipt from canonical loaded state.
It does not accept those identities from stdin.

The inspection opens SQLite read-only, reobserves Git with fixed no-shell,
no-optional-lock commands, verifies the current Codex session against the host
receipt, creates one source observation per node source, and returns the host
receipt, source observations, and `DispatchReadinessReceipt`. Absolute paths,
Git output, filenames, raw host values, prompts, transcripts, and repository
content do not cross the canonical output boundary.

Exit status and remediation are closed:

- `0` means `READY`: all required bindings match and the audited scope is
  clean. `READY` performs no dispatch, persists no intent or receipt, consumes
  no budget, and grants no authority.
- `2` means `STOPPED` or `UNKNOWN`. For `STOPPED`, preserve the receipt and
  select the exact bound run/worktree/revision or provide the missing approved
  authority; do not retry against a widened scope. For `UNKNOWN`, establish
  the missing source, session, capability, authority, or instruction
  observation and run a new inspection. Neither state authorizes dispatch.
- `3` is a sanitized structural or contract rejection and `4` is a sanitized
  command-configuration/unreadable-target rejection. Correct the bounded input
  or exact locator; rejected content is not echoed and no fallback path is
  selected.

A legacy runtime receipt whose host session is not a normalized 64-hex Codex
session digest remains `UNKNOWN`. This slice does not upgrade or rewrite
legacy runs. A newly proven current session that differs from the stored
session is `STOPPED`, not a migration or retry signal.

Read-only task preparation:

```powershell
node dist/cli.js prepare-execution-node `
  --database <database> --run <run-id> --node <node-id>
```

Result acceptance, rejection, repair, and finalization use the same locator and
explicit authority prefix:

```text
--database <database> --run <run-id>
--controller-id <controller-id> --fencing-token <positive-integer>
```

Each command calls one command-specific transactional function. A terminal
`STOPPED` or `UNKNOWN` Result Envelope is stored as terminal evidence and
cannot become success. A rejected malformed or unsafe result stores no raw
response. Finalization writes the terminal event and canonical JSON/Markdown
artifacts together.

Comparison uses explicit locators:

```powershell
node dist/cli.js compare-execution-runs `
  --single-database <database> --single-run <run-id> `
  --multi-database <database> --multi-run <run-id>
```

## Backup, migration, and restore

A backup uses SQLite backup semantics while no write transaction is active. It
becomes valid only after a separate connection verifies integrity, schema,
workspace and policy identity, file digest, and size. The canonical sidecar is
written and read back before the active database registers the backup receipt.
A partial or invalid file remains unregistered evidence and cannot authorize a
migration.

Migrations are forward-only, strictly ordered, digest-bound registry steps. A
verified backup is mandatory. Accepted SQL, storage metadata, `user_version`,
and the migration receipt commit in one exclusive transaction. Destructive
steps require explicit approval. There is no downgrade command.

Restore creates and verifies a new staging database. It never overwrites,
renames, deletes, or automatically activates the current database. Activation
requires a separate future recovery design and explicit authority.

## Restart and recovery

A recovery audit uses a separately opened inspection session and returns one
closed disposition:

- `HEALTHY`
- `PROJECTION_REBUILD_REQUIRED`
- `PENDING_EFFECT_RECONCILIATION_REQUIRED`
- `CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED`
- `STORAGE_CORRUPT`
- `UNSUPPORTED_SCHEMA_OR_RUNTIME`

The audit does not insert a receipt, replay a host action, retry a pending
effect, transfer ownership, or repair storage. Projection rebuild and ownership
reconciliation are separate explicit transactions that consume the matching
prior audit. A corrupt or unsupported database remains stopped.

## Immutable legacy import

Legacy file-backed runs are read only through `readLegacyExecutionRun` and
imported only through `importLegacyExecutionRun`. Import validates the exact
source file set, canonical documents, ledger, graph/checkpoint, artifacts,
content policy, source identity, and destination quotas before one destination
transaction. The receipt stores normalized identities and sorted file digests,
not the raw source path. Success and failure leave every legacy source byte
unchanged. There is no conversion, rename, annotation, or deletion command.

## Verification and reference-run stop gate

The binding acceptance criteria map to executable behavior by exact test name:

| Criterion | Primary executable evidence |
| --- | --- |
| Policy, limits, and stable identity | `binding policy parses the approved exact contract and produces one stable digest`; `binding policy rejects unknown, missing, duplicate, and invalid bounded values` |
| Direct host-session privacy and uncertainty | `Codex host observer domain-binds a canonical UUID without retaining the raw value`; `Codex host observer preserves absent and malformed task identity as UNKNOWN` |
| Complete canonical host evidence | `host receipt deterministically normalizes the complete capability set`; `host receipt parser rejects every identity and evidence tamper`; `host receipt rejects raw host, tool, path, and sensitive content without echoing it` |
| Explicit contained source scope | `source path scope resolves the database-bound whole worktree without an implicit default`; `source path scope rejects traversal, absolute, wildcard, non-canonical, duplicate, and mixed whole-worktree input`; `source path scope rejects linked roots and audited junction ancestors` |
| Bounded real Git observation | `bounded process rejects either stream one byte over and reports confirmed closure`; `source observer classifies real Git dirty records and ignores excluded or ignored paths`; `source observer distinguishes revision, workspace, and worktree identities`; `source observation leaves Git head, index, config, and status unchanged` |
| Total deterministic readiness | `dispatch readiness deterministically binds a real loaded run, task, host, and source without mutation`; `dispatch readiness applies STOPPED over UNKNOWN over READY with complete sorted reasons`; `readiness parser rejects state, identity, reason, ordering, field, and byte tampering` |
| Read-only CLI and input boundary | `bounded JSON reader handles empty, UTF-8 chunks, exact limits, overflow destruction, and stream errors`; `binding CLI produces READY from a real immutable run and changes neither SQLite nor Git`; `binding CLI preserves STOPPED and UNKNOWN across real source and host boundaries`; `single-phase dispatch and unverified stop remain protocol violations without mutation` |

Local verification is:

```powershell
npm ci
npm audit
npm run lint
npm run check:docs
npm test
git diff --check
```

CI must independently pass Node 24 authoritative and Node 26 conformance lanes
on Ubuntu and Windows. The lane environment variable is only an expected value;
the runtime test compares it with the independently observed and persisted
receipt.

Do not begin two-phase Native Dispatch or the immutable-revision Codex-native
reference run unless both runtime lanes pass on both operating systems, the
implementation revision is immutable, the complete binding receipt is
`READY`, and crash, recovery, backup, migration, staging restore, legacy
import, quota, forbidden-content, and no-legacy-write checks are green. Missing
evidence remains `NOT EXECUTED`, `UNKNOWN`, `STOPPED`, or `PARTIAL`.

The later reference run remains Personal-only, read-only with respect to the
audited source, and entirely inside the Codex app. It uses no external model,
model API, connector, external read/write, cross-session proof, Team sync, or
host-security claim. Only a separately approved normalized receipt may enter
repository history; prompts, transcripts, reasoning, raw collaboration
messages, personal paths, credentials, account data, and arbitrary URLs remain
excluded.
