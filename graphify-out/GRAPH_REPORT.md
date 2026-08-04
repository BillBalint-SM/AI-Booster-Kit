# Graph Report - .  (2026-08-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1617 nodes · 3624 edges · 83 communities (67 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `43f717da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- baseline.test.ts
- stop.ts
- activation-boundary.ts
- outbox.ts
- sync.ts
- finalize.ts
- readback.ts
- cli.ts
- formation-recipe.ts
- codex-mcp-tool-caller.test.ts
- observations.ts
- formation.ts
- ingest.ts
- types.ts
- readiness-render.test.ts
- manifest.ts
- compilerOptions
- codex-mcp-payload.ts
- types.ts
- markdown.ts
- package.json
- markdown.ts
- identity.ts
- request.ts
- evaluate.ts
- e2e.test.ts
- compile.ts
- types.ts
- render.ts
- custom-tool-quick-task.json
- no-agent-quick-task.json
- validation.ts
- formation-recommendation.ts
- eligible-quick-task.json
- high-complexity-quick-task.json
- controller-activation-package.test.ts
- manifest.ts
- compilerOptions
- codex-mcp-preflight.test.ts
- devDependencies
- storage.ts
- team-delivery.ts
- choice.ts
- start-check.ts
- recipe.ts
- incomplete-quick-task.json
- codex-mcp-adapter.ts
- links.ts
- errors.ts
- check-mapper-freshness.mjs
- dependencies
- resume.ts
- chatgpt-auth.ts
- route.ts
- controller-activation-boundary-cli.test.ts
- MemoryJiraGateway
- package.json
- scripts
- index.ts
- ContractDocument
- page.tsx
- layout.tsx
- react-server-dom-webpack
- eslint
- eslint-config-next
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
6. `validateSessionState()` - 20 edges
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

## Communities (83 total, 16 thin omitted)

### Community 0 - "baseline.test.ts"
Cohesion: 0.06
Nodes (75): ConfluenceGateway, ConfluenceGatewayOptions, parseIntent(), sameArray(), validObservedAt(), GitHubGateway, GitHubGatewayOptions, parseCheck() (+67 more)

### Community 1 - "stop.ts"
Cohesion: 0.05
Nodes (85): AllowlistDecision, AllowlistInput, AllowlistPolicy, assertAllowlistedOperation(), assertNonEmptyString(), assertRecord(), assertUnique(), boardLifecycle (+77 more)

### Community 2 - "activation-boundary.ts"
Cohesion: 0.07
Nodes (62): activationAgentKeys, activationBoundaryInputKeys, activationInputKeys, activationIntentKeys, activationOperationsKeys, activationOutputContractKeys, activationPackageKeys, activationRecipeKeys (+54 more)

### Community 3 - "outbox.ts"
Cohesion: 0.07
Nodes (48): CanonicalEvent, CanonicalEventSource, assertRecord(), createCanonicalEvent(), createIdempotencyKey(), EventInput, eventKeys, inputKeys (+40 more)

### Community 4 - "sync.ts"
Cohesion: 0.06
Nodes (51): JiraProjectionIntent, AttentionState, BoardStatus, SyncResult, assertNonEmptyString(), assertProjectProfile(), assertStringArray(), assertStringRecord() (+43 more)

### Community 5 - "finalize.ts"
Cohesion: 0.07
Nodes (51): CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone, ProjectProfile, ValidatedRecord, WorkItemType (+43 more)

### Community 6 - "readback.ts"
Cohesion: 0.09
Nodes (50): CanonicalEvidence, collectGitHubEvidence(), commitUrl(), evidence(), evidenceState(), EvidenceValidationError, exactRecord(), externalId() (+42 more)

### Community 7 - "cli.ts"
Cohesion: 0.11
Nodes (40): main(), ActivationCliError, activationErrorCode(), CliError, ContextCliError, contextStorageCode(), createLocalObservationAdapter(), dispatchCli() (+32 more)

