# Graph Report - .  (2026-08-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1600 nodes · 3595 edges · 82 communities (67 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ae641020`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- codex-mcp-payload.ts
- baseline.test.ts
- stop.ts
- finalize.ts
- activation-boundary.ts
- Community 5
- types.ts
- profile.ts
- cli.ts
- identity.ts
- sync.ts
- types.ts
- formation.ts
- e2e.test.ts
- compilerOptions
- ingest.ts
- observations.ts
- package.json
- render.ts
- markdown.ts
- markdown.ts
- request.ts
- OutboxStore
- controller-activation-package.test.ts
- evaluateReadiness
- types.ts
- evaluate.ts
- custom-tool-quick-task.json
- no-agent-quick-task.json
- validation.ts
- formation-recommendation.ts
- readiness-cli.test.ts
- eligible-quick-task.json
- high-complexity-quick-task.json
- outbox.ts
- host-conformance.test.ts
- compilerOptions
- manifest.ts
- devDependencies
- projections.ts
- choice.ts
- recipe.ts
- envelope.ts
- incomplete-quick-task.json
- codex-mcp-adapter.ts
- storage.ts
- links.ts
- check-mapper-freshness.mjs
- resume.ts
- events.test.ts
- dependencies
- compile.ts
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
- eslint-config-next
- drizzle-kit
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
- `readFixture()` --calls--> `parseReadinessObservationBundle()`  [EXTRACTED]
  test/readiness-cli.test.ts → src/readiness/observations.ts

## Import Cycles
- None detected.

## Communities (82 total, 15 thin omitted)

### Community 0 - "codex-mcp-payload.ts"
Cohesion: 0.05
Nodes (74): array(), CodexMcpPayloadNormalizationError, createCodexMcpPayloadAdapter(), exactKeys(), findInlineCards(), fixtureContent(), isoTimestamp(), jsonArray() (+66 more)

### Community 1 - "baseline.test.ts"
Cohesion: 0.06
Nodes (75): ConfluenceGateway, ConfluenceGatewayOptions, parseIntent(), sameArray(), validObservedAt(), GitHubGateway, GitHubGatewayOptions, parseCheck() (+67 more)

### Community 2 - "stop.ts"
Cohesion: 0.05
Nodes (86): AllowlistDecision, AllowlistInput, AllowlistPolicy, AllowlistValidationError, assertAllowlistedOperation(), assertNonEmptyString(), assertRecord(), assertUnique() (+78 more)

### Community 3 - "finalize.ts"
Cohesion: 0.06
Nodes (55): ContractError, CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone, ProjectProfile, ValidatedRecord (+47 more)

