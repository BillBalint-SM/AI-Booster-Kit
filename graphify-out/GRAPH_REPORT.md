# Graph Report - .  (2026-08-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1620 nodes · 3643 edges · 85 communities (70 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2446a6f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- stop.ts
- types.ts
- finalize.ts
- activation-boundary.ts
- readback.ts
- cli.ts
- profile.ts
- formation-recipe.ts
- types.ts
- codex-mcp-tool-caller.test.ts
- observations.ts
- render.ts
- manifest.ts
- sync.ts
- formation.ts
- e2e.test.ts
- compilerOptions
- codex-mcp-payload.ts
- ingest.ts
- types.ts
- markdown.ts
- identity.ts
- readiness-cli.test.ts
- package.json
- validation.ts
- markdown.ts
- request.ts
- evaluate.ts
- OutboxStore
- custom-tool-quick-task.json
- no-agent-quick-task.json
- outbox.ts
- types.ts
- baseline.test.ts
- controller-activation-package.test.ts
- eligible-quick-task.json
- high-complexity-quick-task.json
- manifest.ts
- formation-recommendation.ts
- compilerOptions
- host-conformance.test.ts
- codex-mcp-preflight.test.ts
- devDependencies
- team-delivery.ts
- choice.ts
- recipe.ts
- envelope.ts
- incomplete-quick-task.json
- codex-mcp-adapter.ts
- compile.ts
- storage.ts
- links.ts
- check-mapper-freshness.mjs
- events.test.ts
- dependencies
- chatgpt-auth.ts
- route.ts
- controller-activation-boundary-cli.test.ts
- package.json
- scripts
- index.ts
- ContractDocument
- page.tsx
- layout.tsx
- eslint
- drizzle-kit
- react-server-dom-webpack
- @tailwindcss/postcss
- bootstrap.test.ts
- @vitejs/plugin-react
- @vitejs/plugin-rsc
- eslint.config.mjs
- next.config.ts
- @types/node
- typescript
- wrangler
- postcss.config.mjs
- vite.config.ts

