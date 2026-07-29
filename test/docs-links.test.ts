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
  for (const heading of ["Branch and pull request", "Completed deliverable", "Validation", "Known limit", "Open stop", "Next bounded action"]) {
    assert.match(state, new RegExp("^## " + heading + "$", "m"));
  }
  assert.match(map, /Historical evidence is not default agent context/i);
});

test("GitHub metadata: provides the approved read-only review contract", async () => {
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");
  const template = await readFile(".github/pull_request_template.md", "utf8");
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
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run check:docs/);
  assert.match(workflow, /npm test/);
  assert.deepEqual(
    [...workflow.matchAll(/^\s*- uses:\s+([^\s]+)\s*$/gm)].map((match) => match[1]),
    ["actions/checkout@v6", "actions/setup-node@v7"],
  );
  assert.deepEqual(
    [...workflow.matchAll(/^\s*- run:\s+(.+)$/gm)].map((match) => match[1]),
    ["npm ci", "npm run lint", "npm run check:docs", "npm test"],
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
