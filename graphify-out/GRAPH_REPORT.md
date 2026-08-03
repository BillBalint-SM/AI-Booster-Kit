# Graph Report - .  (2026-08-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1594 nodes · 3590 edges · 85 communities (69 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `38c4cd76`
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
- Community 60
- Community 61
- Community 63
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 82

## God Nodes (most connected - your core abstractions)
1. `parseG2asReadinessManifest()` - 29 edges
2. `failure()` - 25 edges
3. `parseReadinessObservationBundle()` - 23 edges
4. `nonEmptyString()` - 21 edges
5. `reject()` - 21 edges
6. `exactRecord()` - 19 edges
7. `OutboxStore` - 19 edges
8. `parseQuickTaskRequest()` - 18 edges
9. `validateSessionState()` - 18 edges
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

## Communities (85 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (86): AllowlistDecision, AllowlistInput, AllowlistPolicy, AllowlistValidationError, assertAllowlistedOperation(), assertNonEmptyString(), assertRecord(), assertUnique() (+78 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (61): activationAgentKeys, activationBoundaryInputKeys, activationInputKeys, activationIntentKeys, activationOperationsKeys, activationOutputContractKeys, activationPackageKeys, activationRecipeKeys (+53 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (51): ConfluenceGateway, ConfluenceGatewayOptions, parseIntent(), sameArray(), validObservedAt(), GitHubGateway, GitHubGatewayOptions, parseCheck() (+43 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (48): CanonicalEvent, CanonicalEventSource, assertRecord(), createCanonicalEvent(), createIdempotencyKey(), EventInput, eventKeys, inputKeys (+40 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (51): CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone, ProjectProfile, ValidatedRecord, WorkItemType (+43 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (50): CanonicalEvidence, collectGitHubEvidence(), commitUrl(), evidence(), evidenceState(), EvidenceValidationError, exactRecord(), externalId() (+42 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (40): main(), ActivationCliError, activationErrorCode(), CliError, ContextCliError, contextStorageCode(), createLocalObservationAdapter(), dispatchCli() (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (34): acceptanceKeys, controllerKeys, DebuggingRecipeError, extractFrontmatter(), ImplementationRecipeError, loadDebuggingRecipe(), loadImplementationRecipe(), loadRefinementRecipe() (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (27): bundleKeys, capabilityStates, checkStates, diagnosticCodes, observationKeys, observedIdFields, parseCapabilityEvidence(), parseEvidenceRefs() (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (29): CodexMcpPreflightResult, ReadinessCertificate, ReadinessCertificateOutputPaths, writeReadinessCertificate(), capabilityStates, checkStates, decisions, diagnosticCodes (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (28): acceptanceKeys, catalogKeys, entryKeys, extractFrontmatter(), FormationCatalogError, identityKeys, loadFormationCatalog(), parseFormationCatalog() (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (26): allowedOperations, canonicalJson(), capabilityKeys, loadGithubReadOnlyCapability(), parseGithubReadOnlyCapability(), prohibitedOperations, reject(), rejectUnsafeValues() (+18 more)