### Community 8 - "formation-recipe.ts"
Cohesion: 0.10
Nodes (34): acceptanceKeys, controllerKeys, DebuggingRecipeError, extractFrontmatter(), ImplementationRecipeError, loadDebuggingRecipe(), loadImplementationRecipe(), loadRefinementRecipe() (+26 more)

### Community 9 - "codex-mcp-tool-caller.test.ts"
Cohesion: 0.09
Nodes (21): createCodexMcpPayloadAdapter(), assertCodexMcpToolCaller(), CodexMcpReadFailure, CodexMcpReadFailureDiagnosticCode, CodexMcpReadFailureSource, CodexMcpToolCaller, CodexMcpToolCallerError, createCodexMcpTransportSource() (+13 more)

### Community 10 - "observations.ts"
Cohesion: 0.13
Nodes (27): bundleKeys, capabilityStates, checkStates, diagnosticCodes, observationKeys, observedIdFields, parseCapabilityEvidence(), parseEvidenceRefs() (+19 more)

### Community 11 - "formation.ts"
Cohesion: 0.11
Nodes (28): acceptanceKeys, catalogKeys, entryKeys, extractFrontmatter(), FormationCatalogError, identityKeys, loadFormationCatalog(), parseFormationCatalog() (+20 more)

### Community 12 - "ingest.ts"
Cohesion: 0.15
Nodes (23): githubScopeFingerprint(), GithubReadOnlyCapability, CodexMcpPreflightRequest, CodexMcpPreflightResult, createStoppedCertificate(), normalizeCapabilityEvidence(), runCodexMcpPreflight(), stoppedObservation() (+15 more)

### Community 13 - "types.ts"
Cohesion: 0.10
Nodes (23): validateCanonicalMilestoneArtifact(), ArtifactWriteAuthority, ContextEnvelope, ContextReadScope, ContextState, EpicContext, MilestoneContext, ResumeRuntime (+15 more)

### Community 14 - "readiness-render.test.ts"
Cohesion: 0.09
Nodes (20): ReadinessObservationBundle, manifest, mcpRead(), read(), manifest, read(), readFixture(), readinessCapability (+12 more)

### Community 15 - "manifest.ts"
Cohesion: 0.12
Nodes (26): allowedOperations, canonicalJson(), capabilityKeys, loadGithubReadOnlyCapability(), parseGithubReadOnlyCapability(), prohibitedOperations, reject(), rejectUnsafeValues() (+18 more)

### Community 16 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+20 more)

### Community 17 - "codex-mcp-payload.ts"
Cohesion: 0.27
Nodes (27): GithubCapabilityEvidence, array(), CodexMcpPayloadNormalizationError, exactKeys(), findInlineCards(), fixtureContent(), isoTimestamp(), jsonArray() (+19 more)

### Community 18 - "types.ts"
Cohesion: 0.10
Nodes (22): choices, acknowledgementRequired(), resolveCheckpoint(), ActivationContextKind, CheckpointChoice, CheckpointChoiceInput, ControllerCheckpoint, ControllerDecision (+14 more)

### Community 19 - "markdown.ts"
Cohesion: 0.13
Nodes (26): allowedCapabilityKeys, allowedMetadataKeys, canonicalBoardStatuses, canonicalVocabulary(), CapabilityDeclaration, CapabilityReport, capabilityStates, ContractSemantics (+18 more)

### Community 20 - "package.json"
Cohesion: 0.08
Nodes (24): ajv, dependencies, ajv, yaml, devDependencies, @types/node, typescript, engines (+16 more)

### Community 21 - "markdown.ts"
Cohesion: 0.17
Nodes (22): commonKeys, epicBody(), epicKeys, epicMetadata(), escapeRegExp(), exactKeys(), extractFrontmatter(), literal() (+14 more)

### Community 22 - "identity.ts"
Cohesion: 0.16
Nodes (15): createCheckpoint(), ControllerEvaluationError, evaluateQuickTask(), missing(), response(), canonicalJson(), digest(), patternId() (+7 more)