### Community 4 - "activation-boundary.ts"
Cohesion: 0.07
Nodes (62): activationAgentKeys, activationBoundaryInputKeys, activationInputKeys, activationIntentKeys, activationOperationsKeys, activationOutputContractKeys, activationPackageKeys, activationRecipeKeys (+54 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (50): CanonicalEvidence, collectGitHubEvidence(), commitUrl(), evidence(), evidenceState(), EvidenceValidationError, exactRecord(), externalId() (+42 more)

### Community 6 - "types.ts"
Cohesion: 0.07
Nodes (45): acceptanceKeys, controllerKeys, DebuggingRecipeError, extractFrontmatter(), ImplementationRecipeError, loadDebuggingRecipe(), loadImplementationRecipe(), loadRefinementRecipe() (+37 more)

### Community 7 - "profile.ts"
Cohesion: 0.08
Nodes (42): AttentionState, BoardStatus, assertNonEmptyString(), assertProjectProfile(), assertStringArray(), assertStringRecord(), assertTargetIdentities(), canonicalStatuses (+34 more)

### Community 8 - "cli.ts"
Cohesion: 0.11
Nodes (40): main(), ActivationCliError, activationErrorCode(), CliError, ContextCliError, contextStorageCode(), createLocalObservationAdapter(), dispatchCli() (+32 more)

### Community 9 - "identity.ts"
Cohesion: 0.10
Nodes (24): choices, createCheckpoint(), ControllerEvaluationError, evaluateQuickTask(), missing(), response(), activationPackageFingerprint(), canonicalJson() (+16 more)

### Community 10 - "sync.ts"
Cohesion: 0.14
Nodes (22): JiraProjectionIntent, SyncResult, CapabilityProof, assertSafeEvidenceRefs(), EvidenceValidationError, safeEvidenceRefs(), evaluateAllowlist(), EventValidationError (+14 more)

### Community 11 - "types.ts"
Cohesion: 0.09
Nodes (24): ArtifactWriteAuthority, ContextEnvelope, ContextReadScope, ContextState, EpicContext, MilestoneContext, ResumeResult, ResumeRuntime (+16 more)

### Community 12 - "formation.ts"
Cohesion: 0.11
Nodes (27): acceptanceKeys, catalogKeys, entryKeys, extractFrontmatter(), FormationCatalogError, identityKeys, loadFormationCatalog(), parseFormationCatalog() (+19 more)

### Community 13 - "e2e.test.ts"
Cohesion: 0.09
Nodes (20): artifact, children, concurrentEventForReplay(), contract, crossTenantEvent(), epics, event(), executionSet (+12 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+20 more)

### Community 15 - "ingest.ts"
Cohesion: 0.21
Nodes (15): GithubCapabilityEvidence, GithubReadOnlyCapability, CodexMcpPreflightRequest, CodexMcpPreflightResult, createStoppedCertificate(), normalizeCapabilityEvidence(), runCodexMcpPreflight(), stoppedObservation() (+7 more)

### Community 16 - "observations.ts"
Cohesion: 0.19
Nodes (25): bundleKeys, capabilityStates, checkStates, diagnosticCodes, observationKeys, observedIdFields, parseCapabilityEvidence(), parseEvidenceRefs() (+17 more)

### Community 17 - "package.json"
Cohesion: 0.08
Nodes (24): ajv, dependencies, ajv, yaml, devDependencies, @types/node, typescript, engines (+16 more)

### Community 18 - "render.ts"
Cohesion: 0.14
Nodes (27): ReadinessCertificate, writeReadinessCertificate(), capabilityStates, checkStates, decisions, diagnosticCodes, permittedActions, readPaths (+19 more)

### Community 19 - "markdown.ts"
Cohesion: 0.17
Nodes (22): commonKeys, epicBody(), epicKeys, epicMetadata(), escapeRegExp(), exactKeys(), extractFrontmatter(), literal() (+14 more)

### Community 20 - "markdown.ts"
Cohesion: 0.16
Nodes (23): allowedCapabilityKeys, allowedMetadataKeys, canonicalBoardStatuses, canonicalVocabulary(), capabilityStates, extractFrontmatter(), isRecord(), normalizeWhitespace() (+15 more)

### Community 21 - "request.ts"
Cohesion: 0.28
Nodes (22): allowedKeys(), ControllerRequestError, exactKeys(), literal(), nonEmpty(), nonEmptyField(), oneOf(), parseContext() (+14 more)

### Community 22 - "OutboxStore"
Cohesion: 0.18
Nodes (10): assertRecordHistory(), isExistingPathError(), isMissingFileError(), isPermissionError(), OutboxStore, pathExists(), sameResult(), sameStableEvent() (+2 more)

### Community 23 - "controller-activation-package.test.ts"
Cohesion: 0.12
Nodes (19): activationInput(), commonInstructions, createQuickTaskActivationPackage(), parseActivationProfile(), profileDefinitions, stopConditions, acknowledgementRequired(), resolveCheckpoint() (+11 more)

### Community 24 - "evaluateReadiness"
Cohesion: 0.15
Nodes (12): CodexReadOnlyEvidenceAdapter, evaluateReadiness(), unique(), manifest, read(), readFixture(), readinessCapability, evaluateReadiness() (+4 more)

### Community 25 - "types.ts"
Cohesion: 0.17
Nodes (20): AdapterDefinition, AdapterSafetyError, approvedImplementationStartEvidence, assertImplementationStartContext(), emitLocalEvent(), eventStates(), hasOnlyApprovedImplementationStartEvidence(), HostCapabilityReport (+12 more)

### Community 26 - "evaluate.ts"
Cohesion: 0.19
Nodes (20): allowedObservedIds(), canonicalJson(), createCheck(), decide(), evaluateObservation(), evaluateSource(), expectedIds(), fieldsFor() (+12 more)

### Community 27 - "custom-tool-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 28 - "no-agent-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 29 - "validation.ts"
Cohesion: 0.28
Nodes (20): assertNonEmpty(), assertUnique(), contextReferences(), exactKeys(), executionValue(), literal(), nullableString(), recipeValue() (+12 more)

### Community 30 - "formation-recommendation.ts"
Cohesion: 0.15
Nodes (17): FormationRecommendationError, RecognizedScenario, recognizeScenario(), recommendation(), recommendFormation(), scenarioSignals, unknownRequestEvidence(), unresolvedPrerequisites() (+9 more)

### Community 31 - "readiness-cli.test.ts"
Cohesion: 0.12
Nodes (9): ReadinessAdapter, readObservations(), runReadinessCertificate(), capabilityPath, manifestPath, readFixture(), readinessManifest, assertRejected() (+1 more)

### Community 32 - "eligible-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 33 - "high-complexity-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 34 - "outbox.ts"
Cohesion: 0.16
Nodes (18): CanonicalEvent, assertExactRecord(), ClaimRecord, claimRecordKeys, DurableClaimResult, EventRecord, eventRecordKeys, isNonEmptyString() (+10 more)

### Community 35 - "host-conformance.test.ts"
Cohesion: 0.20
Nodes (13): claudeCodeAdapter, codexAdapter, cursorAdapter, createLocalHostAdapter(), adapters, contract, eventInput(), startCheckInput() (+5 more)

### Community 36 - "compilerOptions"
Cohesion: 0.12
Nodes (15): dist, .tmp-*, website, compilerOptions, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess (+7 more)

### Community 37 - "manifest.ts"
Cohesion: 0.24
Nodes (14): allowedOperations, canonicalJson(), capabilityKeys, githubScopeFingerprint(), loadGithubReadOnlyCapability(), parseGithubReadOnlyCapability(), prohibitedOperations, reject() (+6 more)

### Community 38 - "devDependencies"
Cohesion: 0.13
Nodes (15): @cloudflare/vite-plugin, react-server-dom-webpack, tailwindcss, @types/react, @types/react-dom, vinext, vite, devDependencies (+7 more)

### Community 39 - "projections.ts"
Cohesion: 0.21
Nodes (13): canonicalAllowedOperations, canonicalProhibitedOperations, extractOperations(), hosts, hostSurfaces, parseGithubCapabilityTemplate(), renderGithubCapabilityTemplate(), requireCapabilityId() (+5 more)

### Community 40 - "choice.ts"
Cohesion: 0.23
Nodes (12): allowedKeys(), commonKeys, ControllerCheckpointError, digest(), exactKeys(), nonEmpty(), oneOf(), parseCheckpointChoice() (+4 more)

### Community 41 - "recipe.ts"
Cohesion: 0.22
Nodes (11): controllerKeys, ControllerRecipeError, extractFrontmatter(), loadQuickTaskRecipe(), parseQuickTaskRecipe(), recipeKeys, requiredDor, requireExactArray() (+3 more)

### Community 42 - "envelope.ts"
Cohesion: 0.29
Nodes (13): CanonicalEventSource, assertRecord(), createCanonicalEvent(), createIdempotencyKey(), EventInput, eventKeys, inputKeys, isNonEmptyString() (+5 more)

### Community 43 - "incomplete-quick-task.json"
Cohesion: 0.14
Nodes (13): complexity, dependencies, items, state, executionBoundary, goal, state, outcomeOwner (+5 more)

### Community 44 - "codex-mcp-adapter.ts"
Cohesion: 0.21
Nodes (15): CodexMcpReadMappingError, CodexMcpReadSource, createCodexMcpReadAdapter(), exactRecord(), mapCodexMcpReadToObservationBundle(), observation(), recordField(), reject() (+7 more)

### Community 45 - "storage.ts"
Cohesion: 0.30
Nodes (11): ContextSaveResult, hasCode(), isWithin(), readExisting(), saveDocument(), saveSessionState(), saveWorkContext(), SessionSaveResult (+3 more)

### Community 46 - "links.ts"
Cohesion: 0.36
Nodes (10): assertDocumentationLinks(), collectDocumentationMarkdownPaths(), collectMarkdownPaths(), extractLocalMarkdownLinks(), isMissingPathError(), resolveLocalMarkdownLink(), statIfPresent(), targetExists() (+2 more)

### Community 47 - "check-mapper-freshness.mjs"
Cohesion: 0.40
Nodes (9): assertPublishedPaths(), changedPathsSince(), main(), projectRoot, publishedPaths, readJson(), runGit(), splitLines() (+1 more)

### Community 48 - "resume.ts"
Cohesion: 0.47
Nodes (8): evaluateSessionResume(), resolveContexts(), stopped(), unknown(), validateExecution(), validateExecutionScope(), validateSetup(), ContextError

### Community 49 - "events.test.ts"
Cohesion: 0.27
Nodes (7): ExternalOperationState, ReadBackState, reconcileUnknownCompletion(), ReconciliationInput, ReconciliationResult, unknownResult(), eventInput

### Community 50 - "dependencies"
Cohesion: 0.22
Nodes (9): drizzle-orm, next, react, react-dom, dependencies, drizzle-orm, next, react (+1 more)

### Community 51 - "compile.ts"
Cohesion: 0.36
Nodes (7): capabilityPolicy(), compileCapability(), compileNativeAdapter(), renderProjection(), CapabilityDeclaration, CapabilityReport, ContractSemantics

### Community 52 - "chatgpt-auth.ts"
Cohesion: 0.39
Nodes (8): chatGPTSignInPath(), chatGPTSignOutPath(), ChatGPTUser, getChatGPTUser(), isReservedAuthPath(), requireChatGPTUser(), safeDecodeURIComponent(), safeRelativeReturnPath()

### Community 53 - "route.ts"
Cohesion: 0.39
Nodes (5): getDb(), GET(), POST(), toRouteErrorMessage(), notes

### Community 54 - "controller-activation-boundary-cli.test.ts"
Cohesion: 0.43
Nodes (4): invalidContextArgs(), prepareArgs(), preparePackage(), runBuiltCli()

### Community 55 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 56 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, db:generate, dev, lint, start, test

### Community 57 - "index.ts"
Cohesion: 0.29
Nodes (4): Env, ExecutionContext, input(), worker

### Community 58 - "ContractDocument"
Cohesion: 0.33
Nodes (3): HostAdapter, ContractDocument, NativeAdapterProjection

### Community 60 - "page.tsx"
Cohesion: 0.40
Nodes (3): recipes, roadmap, workflowModes

## Knowledge Gaps
- **376 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+371 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startConnectorFixture()` connect `baseline.test.ts` to `identity.ts`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `response()` connect `identity.ts` to `baseline.test.ts`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `observedAt()` connect `baseline.test.ts` to `Community 5`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _376 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `codex-mcp-payload.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05272727272727273 - nodes in this community are weakly interconnected._
- **Should `baseline.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05845464725643897 - nodes in this community are weakly interconnected._
- **Should `stop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05255613951266125 - nodes in this community are weakly interconnected._