## God Nodes (most connected - your core abstractions)
1. `parseG2asReadinessManifest()` - 29 edges
2. `failure()` - 25 edges
3. `parseReadinessObservationBundle()` - 23 edges
4. `nonEmptyString()` - 21 edges
5. `reject()` - 21 edges
6. `validateSessionState()` - 21 edges
7. `exactRecord()` - 19 edges
8. `OutboxStore` - 19 edges
9. `parseQuickTaskRequest()` - 18 edges
10. `dispatchCli()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `createLocalHostAdapter()` --indirect_call--> `input()`  [INFERRED]
  src/adapters/types.ts → website/worker/index.ts
- `canonical()` --indirect_call--> `observedAt()`  [INFERRED]
  test/evidence.test.ts → src/connectors/jira.ts
- `githubInput()` --indirect_call--> `observedAt()`  [INFERRED]
  test/evidence.test.ts → src/connectors/jira.ts
- `startConnectorFixture()` --indirect_call--> `response()`  [INFERRED]
  test/fixtures/connector-server.ts → src/controller/evaluate.ts
- `createCodexMcpTransportSource()` --indirect_call--> `confluencePageMetadata()`  [INFERRED]
  src/evidence/codex-mcp-tool-caller.ts → test/codex-mcp-preflight.test.ts

## Import Cycles
- None detected.

## Communities (85 total, 15 thin omitted)

### Community 0 - "stop.ts"
Cohesion: 0.05
Nodes (85): AllowlistDecision, AllowlistInput, AllowlistPolicy, AllowlistValidationError, assertAllowlistedOperation(), assertNonEmptyString(), assertRecord(), assertUnique() (+77 more)

### Community 1 - "types.ts"
Cohesion: 0.08
Nodes (61): ConfluenceGateway, ConfluenceGatewayOptions, parseIntent(), sameArray(), validObservedAt(), GitHubGateway, GitHubGatewayOptions, parseCheck() (+53 more)

### Community 2 - "finalize.ts"
Cohesion: 0.06
Nodes (55): ContractError, CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone, ProjectProfile, ValidatedRecord (+47 more)

### Community 3 - "activation-boundary.ts"
Cohesion: 0.07
Nodes (60): activationAgentKeys, activationBoundaryInputKeys, activationInputKeys, activationIntentKeys, activationOperationsKeys, activationOutputContractKeys, activationPackageKeys, activationRecipeKeys (+52 more)

### Community 4 - "readback.ts"
Cohesion: 0.09
Nodes (50): CanonicalEvidence, collectGitHubEvidence(), commitUrl(), evidence(), evidenceState(), EvidenceValidationError, exactRecord(), externalId() (+42 more)

### Community 5 - "cli.ts"
Cohesion: 0.11
Nodes (41): main(), ActivationCliError, activationErrorCode(), CliError, ContextCliError, contextStorageCode(), contextStringList(), createLocalObservationAdapter() (+33 more)

### Community 6 - "profile.ts"
Cohesion: 0.08
Nodes (41): AttentionState, BoardStatus, assertNonEmptyString(), assertProjectProfile(), assertStringArray(), assertStringRecord(), assertTargetIdentities(), canonicalStatuses (+33 more)

### Community 7 - "formation-recipe.ts"
Cohesion: 0.10
Nodes (34): acceptanceKeys, controllerKeys, DebuggingRecipeError, extractFrontmatter(), ImplementationRecipeError, loadDebuggingRecipe(), loadImplementationRecipe(), loadRefinementRecipe() (+26 more)

### Community 8 - "types.ts"
Cohesion: 0.10
Nodes (31): evaluateSessionResume(), resolveContexts(), stopped(), unknown(), validateEvidence(), validateExecution(), validateExecutionScope(), validateSetup() (+23 more)

### Community 9 - "codex-mcp-tool-caller.test.ts"
Cohesion: 0.08
Nodes (18): assertCodexMcpToolCaller(), CodexMcpReadFailure, CodexMcpReadFailureDiagnosticCode, CodexMcpReadFailureSource, CodexMcpToolCallerError, readSource(), record(), reject() (+10 more)

### Community 10 - "observations.ts"
Cohesion: 0.13
Nodes (27): bundleKeys, capabilityStates, checkStates, diagnosticCodes, observationKeys, observedIdFields, parseCapabilityEvidence(), parseEvidenceRefs() (+19 more)

### Community 11 - "render.ts"
Cohesion: 0.12
Nodes (29): CodexMcpPreflightResult, ReadinessCertificate, ReadinessCertificateOutputPaths, writeReadinessCertificate(), capabilityStates, checkStates, decisions, diagnosticCodes (+21 more)

### Community 12 - "manifest.ts"
Cohesion: 0.12
Nodes (27): allowedOperations, canonicalJson(), capabilityKeys, githubScopeFingerprint(), loadGithubReadOnlyCapability(), parseGithubReadOnlyCapability(), prohibitedOperations, reject() (+19 more)

### Community 13 - "sync.ts"
Cohesion: 0.14
Nodes (21): JiraProjectionIntent, SyncResult, CapabilityProof, assertSafeEvidenceRefs(), EvidenceValidationError, safeEvidenceRefs(), evaluateAllowlist(), EventValidationError (+13 more)

### Community 14 - "formation.ts"
Cohesion: 0.11
Nodes (27): acceptanceKeys, catalogKeys, entryKeys, extractFrontmatter(), FormationCatalogError, identityKeys, loadFormationCatalog(), parseFormationCatalog() (+19 more)

### Community 15 - "e2e.test.ts"
Cohesion: 0.09
Nodes (20): artifact, children, concurrentEventForReplay(), contract, crossTenantEvent(), epics, event(), executionSet (+12 more)

### Community 16 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+20 more)

### Community 17 - "codex-mcp-payload.ts"
Cohesion: 0.27
Nodes (27): GithubCapabilityEvidence, array(), CodexMcpPayloadNormalizationError, exactKeys(), findInlineCards(), fixtureContent(), isoTimestamp(), jsonArray() (+19 more)

### Community 18 - "ingest.ts"
Cohesion: 0.16
Nodes (21): GithubReadOnlyCapability, createCodexMcpPayloadAdapter(), CodexMcpPreflightRequest, createStoppedCertificate(), normalizeCapabilityEvidence(), runCodexMcpPreflight(), stoppedObservation(), CodexMcpToolCaller (+13 more)

### Community 19 - "types.ts"
Cohesion: 0.10
Nodes (22): choices, acknowledgementRequired(), resolveCheckpoint(), ActivationContextKind, CheckpointChoice, CheckpointChoiceInput, ControllerCheckpoint, ControllerImpact (+14 more)

### Community 20 - "markdown.ts"
Cohesion: 0.15
Nodes (24): commonKeys, epicBody(), epicKeys, epicMetadata(), escapeRegExp(), exactKeys(), extractFrontmatter(), literal() (+16 more)

### Community 21 - "identity.ts"
Cohesion: 0.13
Nodes (18): createCheckpoint(), ControllerEvaluationError, evaluateQuickTask(), missing(), response(), activationPackageFingerprint(), canonicalJson(), digest() (+10 more)

### Community 22 - "readiness-cli.test.ts"
Cohesion: 0.10
Nodes (18): CodexReadOnlyEvidence, CodexReadOnlyEvidenceAdapter, ReadinessObservationBundle, manifest, mcpRead(), read(), manifest, read() (+10 more)

### Community 23 - "package.json"
Cohesion: 0.08
Nodes (24): ajv, dependencies, ajv, yaml, devDependencies, @types/node, typescript, engines (+16 more)

### Community 24 - "validation.ts"
Cohesion: 0.22
Nodes (23): assertNonEmpty(), assertSafeSessionContent(), assertUnique(), contextReferences(), exactKeys(), executionValue(), literal(), nullableString() (+15 more)

### Community 25 - "markdown.ts"
Cohesion: 0.15
Nodes (24): allowedCapabilityKeys, allowedMetadataKeys, canonicalBoardStatuses, canonicalVocabulary(), capabilityStates, ContractSemantics, extractFrontmatter(), isRecord() (+16 more)

### Community 26 - "request.ts"
Cohesion: 0.28
Nodes (22): allowedKeys(), ControllerRequestError, exactKeys(), literal(), nonEmpty(), nonEmptyField(), oneOf(), parseContext() (+14 more)

### Community 27 - "evaluate.ts"
Cohesion: 0.18
Nodes (21): check(), allowedObservedIds(), canonicalJson(), createCheck(), decide(), evaluateObservation(), evaluateSource(), expectedIds() (+13 more)

### Community 28 - "OutboxStore"
Cohesion: 0.21
Nodes (8): CanonicalEvent, ClaimRecord, EventRecord, isExistingPathError(), isMissingFileError(), OutboxStore, pathExists(), waitForClaimPoll()

### Community 29 - "custom-tool-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 30 - "no-agent-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 31 - "outbox.ts"
Cohesion: 0.15
Nodes (20): assertExactRecord(), assertRecordHistory(), claimRecordKeys, DurableClaimResult, eventRecordKeys, isNonEmptyString(), isPermissionError(), isSyncState() (+12 more)

### Community 32 - "types.ts"
Cohesion: 0.20
Nodes (19): AdapterDefinition, approvedImplementationStartEvidence, assertImplementationStartContext(), emitLocalEvent(), eventStates(), hasOnlyApprovedImplementationStartEvidence(), HostCapabilityReport, HostEventInput (+11 more)

### Community 33 - "baseline.test.ts"
Cohesion: 0.15
Nodes (16): ConnectorFailure, resolveTargetIdentity(), resolvedTargetIdentity(), acceptedEvidenceRefs, allowlistInput(), assertSecurityPaths(), classifyFailure(), createOrchestrator() (+8 more)

### Community 34 - "controller-activation-package.test.ts"
Cohesion: 0.14
Nodes (17): activationInput(), commonInstructions, createQuickTaskActivationPackage(), parseActivationProfile(), profileDefinitions, stopConditions, requestFingerprint(), ActivationIntent (+9 more)

### Community 35 - "eligible-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 36 - "high-complexity-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 37 - "manifest.ts"
Cohesion: 0.31
Nodes (16): hasSecondTargetRecord(), loadG2asReadinessManifest(), parseG2asReadinessManifest(), parseManifestJson(), reject(), rejectTokenField(), requireExactKeys(), requireRecord() (+8 more)

### Community 38 - "formation-recommendation.ts"
Cohesion: 0.18
Nodes (14): FormationRecommendationError, RecognizedScenario, recognizeScenario(), recommendation(), recommendFormation(), scenarioSignals, unknownRequestEvidence(), unresolvedPrerequisites() (+6 more)

### Community 39 - "compilerOptions"
Cohesion: 0.12
Nodes (15): dist, .tmp-*, website, compilerOptions, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess (+7 more)

### Community 40 - "host-conformance.test.ts"
Cohesion: 0.17
Nodes (13): claudeCodeAdapter, codexAdapter, cursorAdapter, AdapterSafetyError, adapters, contract, eventInput(), startCheckInput() (+5 more)

### Community 41 - "codex-mcp-preflight.test.ts"
Cohesion: 0.17
Nodes (11): capabilityEvidence, manifest, assertRequest(), capabilityEvidence, confluencePageEnvelope(), confluencePageMetadata(), createCaller(), manifest (+3 more)

### Community 42 - "devDependencies"
Cohesion: 0.13
Nodes (15): @cloudflare/vite-plugin, eslint-config-next, tailwindcss, @types/react, @types/react-dom, vinext, vite, devDependencies (+7 more)

### Community 43 - "team-delivery.ts"
Cohesion: 0.25
Nodes (13): HandoffPacket, HandoffStatus, nonEmptyUniqueStrings(), ParallelizationContract, requiredString(), sameSet(), uniqueStrings(), validateHandoffPacket() (+5 more)

### Community 44 - "choice.ts"
Cohesion: 0.23
Nodes (12): allowedKeys(), commonKeys, ControllerCheckpointError, digest(), exactKeys(), nonEmpty(), oneOf(), parseCheckpointChoice() (+4 more)

### Community 45 - "recipe.ts"
Cohesion: 0.22
Nodes (11): controllerKeys, ControllerRecipeError, extractFrontmatter(), loadQuickTaskRecipe(), parseQuickTaskRecipe(), recipeKeys, requiredDor, requireExactArray() (+3 more)

### Community 46 - "envelope.ts"
Cohesion: 0.29
Nodes (13): CanonicalEventSource, assertRecord(), createCanonicalEvent(), createIdempotencyKey(), EventInput, eventKeys, inputKeys, isNonEmptyString() (+5 more)

### Community 47 - "incomplete-quick-task.json"
Cohesion: 0.14
Nodes (13): complexity, dependencies, items, state, executionBoundary, goal, state, outcomeOwner (+5 more)

### Community 48 - "codex-mcp-adapter.ts"
Cohesion: 0.33
Nodes (10): CodexMcpReadMappingError, CodexMcpReadSource, createCodexMcpReadAdapter(), exactRecord(), mapCodexMcpReadToObservationBundle(), observation(), recordField(), reject() (+2 more)

### Community 49 - "compile.ts"
Cohesion: 0.32
Nodes (7): createLocalHostAdapter(), capabilityPolicy(), compileCapability(), compileNativeAdapter(), renderProjection(), CapabilityDeclaration, CapabilityReport

### Community 50 - "storage.ts"
Cohesion: 0.30
Nodes (11): ContextSaveResult, hasCode(), isWithin(), readExisting(), saveDocument(), saveSessionState(), saveWorkContext(), SessionSaveResult (+3 more)

### Community 51 - "links.ts"
Cohesion: 0.36
Nodes (10): assertDocumentationLinks(), collectDocumentationMarkdownPaths(), collectMarkdownPaths(), extractLocalMarkdownLinks(), isMissingPathError(), resolveLocalMarkdownLink(), statIfPresent(), targetExists() (+2 more)

### Community 52 - "check-mapper-freshness.mjs"
Cohesion: 0.40
Nodes (9): assertPublishedPaths(), changedPathsSince(), main(), projectRoot, publishedPaths, readJson(), runGit(), splitLines() (+1 more)

### Community 53 - "events.test.ts"
Cohesion: 0.27
Nodes (7): ExternalOperationState, ReadBackState, reconcileUnknownCompletion(), ReconciliationInput, ReconciliationResult, unknownResult(), eventInput

### Community 54 - "dependencies"
Cohesion: 0.22
Nodes (9): drizzle-orm, next, react, react-dom, dependencies, drizzle-orm, next, react (+1 more)

### Community 55 - "chatgpt-auth.ts"
Cohesion: 0.39
Nodes (8): chatGPTSignInPath(), chatGPTSignOutPath(), ChatGPTUser, getChatGPTUser(), isReservedAuthPath(), requireChatGPTUser(), safeDecodeURIComponent(), safeRelativeReturnPath()

### Community 56 - "route.ts"
Cohesion: 0.39
Nodes (5): getDb(), GET(), POST(), toRouteErrorMessage(), notes

### Community 57 - "controller-activation-boundary-cli.test.ts"
Cohesion: 0.43
Nodes (4): invalidContextArgs(), prepareArgs(), preparePackage(), runBuiltCli()

### Community 58 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 59 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, db:generate, dev, lint, start, test

### Community 60 - "index.ts"
Cohesion: 0.29
Nodes (4): Env, ExecutionContext, input(), worker

### Community 61 - "ContractDocument"
Cohesion: 0.33
Nodes (3): HostAdapter, ContractDocument, NativeAdapterProjection

### Community 63 - "page.tsx"
Cohesion: 0.40
Nodes (3): recipes, roadmap, workflowModes

## Knowledge Gaps
- **380 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+375 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startConnectorFixture()` connect `types.ts` to `baseline.test.ts`, `identity.ts`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `response()` connect `identity.ts` to `types.ts`, `controller-activation-package.test.ts`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `observedAt()` connect `types.ts` to `readback.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _380 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `stop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05299145299145299 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07723855092276145 - nodes in this community are weakly interconnected._
- **Should `finalize.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06128364389233954 - nodes in this community are weakly interconnected._