### Community 23 - "request.ts"
Cohesion: 0.28
Nodes (22): allowedKeys(), ControllerRequestError, exactKeys(), literal(), nonEmpty(), nonEmptyField(), oneOf(), parseContext() (+14 more)

### Community 24 - "evaluate.ts"
Cohesion: 0.17
Nodes (22): allowedObservedIds(), canonicalJson(), createCheck(), decide(), evaluateObservation(), evaluateSource(), expectedIds(), fieldsFor() (+14 more)

### Community 25 - "e2e.test.ts"
Cohesion: 0.12
Nodes (19): artifact, children, concurrentEventForReplay(), contract, crossTenantEvent(), epics, event(), executionSet (+11 more)

### Community 26 - "compile.ts"
Cohesion: 0.17
Nodes (17): claudeCodeAdapter, codexAdapter, cursorAdapter, createLocalHostAdapter(), capabilityPolicy(), compileCapability(), compileNativeAdapter(), renderProjection() (+9 more)

### Community 27 - "types.ts"
Cohesion: 0.17
Nodes (20): AdapterDefinition, AdapterSafetyError, approvedImplementationStartEvidence, assertImplementationStartContext(), emitLocalEvent(), eventStates(), hasOnlyApprovedImplementationStartEvidence(), HostCapabilityReport (+12 more)

### Community 28 - "render.ts"
Cohesion: 0.19
Nodes (21): capabilityStates, checkStates, decisions, diagnosticCodes, permittedActions, readPaths, rejectUnsafeCertificate(), renderCertificateJson() (+13 more)

### Community 29 - "custom-tool-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 30 - "no-agent-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 31 - "validation.ts"
Cohesion: 0.28
Nodes (20): assertNonEmpty(), assertUnique(), contextReferences(), exactKeys(), executionValue(), literal(), nullableString(), recipeValue() (+12 more)

### Community 32 - "formation-recommendation.ts"
Cohesion: 0.15
Nodes (17): FormationRecommendationError, RecognizedScenario, recognizeScenario(), recommendation(), recommendFormation(), scenarioSignals, unknownRequestEvidence(), unresolvedPrerequisites() (+9 more)

### Community 33 - "eligible-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 34 - "high-complexity-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 35 - "controller-activation-package.test.ts"
Cohesion: 0.13
Nodes (16): activationInput(), commonInstructions, createQuickTaskActivationPackage(), parseActivationProfile(), profileDefinitions, stopConditions, ActivationIntent, ActivationProfile (+8 more)

