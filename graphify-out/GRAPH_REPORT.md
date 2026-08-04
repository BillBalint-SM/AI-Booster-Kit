# Graph Report - .  (2026-08-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1617 nodes · 3624 edges · 83 communities (67 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ba60763`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 61
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 80

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

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (75): ConfluenceGateway, ConfluenceGatewayOptions, parseIntent(), sameArray(), validObservedAt(), GitHubGateway, GitHubGatewayOptions, parseCheck() (+67 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (85): AllowlistDecision, AllowlistInput, AllowlistPolicy, assertAllowlistedOperation(), assertNonEmptyString(), assertRecord(), assertUnique(), boardLifecycle (+77 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (62): activationAgentKeys, activationBoundaryInputKeys, activationInputKeys, activationIntentKeys, activationOperationsKeys, activationOutputContractKeys, activationPackageKeys, activationRecipeKeys (+54 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (48): CanonicalEvent, CanonicalEventSource, assertRecord(), createCanonicalEvent(), createIdempotencyKey(), EventInput, eventKeys, inputKeys (+40 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (51): JiraProjectionIntent, AttentionState, BoardStatus, SyncResult, assertNonEmptyString(), assertProjectProfile(), assertStringArray(), assertStringRecord() (+43 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (51): CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone, ProjectProfile, ValidatedRecord, WorkItemType (+43 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (50): CanonicalEvidence, collectGitHubEvidence(), commitUrl(), evidence(), evidenceState(), EvidenceValidationError, exactRecord(), externalId() (+42 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (40): main(), ActivationCliError, activationErrorCode(), CliError, ContextCliError, contextStorageCode(), createLocalObservationAdapter(), dispatchCli() (+32 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (34): acceptanceKeys, controllerKeys, DebuggingRecipeError, extractFrontmatter(), ImplementationRecipeError, loadDebuggingRecipe(), loadImplementationRecipe(), loadRefinementRecipe() (+26 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (21): createCodexMcpPayloadAdapter(), assertCodexMcpToolCaller(), CodexMcpReadFailure, CodexMcpReadFailureDiagnosticCode, CodexMcpReadFailureSource, CodexMcpToolCaller, CodexMcpToolCallerError, createCodexMcpTransportSource() (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (27): bundleKeys, capabilityStates, checkStates, diagnosticCodes, observationKeys, observedIdFields, parseCapabilityEvidence(), parseEvidenceRefs() (+19 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (28): acceptanceKeys, catalogKeys, entryKeys, extractFrontmatter(), FormationCatalogError, identityKeys, loadFormationCatalog(), parseFormationCatalog() (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (23): githubScopeFingerprint(), GithubReadOnlyCapability, CodexMcpPreflightRequest, CodexMcpPreflightResult, createStoppedCertificate(), normalizeCapabilityEvidence(), runCodexMcpPreflight(), stoppedObservation() (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (23): validateCanonicalMilestoneArtifact(), ArtifactWriteAuthority, ContextEnvelope, ContextReadScope, ContextState, EpicContext, MilestoneContext, ResumeRuntime (+15 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (20): ReadinessObservationBundle, manifest, mcpRead(), read(), manifest, read(), readFixture(), readinessCapability (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (26): allowedOperations, canonicalJson(), capabilityKeys, loadGithubReadOnlyCapability(), parseGithubReadOnlyCapability(), prohibitedOperations, reject(), rejectUnsafeValues() (+18 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+20 more)

### Community 17 - "Community 17"
Cohesion: 0.27
Nodes (27): GithubCapabilityEvidence, array(), CodexMcpPayloadNormalizationError, exactKeys(), findInlineCards(), fixtureContent(), isoTimestamp(), jsonArray() (+19 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (22): choices, acknowledgementRequired(), resolveCheckpoint(), ActivationContextKind, CheckpointChoice, CheckpointChoiceInput, ControllerCheckpoint, ControllerDecision (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (26): allowedCapabilityKeys, allowedMetadataKeys, canonicalBoardStatuses, canonicalVocabulary(), CapabilityDeclaration, CapabilityReport, capabilityStates, ContractSemantics (+18 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (24): ajv, dependencies, ajv, yaml, devDependencies, @types/node, typescript, engines (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (22): commonKeys, epicBody(), epicKeys, epicMetadata(), escapeRegExp(), exactKeys(), extractFrontmatter(), literal() (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (15): createCheckpoint(), ControllerEvaluationError, evaluateQuickTask(), missing(), response(), canonicalJson(), digest(), patternId() (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.28
Nodes (22): allowedKeys(), ControllerRequestError, exactKeys(), literal(), nonEmpty(), nonEmptyField(), oneOf(), parseContext() (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (22): allowedObservedIds(), canonicalJson(), createCheck(), decide(), evaluateObservation(), evaluateSource(), expectedIds(), fieldsFor() (+14 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (19): artifact, children, concurrentEventForReplay(), contract, crossTenantEvent(), epics, event(), executionSet (+11 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (17): claudeCodeAdapter, codexAdapter, cursorAdapter, createLocalHostAdapter(), capabilityPolicy(), compileCapability(), compileNativeAdapter(), renderProjection() (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (20): AdapterDefinition, AdapterSafetyError, approvedImplementationStartEvidence, assertImplementationStartContext(), emitLocalEvent(), eventStates(), hasOnlyApprovedImplementationStartEvidence(), HostCapabilityReport (+12 more)

### Community 28 - "Community 28"
Cohesion: 0.19
Nodes (21): capabilityStates, checkStates, decisions, diagnosticCodes, permittedActions, readPaths, rejectUnsafeCertificate(), renderCertificateJson() (+13 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 31 - "Community 31"
Cohesion: 0.28
Nodes (20): assertNonEmpty(), assertUnique(), contextReferences(), exactKeys(), executionValue(), literal(), nullableString(), recipeValue() (+12 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (17): FormationRecommendationError, RecognizedScenario, recognizeScenario(), recommendation(), recommendFormation(), scenarioSignals, unknownRequestEvidence(), unresolvedPrerequisites() (+9 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (16): activationInput(), commonInstructions, createQuickTaskActivationPackage(), parseActivationProfile(), profileDefinitions, stopConditions, ActivationIntent, ActivationProfile (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (16): hasSecondTargetRecord(), loadG2asReadinessManifest(), parseG2asReadinessManifest(), parseManifestJson(), reject(), rejectTokenField(), requireExactKeys(), requireRecord() (+8 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (15): dist, .tmp-*, website, compilerOptions, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess (+7 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (11): capabilityEvidence, manifest, assertRequest(), capabilityEvidence, confluencePageEnvelope(), confluencePageMetadata(), createCaller(), manifest (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (15): @cloudflare/vite-plugin, drizzle-kit, tailwindcss, @types/react, @types/react-dom, vinext, vite, devDependencies (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (13): ContextSaveResult, hasCode(), isWithin(), readExisting(), saveDocument(), saveSessionState(), saveWorkContext(), SessionSaveResult (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (13): HandoffPacket, HandoffStatus, nonEmptyUniqueStrings(), ParallelizationContract, requiredString(), sameSet(), uniqueStrings(), validateHandoffPacket() (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.23
Nodes (12): allowedKeys(), commonKeys, ControllerCheckpointError, digest(), exactKeys(), nonEmpty(), oneOf(), parseCheckpointChoice() (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (14): AcceptedScopeEvidence, check(), FinalizationEvidence, hasAcceptedScope(), hasChildTrace(), hasVerifiedEvidence(), HierarchyTrace, isIdentifier() (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (11): controllerKeys, ControllerRecipeError, extractFrontmatter(), loadQuickTaskRecipe(), parseQuickTaskRecipe(), recipeKeys, requiredDor, requireExactArray() (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (13): complexity, dependencies, items, state, executionBoundary, goal, state, outcomeOwner (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (10): CodexMcpReadMappingError, CodexMcpReadSource, createCodexMcpReadAdapter(), exactRecord(), mapCodexMcpReadToObservationBundle(), observation(), recordField(), reject() (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.36
Nodes (10): assertDocumentationLinks(), collectDocumentationMarkdownPaths(), collectMarkdownPaths(), extractLocalMarkdownLinks(), isMissingPathError(), resolveLocalMarkdownLink(), statIfPresent(), targetExists() (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (4): ContractError, ConfigurationError, OrchestratorError, ValidationError

### Community 49 - "Community 49"
Cohesion: 0.40
Nodes (9): assertPublishedPaths(), changedPathsSince(), main(), projectRoot, publishedPaths, readJson(), runGit(), splitLines() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (9): drizzle-orm, next, react, react-dom, dependencies, drizzle-orm, next, react (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.56
Nodes (8): evaluateSessionResume(), resolveContexts(), stopped(), unknown(), validateExecution(), validateExecutionScope(), validateSetup(), ResumeResult

### Community 52 - "Community 52"
Cohesion: 0.39
Nodes (8): chatGPTSignInPath(), chatGPTSignOutPath(), ChatGPTUser, getChatGPTUser(), isReservedAuthPath(), requireChatGPTUser(), safeDecodeURIComponent(), safeRelativeReturnPath()

### Community 53 - "Community 53"
Cohesion: 0.39
Nodes (5): getDb(), GET(), POST(), toRouteErrorMessage(), notes

### Community 54 - "Community 54"
Cohesion: 0.43
Nodes (4): invalidContextArgs(), prepareArgs(), preparePackage(), runBuiltCli()

### Community 56 - "Community 56"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (7): scripts, build, db:generate, dev, lint, start, test

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (4): Env, ExecutionContext, input(), worker

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (3): HostAdapter, ContractDocument, NativeAdapterProjection

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (3): recipes, roadmap, workflowModes

## Knowledge Gaps
- **381 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+376 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startConnectorFixture()` connect `Community 0` to `Community 22`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `response()` connect `Community 22` to `Community 0`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `observedAt()` connect `Community 0` to `Community 6`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _381 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05845464725643897 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.054431960049937576 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06873706004140787 - nodes in this community are weakly interconnected._