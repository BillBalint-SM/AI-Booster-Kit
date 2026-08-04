# Graph Report - .  (2026-08-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1648 nodes · 3698 edges · 86 communities (70 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5c01797`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- codex-mcp-payload.ts
- baseline.test.ts
- stop.ts
- cli.ts
- activation-boundary.ts
- finalize.ts
- readback.ts
- profile.ts
- evaluate.ts
- formation-recipe.ts
- types.ts
- sync.ts
- formation.ts
- e2e.test.ts
- compilerOptions
- types.ts
- markdown.ts
- observations.ts
- package.json
- identity.ts
- markdown.ts
- request.ts
- OutboxStore
- custom-tool-quick-task.json
- no-agent-quick-task.json
- outbox.ts
- types.ts
- readiness-cli.test.ts
- eligible-quick-task.json
- high-complexity-quick-task.json
- ingest.ts
- formation-recommendation.ts
- codex-mcp-adapter.ts
- compilerOptions
- host-conformance.test.ts
- manifest.ts
- evaluateReadiness
- devDependencies
- compile.ts
- projections.ts
- team-delivery.ts
- validation.ts
- choice.ts
- readiness-render.test.ts
- storage.ts
- recipe.ts
- envelope.ts
- incomplete-quick-task.json
- links.ts
- errors.ts
- check-mapper-freshness.mjs
- validateMilestoneContext
- events.test.ts
- dependencies
- resume.ts
- chatgpt-auth.ts
- route.ts
- controller-activation-boundary-cli.test.ts
- package.json
- scripts
- index.ts
- controller-resolve.test.ts
- page.tsx
- HostAdapter
- layout.tsx
- eslint
- eslint-config-next
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
10. `dispatchCli()` - 18 edges

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

## Communities (86 total, 16 thin omitted)

### Community 0 - "codex-mcp-payload.ts"
Cohesion: 0.05
Nodes (74): array(), CodexMcpPayloadNormalizationError, createCodexMcpPayloadAdapter(), exactKeys(), findInlineCards(), fixtureContent(), isoTimestamp(), jsonArray() (+66 more)

### Community 1 - "baseline.test.ts"
Cohesion: 0.06
Nodes (75): ConfluenceGateway, ConfluenceGatewayOptions, parseIntent(), sameArray(), validObservedAt(), GitHubGateway, GitHubGatewayOptions, parseCheck() (+67 more)

### Community 2 - "stop.ts"
Cohesion: 0.05
Nodes (86): evidence(), AllowlistDecision, AllowlistInput, AllowlistPolicy, assertAllowlistedOperation(), assertNonEmptyString(), assertRecord(), assertUnique() (+78 more)

### Community 3 - "cli.ts"
Cohesion: 0.06
Nodes (67): main(), ActivationCliError, activationErrorCode(), CliError, ContextCliError, contextStorageCode(), contextStringList(), createLocalObservationAdapter() (+59 more)

### Community 4 - "activation-boundary.ts"
Cohesion: 0.07
Nodes (60): activationAgentKeys, activationBoundaryInputKeys, activationInputKeys, activationIntentKeys, activationOperationsKeys, activationOutputContractKeys, activationPackageKeys, activationRecipeKeys (+52 more)

### Community 5 - "finalize.ts"
Cohesion: 0.07
Nodes (51): CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone, ProjectProfile, ValidatedRecord, WorkItemType (+43 more)

### Community 6 - "readback.ts"
Cohesion: 0.09
Nodes (49): CanonicalEvidence, collectGitHubEvidence(), commitUrl(), evidenceState(), EvidenceValidationError, exactRecord(), externalId(), GitHubEvidenceInput (+41 more)

### Community 7 - "profile.ts"
Cohesion: 0.08
Nodes (41): AttentionState, BoardStatus, assertNonEmptyString(), assertProjectProfile(), assertStringArray(), assertStringRecord(), assertTargetIdentities(), canonicalStatuses (+33 more)

