import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  assertDocumentationLinks,
  extractLocalMarkdownLinks,
  resolveLocalMarkdownLink,
} from "../src/docs/links.js";

test("documentation entry points: provide the approved routing contract", async () => {
  const readme = await readFile("README.md", "utf8");
  const state = await readFile("docs/project/current-state.md", "utf8");
  const map = await readFile("docs/project/documentation-map.md", "utf8");

  assert.match(readme, /docs\/project\/documentation-map\.md/);
  assert.match(readme, /routing-only/i);
  for (const heading of [
    "Live Git and pull-request guard",
    "Delivery evidence",
    "Current routing decision",
    "Limits",
    "Next bounded action",
  ]) {
    assert.match(state, new RegExp("^## " + heading + "$", "m"));
  }
  assert.match(state, /not a live Git or pull-request state record/i);
  assert.match(state, /Module and Flow Composition/);
  assert.match(state, /Flow Assurance/);
  assert.match(state, /Booster Mode and dual-host plugin/);
  assert.match(state, /\| Flow Assurance \| LOCAL — review-ready \|.*Full local verification and independent review passed/i);
  assert.match(
    state,
    /\| Booster Mode and dual-host plugin \| LOCAL — review-ready \|.*full local regression, package checks, both host validators, and two independent reviews passed/i,
  );
  assert.match(state, /present the[\s\S]*Delivery Kit[\s\S]*Module\/Flow kernel[\s\S]*for User acceptance/i);
  assert.doesNotMatch(state, /MAPPER_FRESHNESS|check:mappers|mapper publication/i);
  assert.match(state, /Branch,\s+commit,\s+plugin\s+installation,\s+merge,\s+and\s+release\s+remain\s+separate exact decisions/i);
  assert.match(
    state,
    /\| V1 Completion Review \| READY — V1 completion gate satisfied \| \[V1 Completion Review handoff\]\(\.\.\/planning\/ai-booster-kit\/v1-completion-review\/roadmap-6\/2026-08-11-v1-completion-review-handoff\.md\)/,
  );
  assert.match(
    state,
    /\| Standalone Review\/Test Proof \| COMPLETE — durable PASS result \| \[Plan Proof review handoff\]\(\.\.\/planning\/ai-booster-kit\/standalone-review-test-proof\/roadmap-3\/2026-08-11-plan-proof-review-handoff\.md\)/,
  );
  assert.match(
    state,
    /\| Module and Flow Composition \| LOCAL — review-ready \|.*\[operator handbook\]\(\.\.\/handbook\/README\.md\).*\[interface reference\]\(\.\.\/handbook\/module-flow-reference\.md\)/,
  );
  assert.doesNotMatch(state, /^## Branch and pull request$/m);
  assert.doesNotMatch(state, /No real v1 proof has run yet:/i);
  assert.doesNotMatch(state, /Accepted historical session result/);
  assert.doesNotMatch(state, /prior V1 Completion Review's `NOT READY` verdict is historical/i);
  assert.doesNotMatch(state, /The User must decide whether to accept this local `READY` verdict/i);
  assert.match(map, /Historical evidence is not default agent context/i);
  assert.match(map, /Operator handbook/);
  assert.match(map, /Flow Assurance/);
  assert.match(map, /Booster Mode/);
  assert.match(map, /Plugin installation/);
  assert.match(map, /Skill Registry/);
  assert.match(map, /Architecture/);
  assert.match(map, /CLI reference/);
  assert.match(map, /Persistence and local data/);
  assert.match(map, /Verification and Handoff/);
  assert.match(map, /Separation inventory/);
});

test("GitHub metadata: provides the approved read-only review contract", async () => {
  const workflow = (await readFile(".github/workflows/ci.yml", "utf8")).replaceAll("\r\n", "\n");
  const template = (await readFile(".github/pull_request_template.md", "utf8")).replaceAll("\r\n", "\n");
  const requiredTemplateHeadings = [
    "Scope and outcome",
    "Verification evidence",
    "Current-state impact",
    "Limits, stops, and unknowns",
    "External, OAuth, or permission impact",
  ];

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /^  push:\n    branches: \[main\]$/m);
  assert.match(workflow, /contents: read/);
  for (const matrixEntry of [
    "          - os: ubuntu-latest\n            node: 24\n            lane: AUTHORITATIVE",
    "          - os: windows-latest\n            node: 24\n            lane: AUTHORITATIVE",
    "          - os: ubuntu-latest\n            node: 26\n            lane: CONFORMANCE_ONLY",
    "          - os: windows-latest\n            node: 26\n            lane: CONFORMANCE_ONLY",
  ]) {
    assert.ok(workflow.includes(matrixEntry));
  }
  assert.ok(workflow.includes("node-version: ${{ matrix.node }}"));
  assert.match(workflow, /^          node-version: 24$/m);
  assert.ok(workflow.includes("EXECUTION_EXPECTED_RUNTIME_LANE: ${{ matrix.lane }}"));
  assert.ok(
    workflow.includes(
      "run: node --input-type=module -e \"const { observeExecutionSqliteDriver } = await import('./dist/src/execution/persistence/sqlite-adapter.js'); console.log(JSON.stringify(await observeExecutionSqliteDriver()));\"",
    ),
  );
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run check:docs/);
  assert.match(workflow, /npm test/);
  assert.deepEqual(
    [...workflow.matchAll(/^\s*- uses:\s+([^\s]+)\s*$/gm)].map((match) => match[1]),
    [
      "actions/checkout@v6",
      "actions/setup-node@v7",
      "actions/checkout@v6",
      "actions/setup-node@v7",
    ],
  );
  assert.deepEqual(
    [...workflow.matchAll(/^\s*- run:\s+(.+)$/gm)].map((match) => match[1]),
    [
      "npm ci",
      "npm run lint",
      "npm run build",
      "npm run test:execution-storage",
      "npm test",
      "npm ci",
      "npm run check:docs",
    ],
  );
  assert.doesNotMatch(workflow, /\bwrite(?:-all)?\b/i);
  assert.doesNotMatch(workflow, /^\s*secrets\s*:/im);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./i);
  assert.doesNotMatch(workflow, /\b(?:deployments?|artifacts?|publish(?:ing)?)\b/i);

  assert.deepEqual(
    [...template.matchAll(/^## (.+)$/gm)].map((match) => match[1]),
    requiredTemplateHeadings,
  );
  assert.match(template, /State None when no external write, OAuth, credential, or permission impact occurred\./);
});

test("documentation links: resolves local Markdown but skips anchors and URLs", () => {
  const repositoryRoot = join(tmpdir(), "docs-links-root");

  assert.deepEqual(
    extractLocalMarkdownLinks(
      "[local](guide.md) [anchor](#rule) [web](https://example.test) `[inline](ignored-inline.md)`\n```md\n[fenced](ignored.md)\n```",
    ),
    ["guide.md"],
  );
  assert.equal(
    resolveLocalMarkdownLink("docs/project/map.md", "../runbooks/example.md#run", repositoryRoot),
    join(repositoryRoot, "docs", "runbooks", "example.md").replaceAll("\\", "/"),
  );
  assert.equal(
    resolveLocalMarkdownLink("docs/project/map.md", "../../runbooks/example.md", repositoryRoot),
    join(repositoryRoot, "runbooks", "example.md").replaceAll("\\", "/"),
  );
  assert.equal(resolveLocalMarkdownLink("docs/project/map.md", "../../../outside.md", repositoryRoot), null);
});

test("documentation links: requires a matching fence length before resuming extraction", () => {
  assert.deepEqual(
    extractLocalMarkdownLinks(
      "````md\n[hidden](ignored.md)\n```\n[still-hidden](also-ignored.md)\n````\n[live](guide.md)",
    ),
    ["guide.md"],
  );
});

test("documentation links: reports missing local Markdown targets", async () => {
  const root = await mkdtemp(join(tmpdir(), "docs-links-"));

  try {
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs", "index.md"), "[missing](absent.md)\n", "utf8");

    await assert.rejects(
      assertDocumentationLinks(root),
      /docs\/index\.md -> absent\.md/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("documentation links: ignores scratch Markdown outside delivery scope", async () => {
  const root = await mkdtemp(join(tmpdir(), "docs-links-"));

  try {
    await mkdir(join(root, "docs"));
    await mkdir(join(root, ".superpowers", "sdd"), { recursive: true });
    await writeFile(join(root, "docs", "index.md"), "# Documentation\n", "utf8");
    await writeFile(join(root, ".superpowers", "sdd", "scratch.md"), "[missing](absent.md)\n", "utf8");

    await assert.doesNotReject(assertDocumentationLinks(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
