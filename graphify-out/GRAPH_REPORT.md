# Graph Report - .  (2026-08-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1713 nodes · 3798 edges · 98 communities (78 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `20ed6dc4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- baseline.test.ts
- stop.ts
- activation-boundary.ts
- finalize.ts
- readback.ts
- formation-recipe.ts
- types.ts
- codex-mcp-tool-caller.test.ts
- agent-role.ts
- manifest.ts
- observations.ts
- sync.ts
- formation.ts
- profile.ts
- cli.ts
- identity.ts
- readiness-render.test.ts
- compilerOptions
- codex-mcp-payload.ts
- types.ts
- ingest.ts
- agent-profile.ts
- markdown.ts
- package.json
- render.ts
- markdown.ts
- request.ts
- OutboxStore
- e2e.test.ts
- evaluate.ts
- custom-tool-quick-task.json
- no-agent-quick-task.json
- host-conformance.test.ts
- formation-recommendation.ts
- eligible-quick-task.json
- high-complexity-quick-task.json
- outbox.ts
- manifest.ts
- types.ts
- compilerOptions
- codex-mcp-preflight.test.ts
- devDependencies
- team-delivery.ts
- validation.ts
- choice.ts
- start-check.ts
- compile.ts
- storage.ts
- recipe.ts
- envelope.ts
- incomplete-quick-task.json
- codex-mcp-adapter.ts
- agent-inventory.ts
- links.ts
- controller-agent-role.test.ts
- errors.ts
- check-mapper-freshness.mjs
- validateMilestoneContext
- events.test.ts
- dependencies
- resume.ts
- chatgpt-auth.ts
- route.ts
- controller-activation-boundary-cli.test.ts
- MemoryJiraGateway
- package.json
- scripts
- index.ts
- parseResumeRuntime
- page.tsx
- cli.ts
- layout.tsx
- eslint
- eslint-config-next
- react-server-dom-webpack
- ActivationCliError
- CliError
- ContextCliError
- FormationCatalogError
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
6. `exactRecord()` - 19 edges
7. `OutboxStore` - 19 edges
8. `dispatchCli()` - 19 edges
9. `parseQuickTaskRequest()` - 18 edges
10. `validateSessionState()` - 18 edges

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

## Communities (98 total, 20 thin omitted)

### Community 0 - "baseline.test.ts"
Cohesion: 0.06
Nodes (75): ConfluenceGateway, ConfluenceGatewayOptions, parseIntent(), sameArray(), validObservedAt(), GitHubGateway, GitHubGatewayOptions, parseCheck() (+67 more)

### Community 1 - "stop.ts"
Cohesion: 0.05
Nodes (86): AllowlistDecision, AllowlistInput, AllowlistPolicy, AllowlistValidationError, assertAllowlistedOperation(), assertNonEmptyString(), assertRecord(), assertUnique() (+78 more)

### Community 2 - "activation-boundary.ts"
Cohesion: 0.07
Nodes (60): activationAgentKeys, activationBoundaryInputKeys, activationInputKeys, activationIntentKeys, activationOperationsKeys, activationOutputContractKeys, activationPackageKeys, activationRecipeKeys (+52 more)

### Community 3 - "finalize.ts"
Cohesion: 0.07
Nodes (51): CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone, ProjectProfile, ValidatedRecord, WorkItemType (+43 more)

### Community 4 - "readback.ts"
Cohesion: 0.09
Nodes (50): CanonicalEvidence, collectGitHubEvidence(), commitUrl(), evidence(), evidenceState(), EvidenceValidationError, exactRecord(), externalId() (+42 more)

### Community 5 - "formation-recipe.ts"
Cohesion: 0.10
Nodes (34): acceptanceKeys, controllerKeys, DebuggingRecipeError, extractFrontmatter(), ImplementationRecipeError, loadDebuggingRecipe(), loadImplementationRecipe(), loadRefinementRecipe() (+26 more)

### Community 6 - "types.ts"
Cohesion: 0.07
Nodes (35): activationInput(), commonInstructions, createQuickTaskActivationPackage(), parseActivationProfile(), profileDefinitions, stopConditions, choices, acknowledgementRequired() (+27 more)

### Community 7 - "codex-mcp-tool-caller.test.ts"
Cohesion: 0.09
Nodes (21): createCodexMcpPayloadAdapter(), assertCodexMcpToolCaller(), CodexMcpReadFailure, CodexMcpReadFailureDiagnosticCode, CodexMcpReadFailureSource, CodexMcpToolCaller, CodexMcpToolCallerError, createCodexMcpTransportSource() (+13 more)

### Community 8 - "agent-role.ts"
Cohesion: 0.09
Nodes (34): AgentRoleCatalogError, assignmentKeys, catalogKeys, contextKeys, ContextLayer, extractFrontmatter(), FormationBindingInput, FormationProjection (+26 more)