### Community 8 - "evaluate.ts"
Cohesion: 0.11
Nodes (40): check(), allowedObservedIds(), canonicalJson(), createCheck(), decide(), evaluateObservation(), evaluateSource(), expectedIds() (+32 more)

### Community 9 - "formation-recipe.ts"
Cohesion: 0.10
Nodes (34): acceptanceKeys, controllerKeys, DebuggingRecipeError, extractFrontmatter(), ImplementationRecipeError, loadDebuggingRecipe(), loadImplementationRecipe(), loadRefinementRecipe() (+26 more)

### Community 10 - "types.ts"
Cohesion: 0.08
Nodes (34): activationInput(), commonInstructions, createQuickTaskActivationPackage(), parseActivationProfile(), profileDefinitions, stopConditions, choices, acknowledgementRequired() (+26 more)

### Community 11 - "sync.ts"
Cohesion: 0.13
Nodes (23): JiraProjectionIntent, SyncResult, AllowlistValidationError, CapabilityProof, assertSafeEvidenceRefs(), EvidenceValidationError, safeEvidenceRefs(), evaluateAllowlist() (+15 more)

### Community 12 - "formation.ts"
Cohesion: 0.11
Nodes (28): acceptanceKeys, catalogKeys, entryKeys, extractFrontmatter(), FormationCatalogError, identityKeys, loadFormationCatalog(), parseFormationCatalog() (+20 more)

### Community 13 - "e2e.test.ts"
Cohesion: 0.09
Nodes (20): artifact, children, concurrentEventForReplay(), contract, crossTenantEvent(), epics, event(), executionSet (+12 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+20 more)

### Community 15 - "types.ts"
Cohesion: 0.10
Nodes (22): ArtifactWriteAuthority, ContextEnvelope, ContextReadScope, ContextState, EpicContext, MilestoneContext, ResumeResult, ResumeRuntime (+14 more)

### Community 16 - "markdown.ts"
Cohesion: 0.15
Nodes (24): commonKeys, epicBody(), epicKeys, epicMetadata(), escapeRegExp(), exactKeys(), extractFrontmatter(), literal() (+16 more)

### Community 17 - "observations.ts"
Cohesion: 0.19
Nodes (25): bundleKeys, capabilityStates, checkStates, diagnosticCodes, observationKeys, observedIdFields, parseCapabilityEvidence(), parseEvidenceRefs() (+17 more)

### Community 18 - "package.json"
Cohesion: 0.08
Nodes (24): ajv, dependencies, ajv, yaml, devDependencies, @types/node, typescript, engines (+16 more)

### Community 19 - "identity.ts"
Cohesion: 0.15
Nodes (16): createCheckpoint(), ControllerEvaluationError, evaluateQuickTask(), missing(), response(), activationPackageFingerprint(), canonicalJson(), digest() (+8 more)

### Community 20 - "markdown.ts"
Cohesion: 0.16
Nodes (23): allowedCapabilityKeys, allowedMetadataKeys, canonicalBoardStatuses, canonicalVocabulary(), capabilityStates, extractFrontmatter(), isRecord(), normalizeWhitespace() (+15 more)

### Community 21 - "request.ts"
Cohesion: 0.28
Nodes (22): allowedKeys(), ControllerRequestError, exactKeys(), literal(), nonEmpty(), nonEmptyField(), oneOf(), parseContext() (+14 more)

### Community 22 - "OutboxStore"
Cohesion: 0.21
Nodes (8): assertRecordHistory(), isMissingFileError(), OutboxStore, pathExists(), sameResult(), sameStableEvent(), stableSerialize(), waitForClaimPoll()

### Community 23 - "custom-tool-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 24 - "no-agent-quick-task.json"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 25 - "outbox.ts"
Cohesion: 0.14
Nodes (20): CanonicalEvent, assertExactRecord(), ClaimRecord, claimRecordKeys, DurableClaimResult, EventRecord, eventRecordKeys, isExistingPathError() (+12 more)

