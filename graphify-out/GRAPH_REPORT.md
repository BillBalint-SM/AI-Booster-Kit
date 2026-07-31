# Graph Report - .  (2026-07-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 823 nodes · 1992 edges · 32 communities (30 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `39c4d454`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- stop.ts
- markdown.ts
- types.ts
- outbox.ts
- manifest.ts
- sync.ts
- types.ts
- readback.ts
- profile.ts
- baseline.test.ts
- observations.ts
- package.json
- github.ts
- e2e.test.ts
- model.ts
- render.ts
- evaluate.ts
- manifest.ts
- validate.ts
- compilerOptions
- readiness-render.test.ts
- readiness-cli.test.ts
- links.ts
- finalize.ts
- check-mapper-freshness.mjs
- traceability.ts
- readiness-observations.test.ts
- types.ts
- bootstrap.test.ts

## God Nodes (most connected - your core abstractions)
1. `failure()` - 25 edges
2. `nonEmptyString()` - 21 edges
3. `OutboxStore` - 20 edges
4. `exactRecord()` - 19 edges
5. `CanonicalEvent` - 17 edges
6. `parseG2asReadinessManifest()` - 17 edges
7. `parseReadinessObservationBundle()` - 17 edges
8. `parseMarkdownContract()` - 16 edges
9. `validateCanonicalEvent()` - 16 edges
10. `parseGitHubEvidenceInput()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `canonical()` --indirect_call--> `observedAt()`  [INFERRED]
  test/evidence.test.ts → src/connectors/jira.ts
- `githubInput()` --indirect_call--> `observedAt()`  [INFERRED]
  test/evidence.test.ts → src/connectors/jira.ts
- `readFixture()` --calls--> `parseReadinessObservationBundle()`  [EXTRACTED]
  test/readiness-cli.test.ts → src/readiness/observations.ts
- `readBundle()` --calls--> `parseReadinessObservationBundle()`  [EXTRACTED]
  test/readiness-evaluate.test.ts → src/readiness/observations.ts
- `assertRejected()` --calls--> `parseReadinessObservationBundle()`  [EXTRACTED]
  test/readiness-observations.test.ts → src/readiness/observations.ts

## Import Cycles
- None detected.

## Communities (32 total, 2 thin omitted)

### Community 0 - "stop.ts"
Cohesion: 0.05
Nodes (86): AllowlistDecision, AllowlistInput, AllowlistPolicy, AllowlistValidationError, assertAllowlistedOperation(), assertNonEmptyString(), assertRecord(), assertUnique() (+78 more)

### Community 1 - "markdown.ts"
Cohesion: 0.05
Nodes (64): main(), claudeCodeAdapter, codexAdapter, cursorAdapter, createLocalHostAdapter(), CliError, createLocalObservationAdapter(), dispatchCli() (+56 more)

### Community 2 - "types.ts"
Cohesion: 0.09
Nodes (51): ConfluenceGateway, ConfluenceGatewayOptions, parseIntent(), sameArray(), validObservedAt(), GitHubGateway, GitHubGatewayOptions, parseCheck() (+43 more)

### Community 3 - "outbox.ts"
Cohesion: 0.06
Nodes (48): CanonicalEventSource, assertRecord(), createCanonicalEvent(), createIdempotencyKey(), EventInput, eventKeys, inputKeys, isNonEmptyString() (+40 more)

### Community 4 - "manifest.ts"
Cohesion: 0.10
Nodes (35): AdapterDefinition, HostCapabilityReport, HostEventInput, allowedOperations, canonicalJson(), capabilityKeys, githubScopeFingerprint(), loadGithubReadOnlyCapability() (+27 more)

### Community 5 - "sync.ts"
Cohesion: 0.11
Nodes (24): JiraProjectionIntent, CanonicalEvent, SyncResult, CapabilityProof, assertSafeEvidenceRefs(), EvidenceValidationError, safeEvidenceRefs(), evaluateAllowlist() (+16 more)

### Community 6 - "types.ts"
Cohesion: 0.11
Nodes (28): AdapterSafetyError, approvedImplementationStartEvidence, assertImplementationStartContext(), emitLocalEvent(), eventStates(), hasOnlyApprovedImplementationStartEvidence(), HostAdapter, ImplementationStartContext (+20 more)

### Community 7 - "readback.ts"
Cohesion: 0.14
Nodes (27): EvidenceValidationError, acceptsSafeString(), assertAuthorityReadBack(), AuthorityReadBackInput, compareConfluence(), compareGitHub(), compareJira(), confluenceState() (+19 more)

### Community 8 - "profile.ts"
Cohesion: 0.11
Nodes (28): AttentionState, BoardStatus, assertNonEmptyString(), assertProjectProfile(), assertStringArray(), assertStringRecord(), assertTargetIdentities(), canonicalStatuses (+20 more)

### Community 9 - "baseline.test.ts"
Cohesion: 0.12
Nodes (23): asRecord(), CapturedRequest, closeServer(), ConnectorFixture, firstHeaderValue(), githubBody(), readBackBody(), readJsonBody() (+15 more)

### Community 10 - "observations.ts"
Cohesion: 0.19
Nodes (25): bundleKeys, capabilityStates, checkStates, diagnosticCodes, observationKeys, observedIdFields, parseCapabilityEvidence(), parseEvidenceRefs() (+17 more)

### Community 11 - "package.json"
Cohesion: 0.08
Nodes (24): ajv, dependencies, ajv, yaml, devDependencies, @types/node, typescript, engines (+16 more)

### Community 12 - "github.ts"
Cohesion: 0.25
Nodes (23): CanonicalEvidence, collectGitHubEvidence(), commitUrl(), evidence(), evidenceState(), exactRecord(), externalId(), GitHubEvidenceInput (+15 more)

### Community 13 - "e2e.test.ts"
Cohesion: 0.12
Nodes (19): artifact, children, concurrentEventForReplay(), contract, crossTenantEvent(), epics, event(), executionSet (+11 more)

### Community 14 - "model.ts"
Cohesion: 0.15
Nodes (18): CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone, ProjectProfile, ValidatedRecord, WorkItemType (+10 more)

### Community 15 - "render.ts"
Cohesion: 0.18
Nodes (22): capabilityStates, checkStates, decisions, diagnosticCodes, permittedActions, readPaths, rejectUnsafeCertificate(), renderCertificateJson() (+14 more)

### Community 16 - "evaluate.ts"
Cohesion: 0.19
Nodes (18): check(), allowedObservedIds(), canonicalJson(), createCheck(), decide(), evaluateObservation(), evaluateReadiness(), evaluateSource() (+10 more)

### Community 17 - "manifest.ts"
Cohesion: 0.31
Nodes (16): hasSecondTargetRecord(), loadG2asReadinessManifest(), parseG2asReadinessManifest(), parseManifestJson(), reject(), rejectTokenField(), requireExactKeys(), requireRecord() (+8 more)

### Community 18 - "validate.ts"
Cohesion: 0.20
Nodes (15): boardStatus, canonicalSchemas, nonEmptyString, SchemaName, schemaNames, stringArray, errorPath(), escapeJsonPointer() (+7 more)

### Community 19 - "compilerOptions"
Cohesion: 0.13
Nodes (14): dist, node_modules, .tmp-*, compilerOptions, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess (+6 more)

### Community 20 - "readiness-render.test.ts"
Cohesion: 0.18
Nodes (10): ReadinessCertificate, ReadinessObservationBundle, readinessCapability, manifest, readBundle(), replaceObservation(), replaceObservedId(), escapeRegularExpression() (+2 more)

### Community 21 - "readiness-cli.test.ts"
Cohesion: 0.22
Nodes (8): ReadinessAdapter, readObservations(), runReadinessCertificate(), G2asReadinessManifest, capabilityPath, manifestPath, readFixture(), readinessManifest

### Community 22 - "links.ts"
Cohesion: 0.36
Nodes (10): assertDocumentationLinks(), collectDocumentationMarkdownPaths(), collectMarkdownPaths(), extractLocalMarkdownLinks(), isMissingPathError(), resolveLocalMarkdownLink(), statIfPresent(), targetExists() (+2 more)

### Community 23 - "finalize.ts"
Cohesion: 0.35
Nodes (11): assertFinalizationBoundary(), AttachmentIntent, ConfluenceProjectionIntent, EventInput, finalizeMilestone(), ProjectionRecord, renderArtifact(), renderEpicScope() (+3 more)

### Community 24 - "check-mapper-freshness.mjs"
Cohesion: 0.40
Nodes (9): assertPublishedPaths(), changedPathsSince(), main(), projectRoot, publishedPaths, readJson(), runGit(), splitLines() (+1 more)

### Community 25 - "traceability.ts"
Cohesion: 0.43
Nodes (7): validateCanonicalRecord(), assertAllowedBoardStatus(), assertDependencyTarget(), assertHierarchyTraceability(), assertNonEmpty(), assertUniqueIds(), TraceabilityResult

### Community 27 - "types.ts"
Cohesion: 0.67
Nodes (6): ReadinessCheck, ReadinessObservation, SafeRenderedCheck, CheckState, ReadPath, SourceName

## Knowledge Gaps
- **158 isolated node(s):** `approvedImplementationStartEvidence`, `capabilityKeys`, `allowedOperations`, `prohibitedOperations`, `requiredHosts` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `observedAt()` connect `types.ts` to `readback.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `createValidatorBySchemaName()` connect `package.json` to `validate.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `approvedImplementationStartEvidence`, `capabilityKeys`, `allowedOperations` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `stop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05255613951266125 - nodes in this community are weakly interconnected._
- **Should `markdown.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053297199638663056 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09362279511533243 - nodes in this community are weakly interconnected._
- **Should `outbox.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06241519674355495 - nodes in this community are weakly interconnected._