### Community 9 - "manifest.ts"
Cohesion: 0.11
Nodes (30): HostEventInput, allowedOperations, canonicalJson(), capabilityKeys, githubScopeFingerprint(), loadGithubReadOnlyCapability(), parseGithubReadOnlyCapability(), prohibitedOperations (+22 more)

### Community 10 - "observations.ts"
Cohesion: 0.13
Nodes (27): bundleKeys, capabilityStates, checkStates, diagnosticCodes, observationKeys, observedIdFields, parseCapabilityEvidence(), parseEvidenceRefs() (+19 more)

### Community 11 - "sync.ts"
Cohesion: 0.14
Nodes (22): JiraProjectionIntent, SyncResult, CapabilityProof, assertSafeEvidenceRefs(), EvidenceValidationError, safeEvidenceRefs(), evaluateAllowlist(), EventValidationError (+14 more)

### Community 12 - "formation.ts"
Cohesion: 0.12
Nodes (29): acceptanceKeys, agentBindingKeys, catalogKeys, entryKeys, extractFrontmatter(), identityKeys, loadFormationCatalog(), parseAgentBinding() (+21 more)

### Community 13 - "profile.ts"
Cohesion: 0.11
Nodes (28): AttentionState, BoardStatus, assertNonEmptyString(), assertProjectProfile(), assertStringArray(), assertStringRecord(), assertTargetIdentities(), canonicalStatuses (+20 more)

### Community 14 - "cli.ts"
Cohesion: 0.19
Nodes (30): activationErrorCode(), contextStorageCode(), createLocalObservationAdapter(), dispatchCli(), isSaveArguments(), isSystemError(), loadManifestContexts(), parseSafeEvent() (+22 more)

### Community 15 - "identity.ts"
Cohesion: 0.12
Nodes (19): createCheckpoint(), ControllerEvaluationError, evaluateQuickTask(), missing(), response(), activationPackageFingerprint(), canonicalJson(), digest() (+11 more)

### Community 16 - "readiness-render.test.ts"
Cohesion: 0.09
Nodes (20): ReadinessObservationBundle, manifest, mcpRead(), read(), manifest, read(), readFixture(), readinessCapability (+12 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+20 more)

### Community 18 - "codex-mcp-payload.ts"
Cohesion: 0.27
Nodes (27): GithubCapabilityEvidence, array(), CodexMcpPayloadNormalizationError, exactKeys(), findInlineCards(), fixtureContent(), isoTimestamp(), jsonArray() (+19 more)

### Community 19 - "types.ts"
Cohesion: 0.10
Nodes (22): ArtifactWriteAuthority, ContextEnvelope, ContextReadScope, ContextState, EpicContext, MilestoneContext, ResumeResult, ResumeRuntime (+14 more)

### Community 20 - "ingest.ts"
Cohesion: 0.16
Nodes (21): GithubReadOnlyCapability, CodexMcpPreflightRequest, CodexMcpPreflightResult, createStoppedCertificate(), normalizeCapabilityEvidence(), runCodexMcpPreflight(), stoppedObservation(), classifyReadFailure() (+13 more)

### Community 21 - "agent-profile.ts"
Cohesion: 0.12
Nodes (24): AgentProfile, AgentProfileCatalog, AgentProfileCatalogError, AgentProfileCatalogStatus, AgentProfileStatus, AgentProfileUsageTopic, catalogKeys, extractFrontmatter() (+16 more)

### Community 22 - "markdown.ts"
Cohesion: 0.15
Nodes (24): commonKeys, epicBody(), epicKeys, epicMetadata(), escapeRegExp(), exactKeys(), extractFrontmatter(), literal() (+16 more)

### Community 23 - "package.json"
Cohesion: 0.08
Nodes (24): ajv, dependencies, ajv, yaml, devDependencies, @types/node, typescript, engines (+16 more)

### Community 24 - "render.ts"
Cohesion: 0.17
Nodes (23): writeReadinessCertificate(), capabilityStates, checkStates, decisions, diagnosticCodes, permittedActions, readPaths, rejectUnsafeCertificate() (+15 more)

### Community 25 - "markdown.ts"
Cohesion: 0.16
Nodes (23): allowedCapabilityKeys, allowedMetadataKeys, canonicalBoardStatuses, canonicalVocabulary(), capabilityStates, extractFrontmatter(), isRecord(), normalizeWhitespace() (+15 more)

### Community 26 - "request.ts"
Cohesion: 0.28
Nodes (22): allowedKeys(), ControllerRequestError, exactKeys(), literal(), nonEmpty(), nonEmptyField(), oneOf(), parseContext() (+14 more)

### Community 27 - "OutboxStore"
Cohesion: 0.18
Nodes (10): assertRecordHistory(), isExistingPathError(), isMissingFileError(), isPermissionError(), OutboxStore, pathExists(), sameResult(), sameStableEvent() (+2 more)