### Community 26 - "types.ts"
Cohesion: 0.20
Nodes (19): AdapterDefinition, approvedImplementationStartEvidence, assertImplementationStartContext(), emitLocalEvent(), eventStates(), hasOnlyApprovedImplementationStartEvidence(), HostCapabilityReport, HostEventInput (+11 more)

### Community 27 - "readiness-cli.test.ts"
Cohesion: 0.12
Nodes (9): ReadinessAdapter, readObservations(), runReadinessCertificate(), capabilityPath, manifestPath, readFixture(), readinessManifest, assertRejected() (+1 more)

### Community 28 - "eligible-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 29 - "high-complexity-quick-task.json"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 30 - "ingest.ts"
Cohesion: 0.22
Nodes (14): GithubCapabilityEvidence, GithubReadOnlyCapability, CodexMcpPreflightRequest, createStoppedCertificate(), normalizeCapabilityEvidence(), runCodexMcpPreflight(), stoppedObservation(), classifyReadFailure() (+6 more)

### Community 31 - "formation-recommendation.ts"
Cohesion: 0.17
Nodes (15): FormationRecommendationError, RecognizedScenario, recognizeScenario(), recommendation(), recommendFormation(), scenarioSignals, unknownRequestEvidence(), unresolvedPrerequisites() (+7 more)

### Community 32 - "codex-mcp-adapter.ts"
Cohesion: 0.24
Nodes (13): CodexMcpReadMappingError, CodexMcpReadSource, createCodexMcpReadAdapter(), exactRecord(), mapCodexMcpReadToObservationBundle(), observation(), recordField(), reject() (+5 more)

### Community 33 - "compilerOptions"
Cohesion: 0.12
Nodes (15): dist, .tmp-*, website, compilerOptions, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess (+7 more)

### Community 34 - "host-conformance.test.ts"
Cohesion: 0.17
Nodes (13): claudeCodeAdapter, codexAdapter, cursorAdapter, AdapterSafetyError, adapters, contract, eventInput(), startCheckInput() (+5 more)

### Community 35 - "manifest.ts"
Cohesion: 0.24
Nodes (14): allowedOperations, canonicalJson(), capabilityKeys, githubScopeFingerprint(), loadGithubReadOnlyCapability(), parseGithubReadOnlyCapability(), prohibitedOperations, reject() (+6 more)

### Community 36 - "evaluateReadiness"
Cohesion: 0.17
Nodes (11): evaluateReadiness(), unique(), manifest, read(), readFixture(), readinessCapability, evaluateReadiness(), manifest (+3 more)

### Community 37 - "devDependencies"
Cohesion: 0.13
Nodes (15): @cloudflare/vite-plugin, drizzle-kit, tailwindcss, @types/react, @types/react-dom, vinext, vite, devDependencies (+7 more)

### Community 38 - "compile.ts"
Cohesion: 0.24
Nodes (10): createLocalHostAdapter(), capabilityPolicy(), compileCapability(), compileNativeAdapter(), renderProjection(), CapabilityDeclaration, CapabilityReport, ContractDocument (+2 more)

### Community 39 - "projections.ts"
Cohesion: 0.21
Nodes (13): canonicalAllowedOperations, canonicalProhibitedOperations, extractOperations(), hosts, hostSurfaces, parseGithubCapabilityTemplate(), renderGithubCapabilityTemplate(), requireCapabilityId() (+5 more)

### Community 40 - "team-delivery.ts"
Cohesion: 0.25
Nodes (13): HandoffPacket, HandoffStatus, nonEmptyUniqueStrings(), ParallelizationContract, requiredString(), sameSet(), uniqueStrings(), validateHandoffPacket() (+5 more)

### Community 41 - "validation.ts"
Cohesion: 0.39
Nodes (14): assertSafeSessionContent(), contextReferences(), exactKeys(), executionValue(), literal(), nullableString(), recipeValue(), recordValue() (+6 more)