### Community 12 - "Community 12"
Cohesion: 0.26
Nodes (28): GithubCapabilityEvidence, array(), CodexMcpPayloadNormalizationError, createCodexMcpPayloadAdapter(), exactKeys(), findInlineCards(), fixtureContent(), isoTimestamp() (+20 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (27): commonKeys, epicBody(), epicKeys, epicMetadata(), escapeRegExp(), exactKeys(), extractFrontmatter(), literal() (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (19): JiraProjectionIntent, SyncResult, assertSafeEvidenceRefs(), EvidenceValidationError, safeEvidenceRefs(), evaluateAllowlist(), EventValidationError, isCanonicalEvent() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (19): choices, createCheckpoint(), ControllerEvaluationError, evaluateQuickTask(), missing(), response(), activationPackageFingerprint(), canonicalJson() (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (14): assertCodexMcpToolCaller(), CodexMcpReadFailure, CodexMcpReadFailureDiagnosticCode, CodexMcpReadFailureSource, CodexMcpToolCaller, CodexMcpToolCallerError, createCodexMcpTransportSource(), readSource() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (22): assertCodexMcpTransportSource(), CodexMcpTransportError, createCodexMcpReadRequest(), record(), reject(), hasSecondTargetRecord(), loadG2asReadinessManifest(), parseG2asReadinessManifest() (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (18): CodexReadOnlyEvidence, ReadinessObservationBundle, manifest, mcpRead(), read(), manifest, read(), readFixture() (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (24): ajv, dependencies, ajv, yaml, devDependencies, @types/node, typescript, engines (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (18): githubScopeFingerprint(), GithubReadOnlyCapability, CodexMcpPreflightRequest, createStoppedCertificate(), normalizeCapabilityEvidence(), runCodexMcpPreflight(), stoppedObservation(), classifyReadFailure() (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (20): evaluateSessionResume(), resolveContexts(), stopped(), unknown(), validateExecution(), validateSetup(), ContextError, ContextState (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (23): allowedCapabilityKeys, allowedMetadataKeys, canonicalBoardStatuses, canonicalVocabulary(), capabilityStates, extractFrontmatter(), isRecord(), normalizeWhitespace() (+15 more)

### Community 24 - "Community 24"
Cohesion: 0.28
Nodes (22): allowedKeys(), ControllerRequestError, exactKeys(), literal(), nonEmpty(), nonEmptyField(), oneOf(), parseContext() (+14 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (19): acknowledgementRequired(), resolveCheckpoint(), ActivationContextKind, CheckpointChoice, CheckpointChoiceInput, ControllerImpact, ControllerIntent, ControllerRecipeIdentity (+11 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (22): check(), allowedObservedIds(), canonicalJson(), createCheck(), decide(), evaluateObservation(), evaluateSource(), expectedIds() (+14 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (19): artifact, children, concurrentEventForReplay(), contract, crossTenantEvent(), epics, event(), executionSet (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.24
Nodes (20): assertNonEmpty(), assertUnique(), contextReferences(), exactKeys(), executionValue(), literal(), nullableString(), recipeValue() (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (21): complexity, context, reference, state, dependencies, items, state, executionBoundary (+13 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (14): claudeCodeAdapter, codexAdapter, cursorAdapter, AdapterSafetyError, createLocalHostAdapter(), adapters, contract, eventInput() (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.20
Nodes (19): AdapterDefinition, approvedImplementationStartEvidence, assertImplementationStartContext(), emitLocalEvent(), eventStates(), hasOnlyApprovedImplementationStartEvidence(), HostCapabilityReport, HostEventInput (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (17): FormationRecommendationError, RecognizedScenario, recognizeScenario(), recommendation(), recommendFormation(), scenarioSignals, unknownRequestEvidence(), unresolvedPrerequisites() (+9 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (19): complexity, context, reference, state, dependencies, items, state, executionBoundary (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (14): ContextSaveResult, hasCode(), isWithin(), readExisting(), saveDocument(), saveSessionState(), saveWorkContext(), SessionSaveResult (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (16): AttentionState, BoardStatus, ProjectProfile, evaluateTransition(), isAttentionState(), isCanonicalProfile(), isSingleForwardStep(), lifecycle (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.21
Nodes (14): assertNonEmptyString(), assertProjectProfile(), assertStringArray(), assertStringRecord(), assertTargetIdentities(), canonicalStatuses, canonicalTransitionKeys, isRecord() (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (14): resolvedTargetIdentity(), acceptedEvidenceRefs, allowlistInput(), assertSecurityPaths(), classifyFailure(), createOrchestrator(), dryRunGateway, eventFor() (+6 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (15): dist, .tmp-*, website, compilerOptions, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess (+7 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (14): activationInput(), commonInstructions, createQuickTaskActivationPackage(), parseActivationProfile(), profileDefinitions, stopConditions, ActivationIntent, ActivationProfile (+6 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (11): capabilityEvidence, manifest, assertRequest(), capabilityEvidence, confluencePageEnvelope(), confluencePageMetadata(), createCaller(), manifest (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (15): @cloudflare/vite-plugin, eslint-config-next, tailwindcss, @types/react, @types/react-dom, vinext, vite, devDependencies (+7 more)

### Community 44 - "Community 44"
Cohesion: 0.23
Nodes (12): allowedKeys(), commonKeys, ControllerCheckpointError, digest(), exactKeys(), nonEmpty(), oneOf(), parseCheckpointChoice() (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (10): HostAdapter, capabilityPolicy(), compileCapability(), compileNativeAdapter(), renderProjection(), CapabilityDeclaration, CapabilityReport, ContractDocument (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (11): controllerKeys, ControllerRecipeError, extractFrontmatter(), loadQuickTaskRecipe(), parseQuickTaskRecipe(), recipeKeys, requiredDor, requireExactArray() (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.26
Nodes (13): AcceptedScopeEvidence, FinalizationEvidence, hasAcceptedScope(), hasChildTrace(), hasVerifiedEvidence(), HierarchyTrace, isIdentifier(), isNonEmpty() (+5 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (13): complexity, dependencies, items, state, executionBoundary, goal, state, outcomeOwner (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (10): CodexMcpReadMappingError, CodexMcpReadSource, createCodexMcpReadAdapter(), exactRecord(), mapCodexMcpReadToObservationBundle(), observation(), recordField(), reject() (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.36
Nodes (10): assertDocumentationLinks(), collectDocumentationMarkdownPaths(), collectMarkdownPaths(), extractLocalMarkdownLinks(), isMissingPathError(), resolveLocalMarkdownLink(), statIfPresent(), targetExists() (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (11): asRecord(), CapturedRequest, closeServer(), ConnectorFixture, firstHeaderValue(), githubBody(), readBackBody(), readJsonBody() (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.27
Nodes (4): ContractError, ConfigurationError, OrchestratorError, ValidationError

### Community 53 - "Community 53"
Cohesion: 0.40
Nodes (9): assertPublishedPaths(), changedPathsSince(), main(), projectRoot, publishedPaths, readJson(), runGit(), splitLines() (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (9): drizzle-orm, next, react, react-dom, dependencies, drizzle-orm, next, react (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.39
Nodes (8): chatGPTSignInPath(), chatGPTSignOutPath(), ChatGPTUser, getChatGPTUser(), isReservedAuthPath(), requireChatGPTUser(), safeDecodeURIComponent(), safeRelativeReturnPath()

### Community 56 - "Community 56"
Cohesion: 0.39
Nodes (5): getDb(), GET(), POST(), toRouteErrorMessage(), notes

### Community 57 - "Community 57"
Cohesion: 0.43
Nodes (4): invalidContextArgs(), prepareArgs(), preparePackage(), runBuiltCli()

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (7): scripts, build, db:generate, dev, lint, start, test

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (4): Env, ExecutionContext, input(), worker

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (3): recipes, roadmap, workflowModes

## Knowledge Gaps
- **373 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+368 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startConnectorFixture()` connect `Community 51` to `Community 16`, `Community 2`, `Community 39`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `response()` connect `Community 16` to `Community 51`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `observedAt()` connect `Community 2` to `Community 5`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _373 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05255613951266125 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06873706004140787 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09362279511533243 - nodes in this community are weakly interconnected._