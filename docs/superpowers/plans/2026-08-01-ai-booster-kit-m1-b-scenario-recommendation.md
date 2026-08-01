# M1-B Scenario Recognition and Explainable Recommendation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Classify a parsed Quick Task against the M1-A catalog and return a deterministic, explainable recommendation without activating a host or changing the existing Human Checkpoint.

**Architecture:** Add a pure `recommendFormation` function that consumes the already validated `QuickTaskRequest` and `FormationCatalog`. It uses a small, explicit bilingual keyword signal table, fails closed on ambiguous or unsupported matches, returns `RECOMMEND` only for ready entries, and returns `CANDIDATE` for bounded but not-ready entries. The result includes reasons, missing prerequisites, unknown evidence, and a structural recommendation identity that excludes raw goal text.

**Tech Stack:** TypeScript 5.9, Node.js 22, Node built-in test runner, existing SHA-256 canonical identity helper.

## Global Constraints

- Do not change `evaluateQuickTask`, `createCheckpoint`, checkpoint choices, activation intent, or package issuance.
- Do not add external reads/writes, host activation, persistence, connector calls, or automatic recipe selection beyond a returned recommendation value.
- Preserve `NO_AGENT` and `CUSTOM_TOOL` precedence.
- Preserve `UNKNOWN` for ambiguous scenarios, unknown evidence, and missing prerequisites; never guess a scenario from weak or conflicting signals.
- Stable recommendation identity may include structural fields only; it must not include goal, context reference, links, or other raw request text.

---

### Task 1: Define the M1-B recommendation contract

**Files:**
- Modify: `src/controller/types.ts`
- Modify: `src/controller/identity.ts`
- Create: `src/controller/formation-recommendation.ts`

**Interfaces:**

```ts
export type FormationRecommendationDecision = "RECOMMEND" | "CANDIDATE" | "NO_FIT" | "UNKNOWN" | "NO_AGENT";

export interface FormationRecommendation {
  decision: FormationRecommendationDecision;
  scenario: FormationScenario | "UNKNOWN";
  impact: ControllerImpact;
  requiresAcknowledgement: boolean;
  reasons: readonly string[];
  missingPrerequisites: readonly string[];
  unknownEvidence: readonly string[];
  formation?: { formationId: string; version: string; status: FormationEntryStatus; identityKey: string; pattern: string };
  recommendationId: string;
}

export function recommendFormation(request: QuickTaskRequest, catalog: FormationCatalog): FormationRecommendation;
```

### Task 2: Write failing tests for recognition and stop paths

**Files:**
- Create: `test/controller-formation-recommendation.test.ts`

**Coverage:**
- An unmarked complete Quick Task selects the ready Quick Task formation with an explainable reason.
- Development, debugging, research, refinement, and validation keywords select the corresponding catalog entries as `CANDIDATE`, never as ready recommendations.
- Ambiguous multi-scenario goals return `UNKNOWN` with the matched scenario evidence and no formation.
- A missing catalog entry or duplicate scenario match returns `UNKNOWN` instead of guessing.
- High complexity returns `NO_FIT`; missing context and unknown evidence are reported explicitly.
- `NO_AGENT` and `CUSTOM_TOOL` retain precedence and do not select a formation.
- An unsafe runtime-shaped request is rejected fail-closed without echoing the unsafe value.
- Recommendation IDs remain equal when only private goal text changes and differ when scenario/complexity changes.

**Red check:** Run `npm run build` after adding the tests and observe the missing recommendation module/type failures before implementing production code.

### Task 3: Implement the pure recognizer and recommendation identity

**Files:**
- Modify: `src/controller/types.ts`
- Modify: `src/controller/identity.ts`
- Create: `src/controller/formation-recommendation.ts`

**Behavior:** Normalize the goal and evaluate explicit ordered scenario signals for debugging, research, refinement, development, and validation. A single match selects the catalog entry; no match selects `quick_task`; multiple matches produce `UNKNOWN`. Candidate entries return `CANDIDATE` with `UNKNOWN` impact and acknowledgement required; ready entries return `RECOMMEND` with `COMPATIBLE` impact. The function reports catalog prerequisites not proven by the Quick Task request and reports `UNKNOWN` declarations for context, relations, and dependencies without synthesizing values.

### Task 4: Verify, route, and publish

**Files:**
- Modify: `docs/project/current-state.md`
- Modify: `docs/superpowers/plans/2026-08-01-ai-booster-kit-m1-b-scenario-recommendation.md`

**Checks:**
- Run the focused recommendation tests, TypeScript build, full suite, documentation-link check, and `git diff --check`.
- Review the diff for scope creep, raw request data in IDs/messages, unsafe execution paths, and checkpoint/activation changes.
- Update current-state to identify M1-B as the completed bounded recommendation slice and keep the remaining M1 acceptance gaps visible.
- Commit, push, create a ready PR, wait for green CI, merge with a regular merge commit, and return the checkout to clean `main`.

**Acceptance criteria:** Every catalog scenario has deterministic classification behavior; ambiguous, missing, unknown, unsafe, duplicate, and no-Agent paths fail closed; explanations name the decision boundary; stable IDs exclude raw goal text; existing checkpoint and activation tests remain unchanged and green.
