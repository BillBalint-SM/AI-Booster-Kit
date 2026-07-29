# Documentation and GitHub Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Establish a small current-state routing document, preserve approved Gate 2 and host-run evidence under docs/history, and add minimal repository CI and pull-request review metadata.

**Architecture:** Active documentation contains contracts, runbooks, specifications, plans, a documentation map, and one routing-only current-state document. Historical proof is physically retained under docs/history and has repaired relative links, but is never a default context source. A local Markdown-link check proves the archive move; GitHub CI calls the existing local quality commands.

**Tech Stack:** Node.js 22, TypeScript 5.9, node:test, native Node filesystem/path APIs, GitHub Actions, Markdown, YAML.

## Global constraints

- Do not delete, sanitize, rewrite, or reinterpret historical evidence. Move only the listed files and repair relative Markdown links.
- Preserve active operations documents, host adapters, runbooks, specs, plans, and .superpowers/sdd/.
- docs/project/current-state.md is routing-only, not default agent context. It contains only branch/PR, completed deliverable, validation, known limit, open stop, and next bounded action.
- AGENTS.md is globally ignored. Keep it review-state until an explicitly approved commit; then stage it only with git add -f AGENTS.md.
- CI runs only for pull requests and pushes to main, has contents: read, uses Node 22, and runs npm ci, npm run lint, npm run check:docs, and npm test.
- No connector setup, OAuth, external Jira/Confluence/GitHub operation, branch protection, GitHub Project automation, merge, or publication is in scope.

---

## File structure