### Community 42 - "choice.ts"
Cohesion: 0.23
Nodes (12): allowedKeys(), commonKeys, ControllerCheckpointError, digest(), exactKeys(), nonEmpty(), oneOf(), parseCheckpointChoice() (+4 more)

### Community 43 - "readiness-render.test.ts"
Cohesion: 0.20
Nodes (12): CodexMcpPreflightResult, CodexReadOnlyEvidence, ReadinessCertificate, ReadinessObservationBundle, ReadinessCertificateOutputPaths, writeReadinessCertificate(), renderCertificateJson(), renderCertificateMarkdown() (+4 more)

### Community 44 - "storage.ts"
Cohesion: 0.24
Nodes (12): ContextSaveResult, hasCode(), isWithin(), readExisting(), saveDocument(), saveSessionState(), saveWorkContext(), SessionSaveResult (+4 more)

### Community 45 - "recipe.ts"
Cohesion: 0.22
Nodes (11): controllerKeys, ControllerRecipeError, extractFrontmatter(), loadQuickTaskRecipe(), parseQuickTaskRecipe(), recipeKeys, requiredDor, requireExactArray() (+3 more)

### Community 46 - "envelope.ts"
Cohesion: 0.29
Nodes (13): CanonicalEventSource, assertRecord(), createCanonicalEvent(), createIdempotencyKey(), EventInput, eventKeys, inputKeys, isNonEmptyString() (+5 more)

### Community 47 - "incomplete-quick-task.json"
Cohesion: 0.14
Nodes (13): complexity, dependencies, items, state, executionBoundary, goal, state, outcomeOwner (+5 more)

### Community 48 - "links.ts"
Cohesion: 0.36
Nodes (10): assertDocumentationLinks(), collectDocumentationMarkdownPaths(), collectMarkdownPaths(), extractLocalMarkdownLinks(), isMissingPathError(), resolveLocalMarkdownLink(), statIfPresent(), targetExists() (+2 more)

### Community 49 - "errors.ts"
Cohesion: 0.27
Nodes (4): ContractError, ConfigurationError, OrchestratorError, ValidationError

### Community 50 - "check-mapper-freshness.mjs"
Cohesion: 0.40
Nodes (9): assertPublishedPaths(), changedPathsSince(), main(), projectRoot, publishedPaths, readJson(), runGit(), splitLines() (+1 more)

### Community 51 - "validateMilestoneContext"
Cohesion: 0.38
Nodes (9): assertNonEmpty(), assertUnique(), validateContextEnvelope(), validateEpicContext(), validateEpicShape(), validateMilestoneContext(), validateMilestoneShape(), epics (+1 more)

### Community 52 - "events.test.ts"
Cohesion: 0.27
Nodes (7): ExternalOperationState, ReadBackState, reconcileUnknownCompletion(), ReconciliationInput, ReconciliationResult, unknownResult(), eventInput

### Community 53 - "dependencies"
Cohesion: 0.22
Nodes (9): drizzle-orm, next, react, react-dom, dependencies, drizzle-orm, next, react (+1 more)

### Community 54 - "resume.ts"
Cohesion: 0.64
Nodes (8): evaluateSessionResume(), resolveContexts(), stopped(), unknown(), validateEvidence(), validateExecution(), validateExecutionScope(), validateSetup()

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

### Community 61 - "controller-resolve.test.ts"
Cohesion: 0.40
Nodes (3): fixture(), recipe, recommendedResponse()

### Community 63 - "page.tsx"
Cohesion: 0.40
Nodes (3): recipes, roadmap, workflowModes

## Knowledge Gaps
- **388 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+383 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startConnectorFixture()` connect `baseline.test.ts` to `identity.ts`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `response()` connect `identity.ts` to `baseline.test.ts`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `observedAt()` connect `baseline.test.ts` to `readback.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _388 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `codex-mcp-payload.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05272727272727273 - nodes in this community are weakly interconnected._
- **Should `baseline.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05845464725643897 - nodes in this community are weakly interconnected._
- **Should `stop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05347985347985348 - nodes in this community are weakly interconnected._