### Community 28 - "e2e.test.ts"
Cohesion: 0.12
Nodes (19): artifact, children, concurrentEventForReplay(), contract, crossTenantEvent(), epics, event(), executionSet (+11 more)

### Community 29 - "evaluate.ts"
Cohesion: 0.18
Nodes (21): allowedObservedIds(), canonicalJson(), createCheck(), decide(), evaluateObservation(), evaluateSource(), expectedIds(), fieldsFor() (+13 more)

### Community 30 - "custom-tool-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 31 - "no-agent-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 32 - "host-conformance.test.ts"
Cohesion: 0.17
Nodes (14): claudeCodeAdapter, codexAdapter, cursorAdapter, AdapterSafetyError, createLocalHostAdapter(), adapters, contract, eventInput() (+6 more)

### Community 33 - "formation-recommendation.ts"
Cohesion: 0.15
Nodes (17): FormationRecommendationError, RecognizedScenario, recognizeScenario(), recommendation(), recommendFormation(), scenarioSignals, unknownRequestEvidence(), unresolvedPrerequisites() (+9 more)

### Community 34 - "eligible-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 35 - "high-complexity-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 36 - "outbox.ts"
Cohesion: 0.16
Nodes (18): CanonicalEvent, assertExactRecord(), ClaimRecord, claimRecordKeys, DurableClaimResult, EventRecord, eventRecordKeys, isNonEmptyString() (+10 more)

### Community 37 - "manifest.ts"
Cohesion: 0.31
Nodes (16): hasSecondTargetRecord(), loadG2asReadinessManifest(), parseG2asReadinessManifest(), parseManifestJson(), reject(), rejectTokenField(), requireExactKeys(), requireRecord() (+8 more)

### Community 38 - "types.ts"
Cohesion: 0.24
Nodes (16): AdapterDefinition, approvedImplementationStartEvidence, assertImplementationStartContext(), emitLocalEvent(), eventStates(), hasOnlyApprovedImplementationStartEvidence(), HostCapabilityReport, ImplementationStartContext (+8 more)

### Community 39 - "compilerOptions"
Cohesion: 0.12
Nodes (15): dist, .tmp-*, website, compilerOptions, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess (+7 more)

### Community 40 - "codex-mcp-preflight.test.ts"
Cohesion: 0.17
Nodes (11): capabilityEvidence, manifest, assertRequest(), capabilityEvidence, confluencePageEnvelope(), confluencePageMetadata(), createCaller(), manifest (+3 more)

### Community 41 - "devDependencies"
Cohesion: 0.13
Nodes (15): @cloudflare/vite-plugin, drizzle-kit, tailwindcss, @types/react, @types/react-dom, vinext, vite, devDependencies (+7 more)

### Community 42 - "team-delivery.ts"
Cohesion: 0.25
Nodes (13): HandoffPacket, HandoffStatus, nonEmptyUniqueStrings(), ParallelizationContract, requiredString(), sameSet(), uniqueStrings(), validateHandoffPacket() (+5 more)

### Community 43 - "validation.ts"
Cohesion: 0.39
Nodes (14): assertSafeSessionContent(), contextReferences(), exactKeys(), executionValue(), literal(), nullableString(), recipeValue(), recordValue() (+6 more)

### Community 44 - "choice.ts"
Cohesion: 0.23
Nodes (12): allowedKeys(), commonKeys, ControllerCheckpointError, digest(), exactKeys(), nonEmpty(), oneOf(), parseCheckpointChoice() (+4 more)

### Community 45 - "start-check.ts"
Cohesion: 0.25
Nodes (14): AcceptedScopeEvidence, check(), FinalizationEvidence, hasAcceptedScope(), hasChildTrace(), hasVerifiedEvidence(), HierarchyTrace, isIdentifier() (+6 more)

### Community 46 - "compile.ts"
Cohesion: 0.20
Nodes (10): HostAdapter, capabilityPolicy(), compileCapability(), compileNativeAdapter(), renderProjection(), CapabilityDeclaration, CapabilityReport, ContractDocument (+2 more)

### Community 47 - "storage.ts"
Cohesion: 0.24
Nodes (12): ContextSaveResult, hasCode(), isWithin(), readExisting(), saveDocument(), saveSessionState(), saveWorkContext(), SessionSaveResult (+4 more)

### Community 48 - "recipe.ts"
Cohesion: 0.22
Nodes (11): controllerKeys, ControllerRecipeError, extractFrontmatter(), loadQuickTaskRecipe(), parseQuickTaskRecipe(), recipeKeys, requiredDor, requireExactArray() (+3 more)

### Community 49 - "envelope.ts"
Cohesion: 0.29
Nodes (13): CanonicalEventSource, assertRecord(), createCanonicalEvent(), createIdempotencyKey(), EventInput, eventKeys, inputKeys, isNonEmptyString() (+5 more)