- src/docs/links.ts — pure local Markdown-link collection and resolution.
- scripts/check-doc-links.mjs — read-only repository-root link-check CLI.
- test/docs-links.test.ts — positive and negative link-check behavior tests.
- README.md — short human/GitHub entry point, not a second roadmap.
- docs/project/current-state.md — sole current-delivery routing source.
- docs/project/documentation-map.md — active/historical documentation map.
- docs/history/README.md — archive boundary.
- docs/history/gate-2/* and docs/history/host-conformance/* — moved approved evidence.
- docs/history/gate-1/.gitkeep and docs/history/execution-records/.gitkeep — retained approved empty categories.
- .github/workflows/ci.yml and .github/pull_request_template.md — minimal quality and review metadata.
- AGENTS.md — reviewed, ignored operating contract.

### Task 1: Add a testable local Markdown-link verifier

**Files:**

- Create: src/docs/links.ts
- Create: scripts/check-doc-links.mjs
- Create: test/docs-links.test.ts
- Modify: package.json

**Interfaces:**

- extractLocalMarkdownLinks(source: string): readonly string[]
- resolveLocalMarkdownLink(originPath: string, href: string, repositoryRoot: string): string | null
- assertDocumentationLinks(repositoryRoot: string): Promise<void>
- npm run check:docs

- [ ] **Step 1: Write the failing local-link tests.**

~~~ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { extractLocalMarkdownLinks, resolveLocalMarkdownLink } from "../src/docs/links.js";

test("documentation links: resolves local Markdown but skips anchors and URLs", () => {
  assert.deepEqual(
    extractLocalMarkdownLinks("[local](guide.md) [anchor](#rule) [web](https://example.test)"),
    ["guide.md"],
  );
  assert.equal(
    resolveLocalMarkdownLink("docs/project/map.md", "../runbooks/example.md#run", "C:/repo"),
    "C:/repo/docs/runbooks/example.md",
  );
  assert.equal(resolveLocalMarkdownLink("docs/project/map.md", "../../outside.md", "C:/repo"), null);
});
~~~

Add a fixture-root test that puts `[missing](absent.md)` in docs/index.md and asserts assertDocumentationLinks(root) rejects with docs/index.md -> absent.md.

- [ ] **Step 2: Run the focused test before implementation.**

Run: npm run build; node --test dist/test/docs-links.test.js

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement local-only resolution and the CLI.**

Use only node:fs/promises and node:path. Collect normal inline Markdown links, strip fragments, and retain only relative .md targets. Ignore empty values, anchors, mail links, protocol URLs, protocol-relative URLs, and non-Markdown assets. Resolve targets relative to the source file; reject a target outside the repository root and report all failures sorted. The CLI imports dist/src/docs/links.js, reads process.cwd(), writes diagnostics only, and does not edit a file.

~~~ts
export function extractLocalMarkdownLinks(source: string): readonly string[] {
  return [...source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1]?.trim() ?? "")
    .map((href) => href.split("#", 1)[0] ?? "")
    .filter((href) => href.endsWith(".md") && !/^(?:[a-z]+:|\/\/)/i.test(href));
}
~~~

Add this package script:

~~~json
"check:docs": "npm run build && node scripts/check-doc-links.mjs"
~~~

- [ ] **Step 4: Run the Task 1 gate.**

Run: npm run lint; node --test dist/test/docs-links.test.js; npm run check:docs

Expected: existing links pass; missing and escaping targets fail with exact paths; no files are changed by the check.

### Task 2: Create active documentation entry points and retain the reviewed operating contract

**Files:**

- Create: README.md
- Create: docs/project/current-state.md
- Create: docs/project/documentation-map.md
- Create: docs/history/README.md
- Create: docs/history/gate-1/.gitkeep
- Create: docs/history/execution-records/.gitkeep
- Modify: AGENTS.md
- Modify: test/docs-links.test.ts

**Interfaces:**

- README links to the documentation map and labels current state as routing-only.
- Current state has exactly the six required headings.
- Documentation map routes users to active contracts/runbooks/specs/plans and the archive.

- [ ] **Step 1: Add failing entry-point assertions.**

~~~ts
const readme = await readFile("README.md", "utf8");
const state = await readFile("docs/project/current-state.md", "utf8");
const map = await readFile("docs/project/documentation-map.md", "utf8");
assert.match(readme, /docs\/project\/documentation-map\.md/);
assert.match(readme, /routing-only/i);
for (const heading of ["Branch and pull request", "Completed deliverable", "Validation", "Known limit", "Open stop", "Next bounded action"]) {
  assert.match(state, new RegExp("^## " + heading + "$", "m"));
}
assert.match(map, /Historical evidence is not default agent context/i);
~~~

- [ ] **Step 2: Run the focused test before implementation.**

Run: npm run build; node --test dist/test/docs-links.test.js

Expected: FAIL because the entry-point files do not exist.

- [ ] **Step 3: Write the compact routing documents.**

README.md describes this repository as an agent-agnostic, contract-first synchronization orchestrator and links to the documentation map. It does not duplicate a roadmap, host matrix, or target data.

docs/project/current-state.md uses exactly the required headings and these verified facts:

~~~markdown
## Branch and pull request
codex/g2as-sandbox-readiness-certificate; draft PR #4.

## Completed deliverable
The local G2AS Sandbox Readiness Certificate is implemented and published for review.

## Validation
npm run lint, npm run build, and npm test passed locally (128 tests).

## Known limit
The live G2AS chain is not READY: GitHub proof was not collected through approved MCP transport, and Confluence has text rather than a verified native GitHub Smart Link.

## Open stop
No external write is authorized; the native MCP capability standard is planned but not implemented.

## Next bounded action
Review and approve this structure implementation plan, then implement it without external writes.
~~~

documentation-map.md links to AGENTS.md, contract/team-contract.md, active docs/operations/, docs/runbooks/, docs/superpowers/specs/, docs/superpowers/plans/, the archive, and current state. State that current state is read only for routing/status/handoff or target decisions. docs/history/README.md says archive evidence is immutable historical context, not a default instruction/current-state source.

- [ ] **Step 4: Keep AGENTS.md in review state.**

Confirm it contains the accepted scope levels, proof-first protocol, one-recovery/two-wait limits, bounded live-read grant, current-state rule, archive policy, publication/merge approvals, and PR/CI evidence requirements. Run Get-Content -Raw AGENTS.md and git check-ignore -v AGENTS.md; do not stage it.

- [ ] **Step 5: Run the Task 2 gate.**

Run: npm run check:docs; node --test dist/test/docs-links.test.js; git check-ignore -v AGENTS.md

Expected: entry points have the required boundary, links resolve, and AGENTS remains ignored review state.

### Task 3: Move approved historical evidence and repair references

**Archived destinations:**

- `docs/history/gate-2/current-state-and-roadmap.md`
- `docs/history/gate-2/gate-2-results-and-next-steps.md`
- `docs/history/gate-2/g2ai-pilot-evidence.md`
- `docs/history/host-conformance/`
- Modify: all Markdown sources identified by the reference scan.
- Preserve: docs/gate-2/atlassian-oauth-read-only-preflight.md, active operations documents, host adapters, runbooks, specs, plans, and .superpowers/sdd/.

- [ ] **Step 1: Capture the reference checklist before moving.**

Record every reference from active documents, historical documents, and historical plans. Each must have a valid archived or active destination after the move.

- [ ] **Step 2: Perform only the approved Git moves.**

Use `git mv` for the approved archival scope. If a destination exists, stop and report the conflict. Do not recursively delete an empty source directory.

- [ ] **Step 3: Repair inbound and outbound Markdown links.**

Update active documents to point to docs/history. Recalculate every relative link inside moved documents. Preserve facts and conclusions; change only link paths and a misleading current-state label when its archive location would otherwise make it false. Examples:

~~~markdown
[G2AS pilot evidence](../history/gate-2/g2ai-pilot-evidence.md)
[Three-host conformance pilot](../../operations/host-conformance-pilot.md)
~~~

Extend the archive README with direct links to Gate 2 and host conformance evidence.

- [ ] **Step 4: Run the stale-path scan and link gate.**

~~~powershell
npm run check:docs
git diff --check
~~~

Expected: no stale root paths remain; every local Markdown target exists; no whitespace issue exists.

### Task 4: Add minimal CI and an evidence-oriented PR template

**Files:**

- Create: .github/workflows/ci.yml
- Create: .github/pull_request_template.md
- Modify: test/docs-links.test.ts

- [ ] **Step 1: Add failing GitHub-metadata assertions.**

~~~ts
const workflow = await readFile(".github/workflows/ci.yml", "utf8");
const template = await readFile(".github/pull_request_template.md", "utf8");
assert.match(workflow, /pull_request:/);
assert.match(workflow, /branches:\s*\[main\]/);
assert.match(workflow, /contents: read/);
assert.match(workflow, /node-version: 22/);
assert.match(workflow, /npm ci/);
assert.match(workflow, /npm run lint/);
assert.match(workflow, /npm run check:docs/);
assert.match(workflow, /npm test/);
~~~

Assert exact level-two headings for Scope and outcome, Verification evidence, Current-state impact, Limits, stops, and unknowns, and External, OAuth, or permission impact.

- [ ] **Step 2: Run the focused test before implementation.**

Run: npm run build; node --test dist/test/docs-links.test.js

Expected: FAIL because GitHub metadata does not exist.

- [ ] **Step 3: Create the CI workflow.**

Use the current GitHub-documented first-party action versions and this exact boundary:

~~~yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run check:docs
      - run: npm test
~~~

Do not add write permissions, secrets, deployment, publishing, artifacts, or external-service steps.

- [ ] **Step 4: Create the PR template.**

~~~markdown
## Scope and outcome

## Verification evidence

## Current-state impact

## Limits, stops, and unknowns

## External, OAuth, or permission impact

State None when no external write, OAuth, credential, or permission impact occurred.
~~~

- [ ] **Step 5: Run the Task 4 gate.**

Run: npm run lint; npm run check:docs; npm test; git diff --check

Expected: local quality passes; workflow stays read-only/minimal; PR template covers all accepted review fields.

### Task 5: Review-state handoff

**Files:** Review all Task 1–4 files and ignored AGENTS.md; make only corrections required by failed checks.

- [ ] **Step 1: Run the complete verification.**

~~~powershell
npm run lint
npm run check:docs
npm test
git diff --check
git status --short
git check-ignore -v AGENTS.md
~~~

Expected: local checks pass; no Markdown target is broken; no external operation occurred; AGENTS remains ignored.

- [ ] **Step 2: Inspect final scope.**

Confirm only named evidence moved; no history was materially rewritten; current state has six headings and no target payload; README is not a roadmap; CI has contents: read; PR template has five headings; the native MCP-standard design/plan remain unimplemented; and .superpowers/sdd/ was untouched.

- [ ] **Step 3: Present review state.**

Report changed/moved paths, verification evidence, AGENTS ignore status, and the remaining limit that local success is not GitHub CI evidence until a later user-approved commit and push. Do not stage, force-add, commit, push, create a PR, or merge.

## Plan coverage review

| Accepted requirement | Task |
| --- | --- |
| Single routing-only current state | 2 |
| Current state not default agent context | 2 and 5 |
| Physical Gate 2 and host-run archive | 3 |
| Repaired, checked Markdown links | 1 and 3 |
| Human/GitHub README entry point | 2 |
| Read-only CI on PR and main | 4 |
| Evidence-oriented PR template | 4 |
| Reviewed AGENTS contract | 2 and 5 |
| No external/GitHub policy expansion | Global constraints and 5 |

No connector setup, OAuth, external read/write, GitHub policy change, merge, or publication is authorized by this plan.