### Community 36 - "manifest.ts"
Cohesion: 0.31
Nodes (16): hasSecondTargetRecord(), loadG2asReadinessManifest(), parseG2asReadinessManifest(), parseManifestJson(), reject(), rejectTokenField(), requireExactKeys(), requireRecord() (+8 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (15): dist, .tmp-*, website, compilerOptions, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess (+7 more)

### Community 38 - "codex-mcp-preflight.test.ts"
Cohesion: 0.17
Nodes (11): capabilityEvidence, manifest, assertRequest(), capabilityEvidence, confluencePageEnvelope(), confluencePageMetadata(), createCaller(), manifest (+3 more)

### Community 39 - "devDependencies"
Cohesion: 0.13
Nodes (15): @cloudflare/vite-plugin, drizzle-kit, tailwindcss, @types/react, @types/react-dom, vinext, vite, devDependencies (+7 more)

### Community 40 - "storage.ts"
Cohesion: 0.22
Nodes (13): ContextSaveResult, hasCode(), isWithin(), readExisting(), saveDocument(), saveSessionState(), saveWorkContext(), SessionSaveResult (+5 more)

### Community 41 - "team-delivery.ts"
Cohesion: 0.25
Nodes (13): HandoffPacket, HandoffStatus, nonEmptyUniqueStrings(), ParallelizationContract, requiredString(), sameSet(), uniqueStrings(), validateHandoffPacket() (+5 more)

### Community 42 - "choice.ts"
Cohesion: 0.23
Nodes (12): allowedKeys(), commonKeys, ControllerCheckpointError, digest(), exactKeys(), nonEmpty(), oneOf(), parseCheckpointChoice() (+4 more)

### Community 43 - "start-check.ts"
Cohesion: 0.25
Nodes (14): AcceptedScopeEvidence, check(), FinalizationEvidence, hasAcceptedScope(), hasChildTrace(), hasVerifiedEvidence(), HierarchyTrace, isIdentifier() (+6 more)

### Community 44 - "recipe.ts"
Cohesion: 0.22
Nodes (11): controllerKeys, ControllerRecipeError, extractFrontmatter(), loadQuickTaskRecipe(), parseQuickTaskRecipe(), recipeKeys, requiredDor, requireExactArray() (+3 more)

### Community 45 - "incomplete-quick-task.json"
Cohesion: 0.14
Nodes (13): complexity, dependencies, items, state, executionBoundary, goal, state, outcomeOwner (+5 more)

### Community 46 - "codex-mcp-adapter.ts"
Cohesion: 0.33
Nodes (10): CodexMcpReadMappingError, CodexMcpReadSource, createCodexMcpReadAdapter(), exactRecord(), mapCodexMcpReadToObservationBundle(), observation(), recordField(), reject() (+2 more)

### Community 47 - "links.ts"
Cohesion: 0.36
Nodes (10): assertDocumentationLinks(), collectDocumentationMarkdownPaths(), collectMarkdownPaths(), extractLocalMarkdownLinks(), isMissingPathError(), resolveLocalMarkdownLink(), statIfPresent(), targetExists() (+2 more)

### Community 48 - "errors.ts"
Cohesion: 0.27
Nodes (4): ContractError, ConfigurationError, OrchestratorError, ValidationError

### Community 49 - "check-mapper-freshness.mjs"
Cohesion: 0.40
Nodes (9): assertPublishedPaths(), changedPathsSince(), main(), projectRoot, publishedPaths, readJson(), runGit(), splitLines() (+1 more)

### Community 50 - "dependencies"
Cohesion: 0.22
Nodes (9): drizzle-orm, next, react, react-dom, dependencies, drizzle-orm, next, react (+1 more)

### Community 51 - "resume.ts"
Cohesion: 0.56
Nodes (8): evaluateSessionResume(), resolveContexts(), stopped(), unknown(), validateExecution(), validateExecutionScope(), validateSetup(), ResumeResult

### Community 52 - "chatgpt-auth.ts"
Cohesion: 0.39
Nodes (8): chatGPTSignInPath(), chatGPTSignOutPath(), ChatGPTUser, getChatGPTUser(), isReservedAuthPath(), requireChatGPTUser(), safeDecodeURIComponent(), safeRelativeReturnPath()

### Community 53 - "route.ts"
Cohesion: 0.39
Nodes (5): getDb(), GET(), POST(), toRouteErrorMessage(), notes

### Community 54 - "controller-activation-boundary-cli.test.ts"
Cohesion: 0.43
Nodes (4): invalidContextArgs(), prepareArgs(), preparePackage(), runBuiltCli()

### Community 56 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 57 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, db:generate, dev, lint, start, test

### Community 58 - "index.ts"
Cohesion: 0.29
Nodes (4): Env, ExecutionContext, input(), worker

### Community 59 - "ContractDocument"
Cohesion: 0.33
Nodes (3): HostAdapter, ContractDocument, NativeAdapterProjection

### Community 61 - "page.tsx"
Cohesion: 0.40
Nodes (3): recipes, roadmap, workflowModes

## Knowledge Gaps
- **381 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+376 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startConnectorFixture()` connect `baseline.test.ts` to `identity.ts`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `response()` connect `identity.ts` to `baseline.test.ts`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `observedAt()` connect `baseline.test.ts` to `readback.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _381 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `baseline.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05845464725643897 - nodes in this community are weakly interconnected._
- **Should `stop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054431960049937576 - nodes in this community are weakly interconnected._
- **Should `activation-boundary.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06873706004140787 - nodes in this community are weakly interconnected._