### Community 50 - "incomplete-quick-task.json"
Cohesion: 0.14
Nodes (13): complexity, dependencies, items, state, executionBoundary, goal, state, outcomeOwner (+5 more)

### Community 51 - "codex-mcp-adapter.ts"
Cohesion: 0.33
Nodes (10): CodexMcpReadMappingError, CodexMcpReadSource, createCodexMcpReadAdapter(), exactRecord(), mapCodexMcpReadToObservationBundle(), observation(), recordField(), reject() (+2 more)

### Community 52 - "agent-inventory.ts"
Cohesion: 0.26
Nodes (9): AgentDefinition, AgentInventoryError, AgentSourceKind, loadAgentInventory(), normalizeAgentId(), parseAgentDefinition(), parseTomlString(), duplicateDirectory (+1 more)

### Community 53 - "links.ts"
Cohesion: 0.36
Nodes (10): assertDocumentationLinks(), collectDocumentationMarkdownPaths(), collectMarkdownPaths(), extractLocalMarkdownLinks(), isMissingPathError(), resolveLocalMarkdownLink(), statIfPresent(), targetExists() (+2 more)

### Community 54 - "controller-agent-role.test.ts"
Cohesion: 0.22
Nodes (10): runInspectAgentLibrary(), AgentInventory, AgentRoleCoverageReport, analyzeAgentRoleCoverage(), loadRoleCatalog(), projectFormation(), RoleCatalog, uniqueSorted() (+2 more)

### Community 55 - "errors.ts"
Cohesion: 0.27
Nodes (4): ContractError, ConfigurationError, OrchestratorError, ValidationError

### Community 56 - "check-mapper-freshness.mjs"
Cohesion: 0.40
Nodes (9): assertPublishedPaths(), changedPathsSince(), main(), projectRoot, publishedPaths, readJson(), runGit(), splitLines() (+1 more)

### Community 57 - "validateMilestoneContext"
Cohesion: 0.38
Nodes (9): assertNonEmpty(), assertUnique(), validateContextEnvelope(), validateEpicContext(), validateEpicShape(), validateMilestoneContext(), validateMilestoneShape(), epics (+1 more)

### Community 58 - "events.test.ts"
Cohesion: 0.27
Nodes (7): ExternalOperationState, ReadBackState, reconcileUnknownCompletion(), ReconciliationInput, ReconciliationResult, unknownResult(), eventInput

### Community 59 - "dependencies"
Cohesion: 0.22
Nodes (9): drizzle-orm, next, react, react-dom, dependencies, drizzle-orm, next, react (+1 more)

### Community 60 - "resume.ts"
Cohesion: 0.64
Nodes (8): evaluateSessionResume(), resolveContexts(), stopped(), unknown(), validateEvidence(), validateExecution(), validateExecutionScope(), validateSetup()

### Community 61 - "chatgpt-auth.ts"
Cohesion: 0.39
Nodes (8): chatGPTSignInPath(), chatGPTSignOutPath(), ChatGPTUser, getChatGPTUser(), isReservedAuthPath(), requireChatGPTUser(), safeDecodeURIComponent(), safeRelativeReturnPath()

### Community 62 - "route.ts"
Cohesion: 0.39
Nodes (5): getDb(), GET(), POST(), toRouteErrorMessage(), notes

### Community 63 - "controller-activation-boundary-cli.test.ts"
Cohesion: 0.43
Nodes (4): invalidContextArgs(), prepareArgs(), preparePackage(), runBuiltCli()

### Community 65 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 66 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, db:generate, dev, lint, start, test

### Community 67 - "index.ts"
Cohesion: 0.29
Nodes (4): Env, ExecutionContext, input(), worker

### Community 68 - "parseResumeRuntime"
Cohesion: 0.40
Nodes (6): contextStringList(), nullableContextString(), parseContextManifest(), parseResumeRuntime(), plainContextRecord(), requiredContextString()

### Community 70 - "page.tsx"
Cohesion: 0.40
Nodes (3): recipes, roadmap, workflowModes

### Community 71 - "cli.ts"
Cohesion: 0.67
Nodes (3): main(), runCli(), writeError()

## Knowledge Gaps
- **414 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+409 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startConnectorFixture()` connect `baseline.test.ts` to `identity.ts`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `response()` connect `identity.ts` to `baseline.test.ts`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **Why does `RetentionScope` connect `types.ts` to `activation-boundary.ts`, `cli.ts`, `types.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _414 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `baseline.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05845464725643897 - nodes in this community are weakly interconnected._
- **Should `stop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05255613951266125 - nodes in this community are weakly interconnected._
- **Should `activation-boundary.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07023705004389816 - nodes in this community are weakly interconnected._