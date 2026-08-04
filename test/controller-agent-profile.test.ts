import assert from "node:assert/strict";
import { test } from "node:test";

import { loadAgentProfileCatalog, parseAgentProfileCatalog } from "../src/controller/agent-profile.js";

const validProfile = `
  - profileId: test-profile
    version: 0.1.0
    displayName: Test Profile
    status: READY_WITH_LIMIT
    usageTopics: [implementation]
    workflowRoles: [implementer]
    purpose: Validate a bounded profile contract.
    capabilities: [contract validation]
    inputs: [accepted scope]
    outputs: [profile recommendation]
    stopConditions: [missing scope]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
`;

function catalogSource(profile: string): string {
  return `---
catalogId: agent-profile-library
catalogVersion: 1.0.0
status: READY_WITH_LIMIT
profiles:${profile}---
`;
}

test("Agent profile catalog: parses a complete profile with stable identity", () => {
  const catalog = parseAgentProfileCatalog(catalogSource(validProfile), "fixtures/catalog.md");

  assert.equal(catalog.catalogId, "agent-profile-library");
  assert.equal(catalog.profiles[0]?.profileId, "test-profile");
  assert.equal(catalog.profiles[0]?.userSelectable, true);
});

test("Agent profile catalog: loads the complete user-facing library without Senior Developer", async () => {
  const catalog = await loadAgentProfileCatalog("contract/agent-library/agent-profile-catalog.md");
  const profileIds = catalog.profiles.map((profile) => profile.profileId);

  assert.equal(catalog.status, "READY_WITH_LIMIT");
  assert.equal(catalog.profiles.length, 24);
  assert.equal(profileIds.includes("senior-developer"), false);
  assert.equal(profileIds.includes("senior-full-stack-engineer"), true);
  assert.equal(profileIds.includes("senior-frontend-engineer"), true);
  assert.equal(profileIds.includes("senior-backend-engineer"), true);
  assert.equal(profileIds.includes("ai-engineer"), true);
  assert.equal(catalog.profiles.every((profile) => profile.userSelectable), true);
  assert.equal(catalog.profiles.every((profile) => profile.usageTopics.length > 0), true);
  assert.equal(catalog.profiles.every((profile) => profile.workflowRoles.length > 0), true);
  assert.deepEqual(
    catalog.profiles.filter((profile) => profile.usageTopics.includes("planning")).map((profile) => profile.profileId),
    [
      "multi-agent-systems-architect",
      "workflow-architect",
      "software-architect",
      "product-manager",
      "senior-project-manager",
      "sprint-prioritizer",
      "technical-writer",
    ],
  );
  assert.equal(catalog.profiles.every((profile) => profile.executionBoundary === "LOCAL_ONLY"), true);
  assert.equal(catalog.profiles.every((profile) => profile.authority === "RECOMMENDATION_ONLY"), true);
});

test("Agent profile catalog: rejects unknown root and profile fields", () => {
  const rootSource = catalogSource(validProfile).replace("status: READY_WITH_LIMIT", "status: READY_WITH_LIMIT\nunsafe: true");
  const profileSource = catalogSource(validProfile).replace("    authority: RECOMMENDATION_ONLY", "    authority: RECOMMENDATION_ONLY\n    unsafe: true");

  assert.throws(() => parseAgentProfileCatalog(rootSource, "fixtures/catalog.md"), /agent profile catalog rejected: frontmatter\.unsafe is not allowed\./);
  assert.throws(() => parseAgentProfileCatalog(profileSource, "fixtures/catalog.md"), /agent profile catalog rejected: profiles\[0\]\.unsafe is not allowed\./);
});

test("Agent profile catalog: rejects duplicate profile IDs", () => {
  const source = catalogSource(`${validProfile}${validProfile.replace("Test Profile", "Second Profile")}`);

  assert.throws(() => parseAgentProfileCatalog(source, "fixtures/catalog.md"), /agent profile catalog rejected: profiles\[1\]\.profileId duplicates test-profile\./);
});

test("Agent profile catalog: rejects an unsafe execution boundary or authority", () => {
  const boundarySource = catalogSource(validProfile.replace("executionBoundary: LOCAL_ONLY", "executionBoundary: EXTERNAL_WRITE"));
  const authoritySource = catalogSource(validProfile.replace("authority: RECOMMENDATION_ONLY", "authority: ACTIVATION"));

  assert.throws(() => parseAgentProfileCatalog(boundarySource, "fixtures/catalog.md"), /agent profile catalog rejected: profiles\[0\]\.executionBoundary must be LOCAL_ONLY\./);
  assert.throws(() => parseAgentProfileCatalog(authoritySource, "fixtures/catalog.md"), /agent profile catalog rejected: profiles\[0\]\.authority must be RECOMMENDATION_ONLY\./);
});

test("Agent profile catalog: rejects an unsupported usage topic or workflow role", () => {
  const topicSource = catalogSource(validProfile.replace("usageTopics: [implementation]", "usageTopics: [unsupported-topic]"));
  const roleSource = catalogSource(validProfile.replace("workflowRoles: [implementer]", "workflowRoles: [unsupported-role]"));

  assert.throws(() => parseAgentProfileCatalog(topicSource, "fixtures/catalog.md"), /agent profile catalog rejected: profiles\[0\]\.usageTopics must contain only a supported usage topic values\./);
  assert.throws(() => parseAgentProfileCatalog(roleSource, "fixtures/catalog.md"), /agent profile catalog rejected: profiles\[0\]\.workflowRoles must contain only a supported workflow role values\./);
});

test("Agent profile catalog: rejects a non-selectable profile", () => {
  const source = catalogSource(validProfile.replace("userSelectable: true", "userSelectable: false"));

  assert.throws(() => parseAgentProfileCatalog(source, "fixtures/catalog.md"), /agent profile catalog rejected: profiles\[0\]\.userSelectable must be true\./);
});
